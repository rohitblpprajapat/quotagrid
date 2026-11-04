# Decisions log — QuotaGrid (Monad Blitz Mumbai, 2026-11-04)

Each entry: what we decided, why, what we gave up. Newest at the bottom. Facts referenced here are verified in
`docs/research/` with live source URLs.

---

## D-001 — Build the ShunyaGrid *idea* on Monad, not its implementation
- **Decision:** Take the product concept from `kanakagarwal0901/HashKey-Chain-Horizon` (sell unused AI API quota without
  revealing keys; escrow worst-case token cost T_max; pay seller only for T_used; auto-refund the rest; protocol fee).
  Drop everything chain-specific to HashKey: HSP mandates, HSK token, ENS subnames, World ID, cross-chain sweeps, anon-RPC.
- **Why:** User instruction ("idea only, no chain specific implementation"); Blitz rule: fresh builds only, so no code from
  that repo is reused. The idea fits Monad because every AI call becomes its own on-chain escrow + settlement, which only
  makes sense with cheap, fast blocks.
- **Gave up:** the original's multi-chain and identity features.

## D-002 — Project name "QuotaGrid", fork named `quotagrid`
- **Decision:** Forked `monad-developers/monad-blitz-devcon-mumbai` to `github.com/rohitblpprajapat/quotagrid` and cloned it
  into this working directory.
- **Why:** The rubric gives 10 pts for forking the official starter repo and renaming it to the project name. A new name
  (not "ShunyaGrid") makes clear this is a new build.

## D-003 — Facts are verified live, never from memory
- **Decision:** Every chain/API/event fact is fetched from its live source during this session and written with its URL
  into `docs/research/*.md`. The earlier handover zip is treated as a lead, not as truth.
- **Why:** User instruction: "don't fake anything… everything fact checked with live websites."

## D-004 — Parallel agy workers with disjoint file ownership
- **Decision:** Work is split into parallel agy runs (research ×3, contract, web UI, API routes). Each owns a disjoint
  set of files; the contract ABI is fixed up front (see D-006) so UI, API and contract can be built at the same time.
- **Why:** ~4h45m until code freeze (17:30 IST) at start of build (12:45 IST); user asked for multiple agents.

## D-005 — Seller's API key is stored on-chain, encrypted to the operator's RSA public key
- **Decision:** In the seller's browser, the API key is encrypted with RSA-OAEP (2048-bit, SHA-256) to the operator's
  public key (served by `/api/operator-key`) and stored as `bytes encryptedKey` in the listing. Only the operator server can
  decrypt it, in memory, at execution time.
- **Why:** No database needed (works on stateless Vercel), the key never appears in plaintext anywhere public, and the
  buyer never sees it. Mirrors the original idea's "sealed key" guarantee with the simplest possible storage.
- **Trust assumption (stated honestly in README):** the operator can decrypt keys and reports token usage. A TEE or
  multi-operator setup is future work.

## D-006 — One contract, native MON, operator-settled escrow
- **Decision:** Single contract `QuotaGrid.sol`:
  - `createListing / updateListing` by sellers (model, price per 1k tokens, quota, encrypted key)
  - `openRequest(listingId, tMax, promptHash)` payable: buyer deposits `quote(tMax)`; quota is locked so two buyers
    cannot book the same tokens
  - `settle(requestId, tUsed)` by operator: seller credited `cost(tUsed) − fee`, fee kept, buyer refunded
    `deposit − cost(tUsed)` in the same transaction; unused quota unlocked
  - `cancel` by operator (provider failed → 100% refund), `reclaim` by buyer after 10 min if the operator never settles
  - `withdraw` (seller pull payment), `withdrawFees` (owner)
- **Why:** Smallest contract that shows the full idea in a live demo. Native MON avoids token approvals (one wallet popup).
  `reclaim` means the operator can never trap buyer funds. Pull-payment for sellers + fallback-to-balance for refunds
  avoids reentrancy and griefing.
