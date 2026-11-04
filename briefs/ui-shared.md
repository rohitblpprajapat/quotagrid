# UI shared contract (4 parallel workers: ui-core, ui-buy, ui-sell, ui-pages)

Read first: `AGENTS.md`, `briefs/interface.md` (ABI, API routes, payload D-013), `decisions.md`.
Stack (already installed by the supervisor): Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
(`@import "tailwindcss";` in globals.css, theme via `@theme`), wagmi v2, viem v2, @tanstack/react-query v5.
Imports: use the `@/` alias for `web/src/*` (tsconfig already maps it). Client components start with `'use client'`.
Live contract: `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1` on Monad testnet (chain 10143), RPC https://testnet-rpc.monad.xyz,
explorer https://testnet.monadvision.com. Native token MON (18 decimals). EOAs must keep >= 10 MON (reserve rule).

## Exports owned by ui-core (others import these EXACT names; don't redefine them)
- `@/lib/abi` → `quotaGridAbi` (viem `parseAbi([...])` with the exact list from interface.md).
- `@/lib/chain` → `monad` (viem `monadTestnet` from `viem/chains`, rpc/explorer overridable by `NEXT_PUBLIC_RPC_URL`,
  `NEXT_PUBLIC_EXPLORER_URL`), `CONTRACT_ADDRESS: \`0x${string}\`` (from `NEXT_PUBLIC_CONTRACT_ADDRESS`, default the live
  address above), `EXPLORER_URL`, `explorerTx(hash)`, `explorerAddress(addr)`, `publicClient` (viem createPublicClient).
- `@/lib/types` → `Provider = 'gemini'|'anthropic'|'openai-compatible'`; `Listing {id: bigint; seller: \`0x${string}\`;
  provider: string; model: string; pricePerKToken: bigint; quotaTotal: bigint; quotaUsed: bigint; quotaLocked: bigint;
  active: boolean; available: bigint}` (no encryptedKey); `RequestInfo {id: bigint; listingId: bigint; buyer; tMax; deposit;
  promptHash; openedAt: bigint; status: number; tUsed: bigint}`; `STATUS_LABEL: Record<number,string>`;
  `QuoteResponse {inputTokens:number; inputTokensExact:boolean; tMax:string; costWei:string}`;
  `ExecuteResponse {output:string; tUsed:string; settleTx:string; sellerPayout:string; fee:string; refund:string}`;
  `ExecuteError {error:string; cancelTx?:string}`.
- `@/lib/payload` → `buildPayload({system?, messages}) : string` and `parsePayload(s)`. Must be byte-identical to
  `sdk/src/payload.ts` (read it and mirror its logic exactly).
- `@/lib/format` → `formatMON(wei: bigint, maxDecimals = 6): string`, `parseMON(s: string): bigint`,
  `shortAddr(a: string)`, `shortHash(h: string)`, `pricePer1kLabel(weiPer1k: bigint): string` (e.g. "0.0010 MON / 1k tok").
- `@/lib/api` → `getOperatorKey(): Promise<{publicKeyPem:string; operator:string}>`,
  `postQuote(body): Promise<QuoteResponse>`, `postExecute(body): Promise<ExecuteResponse>` (throws Error with the server's
  `error` message; attaches `cancelTx` on the error object if present).
- `@/lib/encrypt` → `encryptForOperator(publicKeyPem: string, plaintext: string): Promise<\`0x${string}\`>` (WebCrypto
  RSA-OAEP SHA-256, SPKI import; returns hex).
- `@/lib/wagmi` → `wagmiConfig` (createConfig, chains [monad], connectors [injected()], transports http(rpc)).
- `@/app/providers` → `Providers` (WagmiProvider + QueryClientProvider).
- `@/hooks/useListings` → `useListings(): {listings: Listing[]; isLoading: boolean; error?: Error; refetch(): void}`
  (reads `listingCount` then `getListing(i)` + `available(i)` for i=1..n via `publicClient`, Promise.all; refetch every 5s);
  `useListing(id: bigint)` → `{listing?: Listing; isLoading; refetch}`.
- `@/components/ui` → `Card`, `Button` (variants primary|secondary|ghost, `loading` prop), `Stat` ({label, value, hint?}),
  `Badge`, `Input`, `Textarea`, `Select`, `Field` ({label, hint?, children}), `Mono` (monospace span).
- `@/components/TxLink` → `TxLink({hash, label?})` explorer link with short hash.
- `@/components/ReserveWarning` → shows a warning if connected wallet balance < 10.5 MON (reserve rule, D-015).
- `@/components/ConnectButton`, `@/components/Header` (nav: Market, Sell, Agents, Activity + ConnectButton incl.
  "Switch to Monad Testnet"), `@/components/Footer` (contract address link, "Verified on Sourcify").

## Visual direction (everyone)
Dark, high contrast, readable on a projector from 10m: base text >= 16px, key numbers 24–48px. Background near-black
(#0b0a10), surfaces #15131d, borders #2a2638, text #f4f2fa / muted #a39fb5, ONE accent purple (#8b5cf6 family), success
green (#22c55e) for refunds, amber for warnings. Monospace for numbers, hashes, addresses. Generous spacing, no stock
illustrations, no emoji spam, no fake data — real empty states ("No listings yet — be the first seller"). Mobile responsive.

## Rules for every worker
- You run on Windows and CANNOT run commands. Only write/edit your own files. Don't touch anything else, especially
  `web/src/app/api/**`, `web/src/lib/server/**`, `web/scripts/**`, package.json.
- Never store/log a plaintext API key. No mock data.
- Type-safe TS; no `any` unless unavoidable.
