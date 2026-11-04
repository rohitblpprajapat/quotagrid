## Goal
Build the QuotaGrid web app UI in `web/` (Next.js App Router + TypeScript + Tailwind + wagmi v2 + viem +
@tanstack/react-query). It talks to the deployed contract directly and to our API routes (written in parallel by another
worker).

## Context
Read `AGENTS.md` and `briefs/interface.md` first (ABI, env vars, shared files, API route shapes are FIXED).
Product: sellers list unused AI API quota (key encrypted in the browser); buyers pay the worst-case cost, get an answer,
and are refunded the unused part in the same settlement tx. The demo is live on a projector + phones, so it must be fast,
readable at a distance, and show every on-chain step with explorer links.

## Do
1. `web/` ALREADY contains another worker's files (`web/src/app/api/**`, `web/src/lib/server/**`, `web/scripts/**`) — keep
   them untouched. Scaffold into a temp dir: `cd /tmp && npx create-next-app@latest qgweb --ts --tailwind --app --src-dir
   --eslint --use-npm --yes`, then copy its contents into `web/` without overwriting existing files (`cp -rn`), delete
   the copied `node_modules` and run `npm install` inside `web/`, then `npm i wagmi viem @tanstack/react-query`.
2. Create the shared files exactly as specified: `web/src/lib/abi.ts`, `web/src/lib/chain.ts`, `web/src/lib/types.ts`,
   `web/src/lib/payload.ts` (D-013 payload helpers),
   and `web/.env.example` (all env vars from interface.md, empty values, comments).
3. Wallet: wagmi config with the `injected()` connector on the `monad` chain; connect button that also offers
   "Add / switch to Monad Testnet". Show address + MON balance.
4. Pages:
   - `/` landing: one-line pitch; how it works in 3 steps (Seller lists -> Buyer escrows T_max -> Settle: seller paid for
     T_used, buyer refunded the rest); live stats from chain (listingCount, requestCount, protocolFees); CTAs.
   - `/market`: all listings via `listingCount` + `getListing`; card: model, provider, price per 1k tokens in MON,
     available/total quota bar, seller short address, "Use this model" -> `/buy/[id]`. Never show `encryptedKey`.
   - `/sell`: form (provider: gemini | anthropic | openai-compatible, model id, price per 1k tokens in MON, quota tokens,
     API key password field). Submit: fetch `/api/operator-key`, RSA-OAEP SHA-256 encrypt the key with WebCrypto, call
     `createListing`. Below: "My listings" (seller == me) with update (price / add quota / active) and "My earnings"
     (`balances(me)`) with a Withdraw button.
   - `/buy/[id]`: listing header; prompt textarea; max output tokens (default 512); "Get quote" -> POST `/api/quote` ->
     show input tokens (exact/estimated), T_max, cost in MON; "Pay & run" -> `openRequest(listingId, tMax,
     keccak256(toBytes(prompt)))` with value = costWei -> wait receipt -> requestId from the RequestOpened log -> POST
     `/api/execute` -> show the answer and a settlement receipt card: deposit, tokens reserved vs used, seller payout,
     protocol fee, refund, explorer links for open tx and settle tx, and measured time from click to settlement. Handle the
     error/cancel response. If one of my requests stays Open > 10 min, show a Reclaim button.
   - `/activity`: live feed of contract events (poll logs about every 1s), newest first: type, amounts in MON, explorer
     link. This is the "Monad is fast" projector screen.
5. Visual direction: dark, high contrast, large type for a projector, monospace for numbers/hashes, one accent colour
   (purple family), no stock illustrations, no fake data. Mobile responsive.
6. Header nav (Market, Sell, Activity, connect button); footer with contract address link.

## Rules
You own everything under `web/` EXCEPT `web/src/app/api/**`, `web/src/lib/server/**` and `web/scripts/**` (another worker
writes those — don't create or edit them). Don't touch files outside `web/`. No mock listings or fake numbers. Never log or
store the plaintext API key anywhere (no localStorage, no console).

## Verify
`cd web && npx tsc --noEmit && npm run build` must succeed. If it fails only because the other worker's API files are
missing or incomplete, say so clearly.

## Done when
Build passes; report pages built, package versions, anything uncertain.

## Verified facts to use (from docs/research/monad.md — read it)
Testnet chain id 10143, RPC https://testnet-rpc.monad.xyz, explorer https://testnet.monadvision.com, viem exports
`monadTestnet`. Monad keeps a 10 MON reserve on EOAs: show a warning on Buy/Sell if wallet balance < 10.5 MON.
Also add an `/agents` page: explains the token-aware agent flow (agent's own provider -> budget low or 429 -> QuotaGrid via
SDK / local OpenAI- or Gemini-compatible proxy / MCP) with copyable code snippets; snippets may reference package
`quotagrid` CLI commands `quotagrid proxy`, `quotagrid mcp`, `quotagrid demo-agent` and SDK `withQuotaGridFallback`.
Add Agents to the header nav.