- **Fee:** 2.5% (250 bps, owner-settable, capped at 10%), taken from the seller's gross so the buyer pays exactly
  `cost(tUsed)`.

## D-007 — Prompt is bound on-chain by hash
- **Decision:** `openRequest` stores `keccak256(prompt)`. The API only executes a request if the submitted prompt hashes
  to the stored value and the request is still open.
- **Why:** Proves which prompt was paid for without an extra signature popup, and stops anyone else from spending a
  buyer's deposit on a different prompt.

## D-008 — Two first-class flows: humans and token-aware agents
- **Decision:** Keep the human web flow (Market → Buy → Pay & run) and add an agent flow on the same contract and API.
  A "token-aware agent" runs on its own LLM provider and automatically switches to QuotaGrid when it is low on tokens.
- **Why:** User request (journey-first review, 12 scenarios mapped: primary works; quota-error fallback; budget-threshold
  fallback; no listing fits size/price; agent wallet low on MON; seller provider fails → cancel; operator never settles →
  reclaim; concurrent calls from one agent; execute response lost after payment; multi-turn history; spend cap hit; human
  flow unchanged).

## D-009 — Agent switch trigger: proactive budget AND reactive quota errors
- **Decision:** The SDK wrapper tracks the agent's own token budget and switches when it falls below a threshold, and also
  switches immediately when the primary provider returns a quota / rate-limit error (HTTP 429, "insufficient quota",
  "RESOURCE_EXHAUSTED").
- **Why:** User choice. Proactive avoids a failed call; reactive covers agents that don't know their remaining quota.

## D-010 — Agents pay with per-call escrow from their own wallet, on Monad only
- **Decision:** Every agent call = `openRequest` from the agent's own Monad wallet → `/api/execute` → operator `settle`.
  Same contract as humans. No prepaid credit, no vouchers, no other chains or bridges.
- **Why:** User choice ("per call escrow but be in monad ecosystem only"). No contract change needed mid-build; fully
  non-custodial; every agent call is visible live in the Activity feed. Cost: 2 txs per call, acceptable on Monad.

## D-011 — Agent integration surfaces: SDK, CLI demo agent, MCP server, OpenAI- and Gemini-compatible endpoints
- **Decision:** One TypeScript package (`sdk/`) with a shared core (listing pick, quote, escrow, execute) and:
  1. `withQuotaGridFallback(primary, opts)` wrapper (budget + error trigger),
  2. `quotagrid demo-agent` CLI (real task, tiny budget, visibly switches, prints tx links),
  3. `quotagrid mcp` MCP server exposing a `quotagrid_complete` tool,
  4. `quotagrid proxy` — a **local** HTTP proxy on the agent's machine serving OpenAI-compatible
     `POST /v1/chat/completions` and Gemini-compatible `POST /v1beta/models/{model}:generateContent`.
- **Why the proxy is local:** A drop-in endpoint cannot sign Monad transactions for the caller. Running it next to the agent,
  holding the agent's own key, keeps per-call escrow non-custodial (D-010) while letting any OpenAI/Gemini client switch by
  changing only its base URL. A hosted endpoint would need us to custody agent funds — rejected.

## D-012 — Agent listing choice: preferred models + price cap
- **Decision:** Agent passes an ordered list of acceptable models and a max price per 1k tokens. SDK picks the cheapest active
  listing that matches, has `available >= T_max`, and is under the cap; otherwise it fails with a clear error (no silent
  model downgrade).
- **Why:** User choice. Predictable quality and spend.

## D-013 — Execute payload becomes a structured, hashed JSON (multi-turn)
- **Decision:** `/api/quote` and `/api/execute` accept `payload`: canonical JSON string
  `{"v":1,"system"?:string,"messages":[{"role":"user"|"assistant","content":string}]}`; on-chain `promptHash =
  keccak256(utf8(payload))`. The human UI sends a one-message payload.
