## Goal
Build QuotaGrid's landing page, the live on-chain activity feed (projector "Monad is fast" screen) and the Agents page.

## Context
Read `briefs/ui-shared.md` (use ONLY the shared exports listed there — another worker is writing them right now; import
them by the exact names), `briefs/interface.md`, `decisions.md` (D-001, D-006, D-008…D-014), and `sdk/README.md` +
`sdk/src/cli.ts` if present (for accurate agent commands).

## Do
Create exactly: `web/src/app/page.tsx` (overwrite the scaffold), `web/src/app/activity/page.tsx`,
`web/src/app/agents/page.tsx`, `web/src/components/ActivityFeed.tsx`, `web/src/components/CodeBlock.tsx`.
1. `/` landing: headline "Sell your unused AI quota. Pay only for tokens you use." + one-line subhead (Monad testnet,
   per-call escrow, auto-refund). Live stats from chain via `publicClient` (listingCount, requestCount, protocolFees in MON;
   refresh 3s). "How it works" 3 steps: Seller lists (key encrypted in browser) → Buyer escrows worst-case T_max → Settle:
   seller paid for T_used, fee, unused refunded in the same tx. Two CTAs: "Buy compute" → /market, "Sell quota" → /sell,
   plus "For AI agents" → /agents. A small "Why Monad" block: 300 ms blocks, 2-block finality, sub-cent fees make a
   per-call escrow + settlement practical (state these as Monad's documented figures — see docs/research/monad.md).
2. `ActivityFeed` + `/activity`: poll `publicClient.getContractEvents({address: CONTRACT_ADDRESS, abi: quotaGridAbi,
   fromBlock})` every 1s (start ~5000 blocks back; Monad RPC may cap block ranges — if the call errors, fall back to
   smaller ranges, e.g. 100 blocks, and keep a cursor). Newest first, max 100 rows, each: event type badge
   (ListingCreated / RequestOpened / RequestSettled / RequestCancelled / Withdrawn), key amounts in MON
   (deposit, payout, fee, refund), tokens (tMax / tUsed), block number, relative time, TxLink. New rows animate in.
   Header counters: events seen, settlements, total refunded MON. Big, legible on a projector.
3. `/agents`: explains token-aware agents: agent runs on its own provider → budget below threshold OR 429/quota error →
   automatically buys the call on QuotaGrid from its own Monad wallet (per-call escrow, refund of unused tokens). Sections
   with `CodeBlock` (copy button) for: SDK wrapper `withQuotaGridFallback`, local proxy `npx quotagrid proxy` +
   OpenAI SDK `baseURL: 'http://127.0.0.1:8787/v1'`, Gemini-compatible REST call to
   `http://127.0.0.1:8787/v1beta/models/<model>:generateContent`, MCP config JSON for `quotagrid mcp`,
   `quotagrid demo-agent`. Take exact flags/env var names from sdk/ files; if unsure, keep snippets minimal. Safety:
   price cap, per-call/total spend caps, 10 MON reserve.

## Rules
Only those 5 files. Don't run commands (Windows host). Follow the visual direction in ui-shared.md.

## Done when
Files written. Report imports used from shared modules.
