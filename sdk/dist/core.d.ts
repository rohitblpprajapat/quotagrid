import { type PublicClient, type WalletClient, type TransactionReceipt, type Account } from 'viem';
import { type QuotaGridConfig } from './config.js';
import { type PromptMessage } from './payload.js';
export declare class QuotaGridError extends Error {
    constructor(message: string);
}
export declare class NoListingError extends QuotaGridError {
    constructor(message: string);
}
export declare class RequestOpenError extends QuotaGridError {
    readonly requestId: bigint;
    readonly depositWei: bigint;
    readonly openTx: `0x${string}`;
    constructor(message: string, requestId: bigint, depositWei: bigint, openTx: `0x${string}`);
}
export interface Listing {
    id: bigint;
    seller: `0x${string}`;
    provider: string;
    model: string;
    pricePerKToken: bigint;
    quotaTotal: bigint;
    quotaUsed: bigint;
    quotaLocked: bigint;
    available: bigint;
    active: boolean;
    encryptedKey: `0x${string}`;
}
export interface PickListingOptions {
    models: string[];
    maxPricePerKTokenMON?: number;
    tMax: bigint | number;
}
export interface CompleteOptions {
    system?: string;
    messages: PromptMessage[];
    maxOutputTokens?: number;
    models: string[];
    maxPricePerKTokenMON?: number;
    maxSpendPerCallMON?: number;
    maxSpendTotalMON?: number;
}
export interface CompleteResult {
    text: string;
    listingId: bigint;
    model: string;
    requestId: bigint;
    tMax: bigint;
    tUsed: bigint;
    depositWei: bigint;
    sellerPayoutWei: bigint;
    feeWei: bigint;
    refundWei: bigint;
    openTx: `0x${string}`;
    settleTx: `0x${string}`;
    cancelTx?: `0x${string}`;
    latencyMs: number;
}
export interface WalletInfo {
    address: `0x${string}`;
    balanceWei: bigint;
    balanceMON: string;
    reserveSafe: boolean;
}
export declare class QuotaGridClient {
    readonly config: QuotaGridConfig;
    readonly publicClient: PublicClient;
    readonly walletClient?: WalletClient;
    readonly account?: Account;
    private txQueue;
    totalSpentMON: number;
    constructor(configOverrides?: Partial<QuotaGridConfig>);
    /**
     * Internal queue to serialize on-chain transactions so concurrent calls
     * never collide on nonce.
     */
    enqueueTx<T>(fn: () => Promise<T>): Promise<T>;
    getContractAddress(): `0x${string}`;
    /**
     * Reads all listings from the QuotaGrid contract.
     */
    listListings(): Promise<Listing[]>;
    /**
     * Picks the cheapest active listing whose model is in the ordered models list,
     * available >= tMax, and price <= maxPricePerKTokenMON.
     * On price tie, earlier model in the array is preferred.
     */
    pickListing(listings: Listing[], opts: PickListingOptions): Listing;
    /**
     * Request a quote from the QuotaGrid backend API.
     */
    getQuote(listingId: bigint, payload: string, maxOutputTokens: number): Promise<{
        inputTokens: number;
        inputTokensExact: boolean;
        tMax: bigint;
        costWei: bigint;
    }>;
    /**
     * Complete an LLM request via QuotaGrid:
     * 1. Pick listing
     * 2. Quote
     * 3. Safety checks (reserve balance + spend limits)
     * 4. openRequest on Monad
     * 5. POST /api/execute (with retries)
     * 6. Returns result & settlement details
     */
    complete(opts: CompleteOptions): Promise<CompleteResult>;
    /**
     * Reclaims an un-settled request after the 10-minute RECLAIM_DELAY.
     */
    reclaim(requestId: bigint): Promise<TransactionReceipt>;
    /**
     * Fetches agent wallet balance and reserve status.
     */
    walletInfo(): Promise<WalletInfo>;
}
//# sourceMappingURL=core.d.ts.map