- **Why:** Agents and OpenAI/Gemini-compatible clients send conversation history and system prompts; a single string loses
  that. Hashing the exact payload string keeps D-007's guarantee.

## D-014 — Agent safety limits are enforced client-side in the SDK
- **Decision:** SDK options `maxSpendPerCallMON`, `maxSpendTotalMON`, and a minimum wallet balance; it refuses to open an
  escrow that would break them. If the execute response is lost after payment, the SDK retries `/api/execute` for the same
  requestId; if the request is still Open after the server timeout it calls `reclaim` after the 10-min delay.
- **Known gap:** if settlement succeeded but the HTTP response was lost, the answer is not recoverable (the server keeps no
  output). Accepted for the hackathon; documented in README.

## D-015 — Respect Monad's 10 MON reserve balance
- **Decision:** UI warns when a wallet holds < 10.5 MON; the SDK refuses to open an escrow unless balance >= cost + 10 MON +
  gas margin. Demo wallets are funded well above 10 MON.
- **Why:** Verified live (https://docs.monad.xyz/developer-essentials/reserve-balance.md): `user_reserve_balance = 10 MON`
  per EOA; value-spending txs that leave an EOA below it can revert (except "emptying" txs). Agents firing several calls in
  quick succession would hit this.

## D-016 — Switch agy workers from Claude models to Gemini
- **Decision:** `contract` and `web` runs on `claude-opus-4-6-thinking` / `claude-sonnet-4-6` returned empty after ~40s
  (quota). Re-ran them on `gemini-3.8-flash-high`; all later runs default to Gemini.
- **Why:** Keep the parallel schedule; verify output with builds/tests instead of relying on model strength.

## D-017 — Separate deployer/owner and operator wallets
- **Decision:** Deployer/owner `0xF01D4dDF483F0c125df2C9cdf72485356798b179` (deploys, owns fees/settings) and operator
  `0xE959Fdd4f6E50F553C762260e0398332c438C8aA` (server hot wallet that calls `settle`/`cancel`). Keys only in gitignored `.env`.
- **Why:** User request. The operator key lives on the server (Vercel env), so if it leaks the attacker can only settle /
  cancel open requests — not withdraw protocol fees or change the operator/fee (owner-only).
- **Funding check (live RPC `eth_getBalance`, 13:37 IST):** deployer = 5 MON (0x4563918244f40000 wei).

## D-018 — agy runs use `/boost` orchestrator mode
- **Decision:** Added a `--boost` flag to the agy wrapper (`run_agy.py`, and `"boost": true` in `run_agy_many.py` job
  specs) that starts the prompt with `/boost`, agy's orchestrator command (delegates coding to DeepCoder / investigation
  to DeepInvestigator subagents and verifies in extra rounds). Used for all build runs from now on.
- **Why:** User request.

## D-019 — Deployed and verified QuotaGrid on Monad testnet
- **Contract:** `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1` (chain 10143), deploy tx
  `0x14efce9ca1fb0ad9a58ea90517d0878ab4d88c6037d7432915e8d90cfeb898c4`, owner = deployer `0xF01D…b179`,
  operator = `0xE959…C8aA`, feeBps = 250 (read back via `cast call`).
