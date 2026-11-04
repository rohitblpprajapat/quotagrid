// Re-runs the listing-time key check (D-029) on every active on-chain listing, using the ciphertext already on-chain.
// Spends one tiny real call per listing on the seller's key; no MON. Run from sdk/: node --env-file=.env scripts/validate-listings.mjs [apiUrl]
import { createPublicClient, http } from 'viem';
import { monadTestnet } from 'viem/chains';
import { quotaGridAbi } from '../dist/index.js';
const API = (process.argv[2] || process.env.QUOTAGRID_API_URL).replace(/\/$/, '');
const pub = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL) });
const read = (functionName, args = []) => pub.readContract({ address: process.env.QUOTAGRID_CONTRACT, abi: quotaGridAbi, functionName, args });
const n = await read('listingCount');
for (let i = 1n; i <= n; i++) {
  const l = await read('getListing', [i]);
  if (!l.active) { console.log(`#${i} inactive, skipped`); continue; }
  const r = await fetch(`${API}/api/validate-listing`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: l.provider, model: l.model, encryptedKey: l.encryptedKey, quota: '100000' }) });
  const j = await r.json();
  console.log(`#${i} ${l.provider}/${l.model}: ${j.ok ? `USABLE (${j.ms} ms)` : `NOT USABLE — ${j.error}`}`);
  if (!j.ok && process.env.SHOWDETAIL === '1') console.log('   ', String(j.detail).replace(/AIza[\w-]+|sk-[\w-]+/g, '[KEY]').slice(0, 300));
}
