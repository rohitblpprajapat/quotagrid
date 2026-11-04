// Diagnostic: one escrow + one /api/execute call, raw server response printed (no retries).
import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';
import { quotaGridAbi, buildPayload } from '../dist/index.js';
const API = process.env.QUOTAGRID_API_URL.replace(/\/$/, ''); const C = process.env.QUOTAGRID_CONTRACT;
const account = privateKeyToAccount(process.env.QUOTAGRID_PRIVATE_KEY);
const pub = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL) });
const wal = createWalletClient({ account, chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL) });
const payload = buildPayload({ messages: [{ role: 'user', content: 'Say hello in five words.' }] });
const q = await (await fetch(API + '/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ listingId: '1', payload, maxOutputTokens: 128 }) })).json();
console.log('quote', q);
const gas = await pub.estimateContractGas({ account, address: C, abi: quotaGridAbi, functionName: 'openRequest', args: [1n, BigInt(q.tMax), keccak256(toBytes(payload))], value: BigInt(q.costWei) });
const hash = await wal.writeContract({ address: C, abi: quotaGridAbi, functionName: 'openRequest', args: [1n, BigInt(q.tMax), keccak256(toBytes(payload))], value: BigInt(q.costWei), gas: gas * 12n / 10n });
const rc = await pub.waitForTransactionReceipt({ hash });
const reqId = parseEventLogs({ abi: quotaGridAbi, logs: rc.logs, eventName: 'RequestOpened' })[0].args.requestId;
console.log('opened request', reqId, hash);
const res = await fetch(API + '/api/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: reqId.toString(), payload, maxOutputTokens: 128 }) });
console.log('execute status', res.status); console.log(await res.text());
