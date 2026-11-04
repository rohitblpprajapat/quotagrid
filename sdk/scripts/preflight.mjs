// Pre-demo check — read-only, spends nothing. Run from sdk/: node --env-file=.env scripts/preflight.mjs
// Checks: RPC + chain id, contract owner/operator, listing quota, wallet balances, live API quote (uses Gemini's free
// countTokens, no escrow), primary key present for the agent "switch" moment.
import { createPublicClient, http, formatEther } from 'viem';
import { monadTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { quotaGridAbi, buildPayload } from '../dist/index.js';

const C = process.env.QUOTAGRID_CONTRACT;
const API = (process.env.QUOTAGRID_API_URL || '').replace(/\/$/, '');
const pub = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL) });
let ok = true;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!cond) ok = false;
};

const chainId = await pub.getChainId();
check(chainId === 10143, 'RPC reachable, Monad testnet', `chain ${chainId}, block ${await pub.getBlockNumber()}`);

const read = (functionName, args = []) => pub.readContract({ address: C, abi: quotaGridAbi, functionName, args });
const operator = await read('operator');
check(true, 'Contract', `${C} owner ${await read('owner')} operator ${operator}`);

const n = await read('listingCount');
let best = null;
const active = [];
for (let i = 1n; i <= n; i++) {
  const l = await read('getListing', [i]);
  const avail = await read('available', [i]);
  console.log(`      listing #${i}: ${l.model} (${l.provider}) ${formatEther(l.pricePerKToken)} MON/1k, available ${avail}/${l.quotaTotal}, active ${l.active}`);
  if (l.active) active.push({ id: i, model: l.model, provider: l.provider });
  if (l.active && (!best || avail > best.avail)) best = { id: i, avail, model: l.model };
}
check(!!best && best.avail >= 5000n, 'Active listing with >= 5000 free tokens', best ? `#${best.id} ${best.model}, ${best.avail} free` : 'none');

const agent = privateKeyToAccount(process.env.QUOTAGRID_PRIVATE_KEY).address;
const agentBal = await pub.getBalance({ address: agent });
check(agentBal >= 10n ** 17n, 'Agent wallet funded (>= 0.1 MON)', `${agent} ${formatEther(agentBal)} MON`);
const opBal = await pub.getBalance({ address: operator });
check(opBal >= 10n ** 17n, 'Operator wallet has gas (>= 0.1 MON)', `${operator} ${formatEther(opBal)} MON`);

check(!!process.env.PRIMARY_GEMINI_API_KEY, 'Primary Gemini key set (agent switch moment)');

for (const L of active) {
  const payload = buildPayload({ messages: [{ role: 'user', content: 'preflight' }] });
  const t = Date.now();
  const res = await fetch(`${API}/api/quote`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ listingId: L.id.toString(), payload, maxOutputTokens: 64 }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  const body = await res.text();
  let exact = false; try { exact = JSON.parse(body).inputTokensExact === true; } catch {}
  // Gemini and Anthropic have free count-token endpoints: an exact count proves the seller key works with that provider.
  const needsExact = L.provider === 'gemini' || L.provider === 'anthropic';
  check(res.ok && (!needsExact || exact), `Listing #${L.id} ${L.model}: live quote`,
    `${res.status} in ${Date.now() - t} ms, ${exact ? 'exact count (key works)' : needsExact ? 'ESTIMATE ONLY — seller key/model likely rejected by provider' : 'estimate (provider has no count endpoint)'}`);
}

console.log(ok ? '\nALL CHECKS PASSED — ready to demo' : '\nSOME CHECKS FAILED — fix before going on stage');
process.exit(ok ? 0 : 1);
