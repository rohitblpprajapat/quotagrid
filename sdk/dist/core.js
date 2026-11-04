import { createPublicClient, createWalletClient, http, parseEther, formatEther, decodeEventLog, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadConfig, DEFAULT_GAS_MARGIN_WEI, } from './config.js';
import { quotaGridAbi } from './abi.js';
import { buildPayload, hashPayload } from './payload.js';
export class QuotaGridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'QuotaGridError';
    }
}
export class NoListingError extends QuotaGridError {
    constructor(message) {
        super(message);
        this.name = 'NoListingError';
    }
}
export class RequestOpenError extends QuotaGridError {
    requestId;
    depositWei;
    openTx;
    constructor(message, requestId, depositWei, openTx) {
        super(message);
        this.name = 'RequestOpenError';
        this.requestId = requestId;
        this.depositWei = depositWei;
        this.openTx = openTx;
    }
}
const MIN_TX_SPACING_MS = 1500;
export class QuotaGridClient {
    config;
    publicClient;
    walletClient;
    account;
    txQueue = Promise.resolve();
    totalSpentMON = 0;
    constructor(configOverrides) {
        this.config = loadConfig(configOverrides);
        this.publicClient = createPublicClient({
            chain: this.config.chain,
            transport: http(this.config.rpcUrl),
        });
        if (this.config.privateKey) {
            this.account = privateKeyToAccount(this.config.privateKey);
            this.walletClient = createWalletClient({
                account: this.account,
                chain: this.config.chain,
                transport: http(this.config.rpcUrl),
            });
        }
    }
    /**
     * Internal queue to serialize on-chain transactions so concurrent calls
     * never collide on nonce.
     */
    lastTxAt = 0;
    enqueueTx(fn) {
        // Space transactions >= 1.5 s apart (> k = 3 blocks of 300-400 ms) so each value-spending tx from an
        // undelegated EOA qualifies for Monad's "emptying transaction" exception to the reserve-balance rule.
        // Source: https://docs.monad.xyz/developer-essentials/reserve-balance.md (D-026)
        const spaced = async () => {
            const wait = this.lastTxAt + MIN_TX_SPACING_MS - Date.now();
            if (wait > 0)
                await new Promise((r) => setTimeout(r, wait));
            try {
                return await fn();
            }
            finally {
                this.lastTxAt = Date.now();
            }
        };
        const next = this.txQueue.then(spaced, spaced);
        this.txQueue = next.then(() => { }, () => { });
        return next;
    }
    getContractAddress() {
        if (!this.config.contractAddress) {
            throw new QuotaGridError('QUOTAGRID_CONTRACT environment variable or contractAddress option is required for contract interactions');
        }
        return this.config.contractAddress;
    }
    /**
     * Reads all listings from the QuotaGrid contract.
     */
    async listListings() {
        const address = this.getContractAddress();
        const count = (await this.publicClient.readContract({
            address,
            abi: quotaGridAbi,
            functionName: 'listingCount',
        }));
        const listings = [];
        const countNum = Number(count);
        for (let id = 1; id <= countNum; id++) {
            try {
                const data = (await this.publicClient.readContract({
                    address,
                    abi: quotaGridAbi,
                    functionName: 'getListing',
                    args: [BigInt(id)],
                }));
                const quotaTotal = BigInt(data.quotaTotal);
                const quotaUsed = BigInt(data.quotaUsed);
                const quotaLocked = BigInt(data.quotaLocked);
                const availableRaw = quotaTotal - quotaUsed - quotaLocked;
                const available = availableRaw > 0n ? availableRaw : 0n;
                listings.push({
                    id: BigInt(id),
                    seller: data.seller,
                    provider: data.provider,
                    model: data.model,
                    pricePerKToken: BigInt(data.pricePerKToken),
                    quotaTotal,
                    quotaUsed,
                    quotaLocked,
                    available,
                    active: Boolean(data.active),
                    encryptedKey: data.encryptedKey,
                });
            }
            catch {
                // Skip failed listing read
            }
        }
        return listings;
    }
    /**
     * Picks the cheapest active listing whose model is in the ordered models list,
     * available >= tMax, and price <= maxPricePerKTokenMON.
     * On price tie, earlier model in the array is preferred.
     */
    pickListing(listings, opts) {
        const { models, maxPricePerKTokenMON, tMax } = opts;
        const requiredTMax = BigInt(tMax);
        const maxPriceWei = maxPricePerKTokenMON !== undefined
            ? parseEther(maxPricePerKTokenMON.toString())
            : undefined;
        if (!models || models.length === 0) {
            throw new NoListingError('At least one model must be specified');
        }
        const modelRank = new Map();
        models.forEach((m, idx) => modelRank.set(m.toLowerCase(), idx));
        const candidates = listings.filter((l) => {
            if (!l.active)
                return false;
            if (l.available < requiredTMax)
                return false;
            const rank = modelRank.get(l.model.toLowerCase());
            if (rank === undefined)
                return false;
            if (maxPriceWei !== undefined && l.pricePerKToken > maxPriceWei)
                return false;
            return true;
        });
        if (candidates.length === 0) {
            const activeMatchingModel = listings.filter((l) => modelRank.has(l.model.toLowerCase()));
            if (activeMatchingModel.length === 0) {
                throw new NoListingError(`No listings found matching models [${models.join(', ')}]. Total listings checked: ${listings.length}.`);
            }
            const withCapacity = activeMatchingModel.filter((l) => l.available >= requiredTMax);
            if (withCapacity.length === 0) {
                throw new NoListingError(`Listings for models [${models.join(', ')}] do not have enough available quota (required: ${requiredTMax}). Max available: ${Math.max(0, ...activeMatchingModel.map((l) => Number(l.available)))}.`);
            }
            throw new NoListingError(`Listings for models [${models.join(', ')}] exceed max price cap of ${maxPricePerKTokenMON} MON/1k tokens.`);
        }
        candidates.sort((a, b) => {
            // 1. Price comparison (cheapest first)
            if (a.pricePerKToken < b.pricePerKToken)
                return -1;
            if (a.pricePerKToken > b.pricePerKToken)
                return 1;
            // 2. Tie-break: earlier model in ordered models list preferred
            const rankA = modelRank.get(a.model.toLowerCase()) ?? 999;
            const rankB = modelRank.get(b.model.toLowerCase()) ?? 999;
            if (rankA !== rankB)
                return rankA - rankB;
            // 3. Tie-break: lower listing id
            if (a.id < b.id)
                return -1;
            if (a.id > b.id)
                return 1;
            return 0;
        });
        return candidates[0];
    }
    /**
     * Request a quote from the QuotaGrid backend API.
     */
    async getQuote(listingId, payload, maxOutputTokens) {
        const url = `${this.config.apiUrl}/api/quote`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                listingId: listingId.toString(),
                payload,
                prompt: payload,
                maxOutputTokens,
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new QuotaGridError(`Quote request failed (${res.status}): ${errText}`);
        }
        const data = await res.json();
        return {
            inputTokens: Number(data.inputTokens),
            inputTokensExact: Boolean(data.inputTokensExact),
            tMax: BigInt(data.tMax),
            costWei: BigInt(data.costWei),
        };
    }
    /**
     * Complete an LLM request via QuotaGrid:
     * 1. Pick listing
     * 2. Quote
     * 3. Safety checks (reserve balance + spend limits)
     * 4. openRequest on Monad
     * 5. POST /api/execute (with retries)
     * 6. Returns result & settlement details
     */
    async complete(opts) {
        if (!this.walletClient || !this.account) {
            throw new QuotaGridError('Agent wallet private key (QUOTAGRID_PRIVATE_KEY) is required to execute QuotaGrid calls');
        }
        const startTime = Date.now();
        const maxOutputTokens = opts.maxOutputTokens || 512;
        const contractAddress = this.getContractAddress();
        // 1. Estimate initial tMax for listing selection
        const totalChars = (opts.system?.length || 0) +
            opts.messages.reduce((acc, m) => acc + m.content.length, 0);
        const estimatedInputTokens = Math.ceil(totalChars / 3) + 16;
        const initialTMax = BigInt(estimatedInputTokens + maxOutputTokens);
        const payload = buildPayload({
            system: opts.system,
            messages: opts.messages,
        });
        const promptHash = hashPayload(payload);
        // Fetch listings and pick candidate
        const listings = await this.listListings();
        let selectedListing = this.pickListing(listings, {
            models: opts.models,
            maxPricePerKTokenMON: opts.maxPricePerKTokenMON,
            tMax: initialTMax,
        });
        // 2. Fetch quote from API
        let quote = await this.getQuote(selectedListing.id, payload, maxOutputTokens);
        // If actual tMax exceeds candidate available quota, re-pick with actual tMax
        if (quote.tMax > selectedListing.available) {
            selectedListing = this.pickListing(listings, {
                models: opts.models,
                maxPricePerKTokenMON: opts.maxPricePerKTokenMON,
                tMax: quote.tMax,
            });
            quote = await this.getQuote(selectedListing.id, payload, maxOutputTokens);
        }
        const tMax = quote.tMax;
        const depositWei = quote.costWei;
        const costMON = Number(formatEther(depositWei));
        // 3. Safety checks (spend limits)
        if (opts.maxSpendPerCallMON !== undefined && costMON > opts.maxSpendPerCallMON) {
            throw new QuotaGridError(`Quoted call cost (${costMON.toFixed(6)} MON) exceeds maxSpendPerCallMON (${opts.maxSpendPerCallMON} MON)`);
        }
        if (opts.maxSpendTotalMON !== undefined &&
            this.totalSpentMON + costMON > opts.maxSpendTotalMON) {
            throw new QuotaGridError(`Call cost (${costMON.toFixed(6)} MON) would push total spend (${(this.totalSpentMON + costMON).toFixed(6)} MON) over maxSpendTotalMON (${opts.maxSpendTotalMON} MON)`);
        }
        // Check wallet balance against deposit + 10 MON reserve + gas margin (D-015)
        const walletBalance = await this.publicClient.getBalance({
            address: this.account.address,
        });
        // Floor defaults to 0: txs are spaced > k blocks apart (enqueueTx) so the emptying exception applies.
        // Set QUOTAGRID_MIN_RESERVE_MON=10 to keep the full Monad reserve untouched (D-015, D-026).
        const reserveFloorWei = process.env.QUOTAGRID_MIN_RESERVE_MON
            ? parseEther(process.env.QUOTAGRID_MIN_RESERVE_MON)
            : 0n;
        const minRequiredBalance = depositWei + reserveFloorWei + DEFAULT_GAS_MARGIN_WEI;
        if (walletBalance < minRequiredBalance) {
            throw new QuotaGridError(`Insufficient wallet balance: ${formatEther(walletBalance)} MON. Required: ${formatEther(depositWei)} MON deposit + ${formatEther(reserveFloorWei)} MON reserve floor + ${formatEther(DEFAULT_GAS_MARGIN_WEI)} MON gas margin (Total: ${formatEther(minRequiredBalance)} MON).`);
        }
        // 4. Open escrow request on-chain (serialized through async queue)
        const { receipt, requestId } = await this.enqueueTx(async () => {
            const estimatedGas = await this.publicClient.estimateContractGas({
                address: contractAddress,
                abi: quotaGridAbi,
                functionName: 'openRequest',
                args: [selectedListing.id, tMax, promptHash],
                value: depositWei,
                account: this.account,
            });
            // Monad charges gas based on the gas LIMIT (D-015 / research)
            const gasLimit = (BigInt(estimatedGas) * 120n) / 100n;
            const txHash = await this.walletClient.writeContract({
                address: contractAddress,
                abi: quotaGridAbi,
                functionName: 'openRequest',
                args: [selectedListing.id, tMax, promptHash],
                value: depositWei,
                account: this.account,
                chain: this.config.chain,
                gas: gasLimit,
            });
            const rc = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
            let reqId = undefined;
            for (const log of rc.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: quotaGridAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === 'RequestOpened') {
                        reqId = BigInt(decoded.args.requestId);
                        break;
                    }
                }
                catch {
                    // Skip non-matching logs
                }
            }
            if (reqId === undefined) {
                throw new QuotaGridError(`RequestOpened event not found in receipt for tx ${txHash}`);
            }
            return { receipt: rc, requestId: reqId };
        });
        // 5. POST /api/execute with retries
        const executeUrl = `${this.config.apiUrl}/api/execute`;
        let executeData = null;
        let lastError = null;
        for (let attempt = 1; attempt <= 4; attempt++) {
            try {
                const res = await fetch(executeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId: requestId.toString(),
                        payload,
                        prompt: payload,
                        maxOutputTokens,
                    }),
                    signal: AbortSignal.timeout(35000),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    let errJson = null;
                    try {
                        errJson = JSON.parse(errText);
                    }
                    catch {
                        /* not JSON */
                    }
                    // The server already cancelled the request on-chain (provider failure): 100% refunded.
                    // Never retry a cancelled request — surface the provider error and the cancel tx.
                    if (errJson?.cancelTx) {
                        throw new QuotaGridError(`Provider call failed and request ${requestId} was cancelled with a full refund (cancel tx ${errJson.cancelTx}): ${errJson.error ?? 'unknown error'}`);
                    }
                    // 409 "not open": the request is already settled/cancelled — retrying cannot help.
                    if (res.status === 409 && /not open/i.test(errText)) {
                        lastError = new Error(`HTTP 409: ${errText}`);
                        break;
                    }
                    // 409 lock held: the same request is executing right now; wait and retry.
                    if (res.status === 409 && attempt < 4) {
                        await new Promise((r) => setTimeout(r, 2000));
                        continue;
                    }
                    lastError = new Error(`HTTP ${res.status}: ${errText}`);
                    // Retry on 5xx server errors
                    if (res.status >= 500 && attempt < 4) {
                        await new Promise((r) => setTimeout(r, 1500));
                        continue;
                    }
                    break;
                }
                executeData = await res.json();
                break;
            }
            catch (err) {
                if (err instanceof QuotaGridError)
                    throw err; // cancelled / terminal: don't retry
                lastError = err;
                if (attempt < 4) {
                    await new Promise((r) => setTimeout(r, 1500));
                }
            }
        }
        if (!executeData || executeData.error) {
            // Check if request is still open on-chain
            try {
                const onChainReq = (await this.publicClient.readContract({
                    address: contractAddress,
                    abi: quotaGridAbi,
                    functionName: 'getRequest',
                    args: [requestId],
                }));
                // Status 1 = Open
                if (Number(onChainReq.status) === 1) {
                    throw new RequestOpenError(`Execution failed (${executeData?.error || lastError?.message || 'unknown error'}), but request ${requestId} remains OPEN on-chain. Call client.reclaim(${requestId}) after 10 minutes to recover your deposit of ${formatEther(depositWei)} MON.`, requestId, depositWei, receipt.transactionHash);
                }
            }
            catch (e) {
                if (e instanceof RequestOpenError)
                    throw e;
            }
            throw new QuotaGridError(`Execution failed for request ${requestId}: ${executeData?.error || lastError?.message || 'unknown error'}`);
        }
        const tUsed = BigInt(executeData.tUsed || '0');
        const sellerPayoutWei = BigInt(executeData.sellerPayout || '0');
        const feeWei = BigInt(executeData.fee || '0');
        const refundWei = BigInt(executeData.refund || (depositWei > sellerPayoutWei + feeWei ? depositWei - (sellerPayoutWei + feeWei) : 0n));
        const actualSpentWei = depositWei - refundWei;
        this.totalSpentMON += Number(formatEther(actualSpentWei));
        const latencyMs = Date.now() - startTime;
        return {
            text: executeData.output || '',
            listingId: selectedListing.id,
            model: selectedListing.model,
            requestId,
            tMax,
            tUsed,
            depositWei,
            sellerPayoutWei,
            feeWei,
            refundWei,
            openTx: receipt.transactionHash,
            settleTx: (executeData.settleTx || '0x'),
            cancelTx: executeData.cancelTx,
            latencyMs,
        };
    }
    /**
     * Reclaims an un-settled request after the 10-minute RECLAIM_DELAY.
     */
    async reclaim(requestId) {
        if (!this.walletClient || !this.account) {
            throw new QuotaGridError('Agent wallet private key is required to call reclaim()');
        }
        const address = this.getContractAddress();
        const reqData = (await this.publicClient.readContract({
            address,
            abi: quotaGridAbi,
            functionName: 'getRequest',
            args: [requestId],
        }));
        if (Number(reqData.status) !== 1) {
            throw new QuotaGridError(`Request ${requestId} is not Open (status: ${reqData.status}). Only Open requests can be reclaimed.`);
        }
        const openedAt = BigInt(reqData.openedAt);
        const reclaimDelay = (await this.publicClient.readContract({
            address,
            abi: quotaGridAbi,
            functionName: 'RECLAIM_DELAY',
        }));
        const block = await this.publicClient.getBlock();
        const now = BigInt(block.timestamp);
        const unlockTime = openedAt + reclaimDelay;
        if (now < unlockTime) {
            const waitSec = Number(unlockTime - now);
            throw new QuotaGridError(`Request ${requestId} cannot be reclaimed yet. 10-minute delay in effect. Please wait ${waitSec} more seconds.`);
        }
        return await this.enqueueTx(async () => {
            const estimatedGas = await this.publicClient.estimateContractGas({
                address,
                abi: quotaGridAbi,
                functionName: 'reclaim',
                args: [requestId],
                account: this.account,
            });
            const gasLimit = (BigInt(estimatedGas) * 120n) / 100n;
            const hash = await this.walletClient.writeContract({
                address,
                abi: quotaGridAbi,
                functionName: 'reclaim',
                args: [requestId],
                account: this.account,
                chain: this.config.chain,
                gas: gasLimit,
            });
            return await this.publicClient.waitForTransactionReceipt({ hash });
        });
    }
    /**
     * Fetches agent wallet balance and reserve status.
     */
    async walletInfo() {
        if (!this.account) {
            throw new QuotaGridError('Agent wallet private key is not configured');
        }
        const balanceWei = await this.publicClient.getBalance({
            address: this.account.address,
        });
        const balanceMON = formatEther(balanceWei);
        // Reserve safe if >= 10.5 MON (10 MON reserve + 0.5 MON spending buffer)
        const reserveSafe = Number(balanceMON) >= 10.5;
        return {
            address: this.account.address,
            balanceWei,
            balanceMON,
            reserveSafe,
        };
    }
}
//# sourceMappingURL=core.js.map