- **Verified:** Sourcify (Monad's verifier per https://docs.monad.xyz/guides/verify-smart-contract/foundry.md), status
  `match`, job https://sourcify-api-monad.blockvision.org/verify-ui/jobs/beda484b-eade-40f9-8ff7-a9e88a157756
- **Why now:** contract tests 17/17 pass on our own rerun (incl. 256-run fuzz on settlement conservation), settle logic
  spot-reviewed. ABI is frozen per briefs/interface.md, so UI/API/SDK can integrate against the live address.
- **Reproducible:** `scripts/deploy-testnet.sh` and `scripts/verify-testnet.sh <address>` (read keys from gitignored `.env`).
- **Operator RSA key:** generated with `web/scripts/gen-operator-keys.mjs` into gitignored `web/.env.local` only.

## D-020 — Commit and push continuously to the fork
- **Decision:** Commit + push to `rohitblpprajapat/quotagrid` (`main`) after each verified milestone. Before every commit,
  scan staged files for the real keys from `.env` / `web/.env.local` (none may appear). No AI attribution lines in commits.
- **Why:** User approval; code must be on GitHub before the 17:30 code freeze, and frequent pushes make a lost machine or a
  bad agent edit recoverable.

## D-021 — Build the UI with 4 parallel Windows agy runs; install deps on Windows
- **Decision:** `web2` (WSL) spent its full 50 min in `npm install` on `/mnt/d` and wrote no UI. The UI is now split into
  `ui-core` (shared libs, providers, layout, components — contract in `briefs/ui-shared.md`), `ui-buy` (market + pay & run),
  `ui-sell` (list quota, my listings, earnings), `ui-pages` (landing, live activity feed, agents page), all on the Windows
  host (edit-only) with `/boost`. The supervisor installs npm deps and runs the build on Windows.
- **Why:** WSL ↔ Windows-drive file I/O makes npm installs extremely slow; Windows-side installs and edit-only agents avoid
  it. Fixing the shared exports up front lets the four pages be written at the same time.

## D-022 — Slow venue network: let Vercel build in the cloud; pin web deps by hand
- **Finding (14:25):** HTTPS to registry.npmjs.org, npmmirror, yarnpkg and even google.com takes 10–20 s+ per request;
  local `npm install` in `web/` failed with network errors (debug log `npm-cache/_logs/2026-11-04T08_36_52_190Z`).
- **Decision:** Don't depend on a local `node_modules` for the web app. Pin deps in `web/package.json` from live registry
  metadata — `wagmi 2.19.5` (latest 2.x; npm `latest` is 3.7.11, but all briefs target the v2 API; its peers are viem 2.x,
  react >= 18, @tanstack/react-query >= 5), `viem 2.57.16`, `@tanstack/react-query 5.105.3` — and let Vercel's build
  (fast network) install and type-check. Vercel CLI 65.11.0 is installed locally for deploys.
- **Risk:** first type errors surface on the Vercel build instead of locally; mitigated by fixing quickly via redeploy.

## D-023 — Use `/boost` only for big jobs with long timeouts
- **Finding:** all four UI runs with `/boost` hit the 30-min timeout: the orchestrator delegated to a DeepCoder subagent and
  was still waiting when killed. The pages were written (4.6k lines), but `ui-core` never wrote its 6 shared components,
  causing 83 type errors (plus tsconfig target ES2017 rejecting BigInt literals — fixed to ES2020).
- **Decision:** small, well-scoped fixes run without boost and with short timeouts (`ui-core-fix1`); boost stays for large
  multi-file work and gets >= 45-min timeouts.
- **Why:** Boost adds a subagent hop and verification rounds; with ~2.7 h to code freeze, latency matters more.

## D-024 — Production build fixes and Vercel deploy
- **Fixes:** removed Next 16 scaffold flags `cacheComponents` / `partialPrefetching` (incompatible with the API routes'
  `runtime = 'nodejs'` segment config; the app reads live chain state so component caching isn't wanted); pinned
  `"engines": {"node": ">=22.12"}` because `@tailwindcss/turbopack` needs unflagged `require(esm)` (Node 22.12+; local Node
  22.11 builds only with `NODE_OPTIONS=--experimental-require-module`); Badge prop mismatch fixed; stale tsbuildinfo removed.
- **Result:** local `next build` OK (7 pages + 3 API routes, tsc 0 errors). Deployed to **https://quotagrid.vercel.app**
  (`vercel deploy --prod`). Smoke test: `/`, `/market`, `/sell`, `/activity`, `/agents` → 200; `/api/operator-key` → 200 and
  serves operator `0xE959…C8aA` (proves server env is loaded); `/api/quote` for a non-existent listing → clear error.

## D-025 — Dedicated demo-agent wallet
- **Decision:** Generated agent wallet `0xC44FfE454D021Db75E8211C5a685551Bf7005FDa`; key + SDK config in gitignored
  `sdk/.env` (QUOTAGRID_PRIVATE_KEY, QUOTAGRID_API_URL=https://quotagrid.vercel.app, contract, RPC). Run the SDK with
  `node --env-file=.env dist/cli.js …` (Node's built-in env loader; the SDK reads `process.env` only).
- **Why:** Agents pay per call from their own wallet (D-010), separate from deployer/operator (D-017), so the demo shows a
  real third party buying compute. Needs > 10 MON + call costs (D-015).

## D-026 — Fix wrong-network writes; relax the SDK's 10 MON floor using Monad's emptying exception
- **Bug found in live test (15:20):** user created a listing but `listingCount` stayed 0 on our contract. The live bundle
  has the right address/chain, so the tx went elsewhere: every `writeContractAsync` call omitted `chainId`, and
  ConnectButton used `useChainId()` (the app config's chain) instead of the wallet's real chain, so the
  "Switch to Monad" prompt could stay hidden while the wallet sat on another network.
- **Fix:** new `useEnsureMonad()` hook (wallet chain from `useAccount().chainId`; switches via `switchChainAsync`) called
  before every write, and `chainId: monad.id` passed to all 4 write sites (createListing, updateListing, withdraw,
  openRequest) so wagmi refuses to send on any other chain. ConnectButton now uses the wallet's chain id.
- **Reserve rule, re-read live** (https://docs.monad.xyz/developer-essentials/reserve-balance.md): an undelegated EOA may
  dip below the 10 MON reserve with an "emptying transaction" — one that is its only tx within the past k blocks
  ("allow most small accounts to still interact … normally", k blocks ≈ 1.2 s). The SDK now spaces its txs ≥ 1.5 s apart
  and its balance floor defaults to deposit + gas margin; `QUOTAGRID_MIN_RESERVE_MON=10` restores the strict D-015 floor.
- **Why:** faucet wallets hold ~5 MON; the strict floor blocked the demo agent although the chain would accept its txs.

## D-027 — Live end-to-end verification + resilience fixes
- **Verified on Monad testnet (15:45–15:55), listing #1 `gemini-2.5-flash` @ 0.001 MON/1k by seller `0x1969…cEA8`:**
  - Request #2 (raw API script `sdk/scripts/e2e-raw.mjs`): T_max 135 → T_used 17; payout 0.000016575 + fee 0.000000425 +
    refund 0.000118 = deposit 0.000135 MON exactly. Open `0x068ff237…91aa`, settle `0xb6761fb7…b2fb`.
  - Request #3 (SDK `sdk/scripts/e2e-live.mjs`): T_max 146 → T_used 71; split check PASS; 5.7 s end-to-end.
    Open `0xdeb3eb29…4dde`, settle `0x536151d8…ed89`.
  - Demo agent: steps 1–4 bought via escrow + settle (4–6 s each). Steps 5–6 hit Gemini `503 UNAVAILABLE
    "high demand"` → server cancelled on-chain with 100% refund (cancel txs `0x695924bd…5266`, `0xa0fd3fd5…d278`).
- **Fix 1 (SDK):** a response carrying `cancelTx` (or 409 "not open") is terminal — the SDK now throws the provider error +
  cancel tx instead of retrying a cancelled request (that retry had hidden the real 503 on request #1).
- **Fix 2 (server):** transient provider errors (429/5xx, UNAVAILABLE, "high demand") are retried up to 2 more times with
  1.2 s / 2.4 s backoff before cancel + refund. Non-transient errors still fail fast.
- **Why:** the 3-minute stage demo needs a live call to land; provider overload is outside our control, but refund-on-failure
  plus a short retry keeps the demo honest and likely to succeed.
