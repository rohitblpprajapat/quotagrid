## Goal
Build the buyer flow of QuotaGrid: the marketplace and the "pay & run" page. This is the live on-stage demo screen.

## Context
Read `briefs/ui-shared.md` (use ONLY the shared exports listed there — another worker is writing them right now, so
import them by the exact names even if the files don't exist yet), `briefs/interface.md`, `decisions.md` D-006/D-007/D-013.

## Do
Create exactly: `web/src/app/market/page.tsx`, `web/src/app/buy/[id]/page.tsx`, `web/src/components/ListingCard.tsx`,
`web/src/components/SettlementReceipt.tsx`.
1. `/market`: grid of `ListingCard` from `useListings()` (active first, then by price). Card: model (large), provider
   badge, price via `pricePer1kLabel`, available/total quota bar (`available` vs `quotaTotal`), seller `shortAddr`,
   "Use this model" → `/buy/{id}`. Inactive listings dimmed. Empty state.
2. `/buy/[id]` (client component; `useParams`):
   - Listing header (model, provider, price, available quota). `ReserveWarning`.
   - Optional system prompt (collapsible), prompt textarea, max output tokens (default 512, 1..4096).
   - "Get quote": `payload = buildPayload({system, messages:[{role:'user', content: prompt}]})`; `postQuote({listingId,
     payload, maxOutputTokens})`; show input tokens (+ "exact"/"estimated"), T_max, cost in MON (big).
   - "Pay & run" (needs connected wallet on Monad; else show connect/switch): wagmi `useWriteContract` →
     `openRequest(listingId, BigInt(tMax), keccak256(toBytes(payload)))` with `value = BigInt(costWei)`;
     `publicClient.waitForTransactionReceipt`; get requestId via viem `parseEventLogs({abi: quotaGridAbi, logs,
     eventName:'RequestOpened'})`; then `postExecute({requestId, payload, maxOutputTokens})`.
   - Show a live step tracker: 1 Escrow T_max (open tx link) → 2 Model running → 3 Settled (settle tx link), with elapsed
     ms per step and total time click→settled.
   - Show the answer (preserve whitespace) and `SettlementReceipt`: deposit, tokens reserved (T_max) vs used (T_used),
     seller payout, protocol fee, refund (green, prominent: "Refunded X MON — you only paid for what you used"), tx links.
   - Error path: show the server error; if `cancelTx` present, show "Cancelled — 100% refunded" with link.
   - Re-quote resets state. Disable buttons while busy; never double-submit.
3. `SettlementReceipt` props: `{depositWei: bigint, tMax: bigint, tUsed: bigint, sellerPayoutWei: bigint, feeWei: bigint,
   refundWei: bigint, openTx?: string, settleTx?: string}`; includes a horizontal stacked bar deposit = payout | fee | refund.

## Rules
Only those 4 files. Don't run commands (Windows host). Follow the visual direction in ui-shared.md.

## Done when
Files written. Report imports used from shared modules (so the supervisor can check they match).
