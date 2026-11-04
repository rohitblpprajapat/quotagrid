## Goal
Build the agent side of QuotaGrid in `sdk/`: one TypeScript npm package `quotagrid` (bin `quotagrid`) that lets
"token-aware" AI agents automatically buy LLM calls on QuotaGrid when their own tokens run low. Decisions D-008..D-015 in
`decisions.md` define the behaviour — read them, plus `AGENTS.md`, `briefs/interface.md` (ABI, payload format, API routes),
`docs/research/monad.md` and `docs/research/ai-providers.md` (verified API formats).

## Do
1. `sdk/package.json` (type module, Node >= 20, bin `quotagrid` -> `dist/cli.js`, scripts build=tsc, test=node --test),
   `sdk/tsconfig.json`. Deps: `viem`, `@modelcontextprotocol/sdk`, `zod`. Use current npm versions (check the MCP SDK's
   live README on npm/GitHub for the current server API — don't write it from memory).
2. `src/config.ts`: env `QUOTAGRID_API_URL` (required, e.g. https://<app>/), `QUOTAGRID_PRIVATE_KEY` (agent wallet),
   `QUOTAGRID_CONTRACT`, `MONAD_RPC_URL` (default https://testnet-rpc.monad.xyz). Chain = viem `monadTestnet`.
3. `src/abi.ts` (same ABI as interface.md) and `src/payload.ts`: `buildPayload({system?, messages})` producing EXACTLY
   `JSON.stringify({v:1, ...(system ? {system} : {}), messages: messages.map(m => ({role: m.role, content: m.content}))})`
   so hashes match the web app byte for byte.
4. `src/core.ts` — `QuotaGridClient`:
   - `listListings()` (reads chain), `pickListing({models, maxPricePerKTokenMON, tMax})`: cheapest active listing whose
     `model` is in the ordered `models` list (exact string match, earlier = preferred on price tie), `available >= tMax`,
     price <= cap; else throw `NoListingError` with the reason.
   - `complete({system?, messages, maxOutputTokens, models, maxPricePerKTokenMON})`: pick a listing (first with an estimated
     tMax), POST `/api/quote`, re-check cap + spend limits (`maxSpendPerCallMON`, `maxSpendTotalMON`) + wallet balance >=
     cost + 10 MON reserve + gas margin (Monad reserve-balance rule, see research) -> `openRequest` with an explicit gas
     limit (estimateGas * 1.2; Monad charges the gas LIMIT) -> wait receipt -> requestId from `RequestOpened` -> POST
     `/api/execute` (retry up to 3x on network errors / 5xx with the same requestId; on 409 wait 2s and retry) -> return
     `{text, listingId, model, requestId, tMax, tUsed, depositWei, sellerPayoutWei, feeWei, refundWei, openTx, settleTx,
     cancelTx?, latencyMs}`. If execute ultimately fails and the request is still Open, throw with requestId and how to
     `reclaim`.
   - `reclaim(requestId)`, `walletInfo()`. Serialize this client's transactions through an internal async queue so
     concurrent `complete()` calls never collide on nonce.
5. `src/fallback.ts` — `withQuotaGridFallback(primary, opts)`: `primary(req) -> Promise<{text, usage:{inputTokens,
   outputTokens}}>`; opts `{budgetTokens, thresholdTokens, models, maxPricePerKTokenMON, maxSpendPerCallMON,
   maxSpendTotalMON, onSwitch(reason)}`. Tracks remaining budget from usage. Routes to QuotaGrid when remaining <
   threshold (proactive) OR when primary throws a quota error (reactive). `isQuotaError(err)`: HTTP 429, or message/body
   matching /quota|rate.?limit|RESOURCE_EXHAUSTED|insufficient_quota|credit balance/i. Non-quota errors are rethrown.
6. `src/proxy.ts` — `quotagrid proxy [--port 8787] [--models a,b] [--max-price X]`: local node:http server on 127.0.0.1:
   - `POST /v1/chat/completions` (OpenAI-compatible request -> payload; `max_completion_tokens` or `max_tokens`, default
     512; `model` is tried first, then `--models`). Response in OpenAI `chat.completion` format with `usage`
     {prompt_tokens, completion_tokens, total_tokens} plus a `quotagrid` field with tx hashes/explorer links. If
     `stream: true`, reply as SSE with one content chunk then `data: [DONE]`.
   - `POST /v1beta/models/{model}:generateContent` (Gemini-compatible: `contents` with roles user/model,
     `systemInstruction`, `generationConfig.maxOutputTokens`) -> Gemini response shape (`candidates[0].content.parts[0].text`,
     `usageMetadata`). Also `:streamGenerateContent` as one chunk.
   - `GET /v1/models` (OpenAI list of models currently listed on QuotaGrid).
   - Optional token-aware primary: `--primary openai|gemini --primary-base-url --primary-key-env NAME --budget N
     --threshold M`: proxy first forwards to the agent's real provider, tracks usage, and switches to QuotaGrid by the
     D-009 rules. Logs one line per call: route (primary/quotagrid), reason, tokens, tx link.
   - Errors in the matching provider error format with a clear message.
7. `src/mcp.ts` — `quotagrid mcp` (stdio MCP server) with tools `quotagrid_list_models`, `quotagrid_complete({prompt,
   system?, models?, maxOutputTokens?, maxPricePerKTokenMON?})`, `quotagrid_wallet`.
8. `src/demo-agent.ts` — `quotagrid demo-agent`: a real multi-step task (e.g. answer 6 short questions one by one) using
   `withQuotaGridFallback` with a REAL primary provider (Gemini key from env `PRIMARY_GEMINI_API_KEY`, or OpenAI-compatible
   via env) and a deliberately small `--budget` so it visibly switches mid-task. No simulated responses: if there's no
   primary key, start in QuotaGrid-only mode and say so. Clear, colourful terminal output: step, route, reason for switch,
   tokens, MON cost/refund, explorer links (https://testnet.monadvision.com/tx/<hash>).
9. `src/cli.ts` dispatching `proxy | mcp | demo-agent | wallet | models`.
10. Tests (`node --test`, no network): payload byte-equality vs a fixture; isQuotaError cases; OpenAI<->payload and
    Gemini<->payload converters incl. system + multi-turn; pickListing ordering/cap/availability; budget switch logic with a
    fake primary.
11. `sdk/README.md`: install, env vars, each surface with copy-paste examples (OpenAI SDK `baseURL: 'http://127.0.0.1:8787/v1'`,
    Gemini REST base URL, Claude Desktop / Claude Code MCP config JSON), safety limits, the 10 MON reserve note.

## Rules
Only create/edit files under `sdk/`. Don't touch anything else. No secrets in files. No mock/simulated AI answers anywhere.

## Verify
`cd sdk && npm install && npm run build && npm test` -> build ok, all tests pass. `node dist/cli.js --help` prints usage.
`node dist/cli.js proxy --port 8799 &` then `curl -s localhost:8799/v1/models` returns JSON or a clear config error (no
crash); kill it.

## Done when
Build + tests pass. Report files, versions, test results, anything unverified.
