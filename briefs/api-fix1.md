## Goal
Update your API routes for decision D-013 (structured multi-turn payload). Re-read `briefs/interface.md` — the
"Payload (D-013)" bullet and the `/api/quote` + `/api/execute` bodies changed.

## Do
1. `/api/quote` body is now `{ listingId, payload, maxOutputTokens }`; `/api/execute` body is now
   `{ requestId, payload, maxOutputTokens }`. `payload` is the canonical JSON string
   `JSON.stringify({v:1, ...(system ? {system} : {}), messages:[{role, content}]})`.
2. Parse/validate it with `parsePayload` from `web/src/lib/payload.ts` (owned by the web worker; if it doesn't exist yet,
   write your own private validator in `web/src/lib/server/payload-validate.ts` with the same rules: v===1, messages
   non-empty, roles user|assistant, last message role user, content strings, total length <= 16000).
3. Hash check: `keccak256(toBytes(payload)) === request.promptHash` — hash the raw string exactly as received.
4. Providers: pass system + multi-turn natively — Gemini `systemInstruction` + `contents` (assistant -> role `model`);
   Anthropic top-level `system` + `messages`; OpenAI-compatible `messages` with a leading `{role:'system'}`.
   `countTokens` must count the whole conversation (Gemini countTokens with contents+systemInstruction; Anthropic
   count_tokens with system+messages; estimate for OpenAI-compatible over all text).
5. Use `maxOutputTokens` from the execute body but never exceed `tMax - inputTokens`.

## Rules
Same file scope as before: `web/src/app/api/**`, `web/src/lib/server/**`, `web/scripts/*.mjs` you created. Nothing else.

## Verify
`node web/scripts/selftest-crypto.mjs` still PASS. `cd web && npx tsc --noEmit` — no errors in your files (if the web
scaffold isn't finished, report that).

## Done when
Report changed files and tsc result.
