## Goal
Build the QuotaGrid server side: Next.js route handlers in `web/src/app/api/**` and helpers in `web/src/lib/server/**`.
The operator server decrypts the seller's API key in memory, calls the AI provider for a paid request, and settles it
on-chain.

## Context
Read `AGENTS.md` and `briefs/interface.md` first — route shapes, env vars, ABI and shared files are FIXED.
Another worker is scaffolding the Next.js app in `web/` right now and owns `web/src/lib/abi.ts`, `web/src/lib/chain.ts`,
`web/src/lib/types.ts` and `web/package.json`. Import those with relative paths. If they don't exist yet when you start,
code against the spec and check again before finishing.
Allowed dependencies: Next/React and `viem` only (installed by the other worker); Node `crypto`; global `fetch`.

## Do
1. FIRST fetch the live provider docs to confirm request/usage formats (not from memory):
   Gemini https://ai.google.dev/api/generate-content and https://ai.google.dev/api/tokens ;
   Anthropic https://docs.claude.com/en/api/messages and its count-tokens page ;
   Groq https://console.groq.com/docs/api-reference . Put the URLs in code comments.
2. `web/src/lib/server/crypto.ts`: load the RSA private key from `OPERATOR_RSA_PRIVATE_KEY` (base64 of PKCS#8 PEM);
   export `getPublicKeyPem()` (SPKI PEM) and `decryptSellerKey(hex)` (RSA-OAEP, oaepHash sha256).
3. `web/src/lib/server/providers.ts`: `countTokens(provider, model, apiKey, prompt) -> {tokens, exact}` and
   `complete(provider, model, apiKey, prompt, maxOutputTokens) -> {text, inputTokens, outputTokens, thinkingTokens}` for
   'gemini' (limit/disable thinking where the docs allow so the output cap holds), 'anthropic', 'openai-compatible'
   (default base URL Groq `https://api.groq.com/openai/v1`). 30s timeout. Never put the API key in errors or logs.
4. `web/src/lib/server/chain.ts`: viem public + wallet client (operator account from `OPERATOR_PRIVATE_KEY`) on the
   `monad` chain from `../chain`. Monad charges gas on the gas LIMIT, so pass an explicit `gas` for settle/cancel
   (estimateGas * 1.2) instead of a large default.
5. Routes `GET /api/operator-key`, `POST /api/quote`, `POST /api/execute`, exactly per interface.md. Each with
   `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Validate input (prompt <= 8000 chars,
   maxOutputTokens 1..4096). `/api/execute`: in-memory per-requestId lock so one request can't be executed twice at once;
   check status Open + prompt hash; call the provider with cap `tMax - inputTokens` (min 1); tUsed =
   input+output+thinking clamped to tMax; settle; wait for the receipt; decode `RequestSettled`; respond. Provider failure
   -> `cancel` -> respond with error + cancelTx. JSON errors with proper status codes (400/402/404/409/500).
6. `web/scripts/gen-operator-keys.mjs`: generates an RSA-2048 keypair and prints only the base64 PKCS#8 PEM value to put in
   `.env.local` as `OPERATOR_RSA_PRIVATE_KEY`.
7. Self-test `web/scripts/selftest-crypto.mjs` (plain Node, no deps): generate a key, encrypt with
   `crypto.webcrypto.subtle` RSA-OAEP SHA-256 exactly like the browser will, decrypt with the same logic as crypto.ts,
   print PASS/FAIL.

## Rules
Only create/edit `web/src/app/api/**`, `web/src/lib/server/**`, `web/scripts/gen-operator-keys.mjs`,
`web/scripts/selftest-crypto.mjs`. Don't touch anything else (not package.json — if you need a dep, report it).

## Verify
`node web/scripts/selftest-crypto.mjs` -> PASS. Once the scaffold exists: `cd web && npx tsc --noEmit` shows no errors in
your files.

## Done when
Report: files written, doc URLs used, usage field names per provider, self-test result, tsc result.
