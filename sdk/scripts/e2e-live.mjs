// Live end-to-end check: agent wallet buys one LLM call on QuotaGrid (Monad testnet) and verifies the settlement split.
// Run from sdk/: node --env-file=.env scripts/e2e-live.mjs
import { QuotaGridClient } from '../dist/index.js';
import { formatEther } from 'viem';

const client = new QuotaGridClient();
const t0 = Date.now();
const r = await client.complete({
  messages: [{ role: 'user', content: 'In one sentence: why do per-call escrows need fast, cheap blocks?' }],
  maxOutputTokens: 128,
  models: ['gemini-2.5-flash'],
  maxPricePerKTokenMON: 0.01,
  maxSpendPerCallMON: 0.5,
});
const ex = 'https://testnet.monadvision.com/tx/';
console.log('answer   :', r.text.trim());
console.log('listing  :', r.listingId.toString(), r.model, '| request', r.requestId.toString());
console.log('tokens   : tMax', r.tMax.toString(), '| tUsed', r.tUsed.toString());
console.log('deposit  :', formatEther(r.depositWei), 'MON');
console.log('payout   :', formatEther(r.sellerPayoutWei), 'MON (seller)');
console.log('fee      :', formatEther(r.feeWei), 'MON (protocol)');
console.log('refund   :', formatEther(r.refundWei), 'MON (back to buyer)');
const sum = r.sellerPayoutWei + r.feeWei + r.refundWei;
console.log('check    : payout+fee+refund == deposit ->', sum === r.depositWei ? 'PASS' : `FAIL (${sum} vs ${r.depositWei})`);
console.log('open tx  :', ex + r.openTx);
console.log('settle tx:', ex + r.settleTx);
console.log('latency  :', r.latencyMs ?? (Date.now() - t0), 'ms end-to-end');
