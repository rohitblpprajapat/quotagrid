## Goal
Fact-check, from LIVE official docs fetched now, the AI provider APIs our server will call. Output
`docs/research/ai-providers.md`. Every fact with source URL + quoted snippet. Nothing from memory.

## Do
For each provider below, record: endpoint URL, auth header, request body for a single-turn text prompt with an output-token
cap, the response field holding the text, the response fields holding token usage (input, output, thinking/reasoning if
separate), whether a FREE token-counting endpoint exists (exact URL + body + response field), and current model ids that
are cheap/fast (list exactly what the live models page shows today). Also note free-tier availability.
1. Google Gemini API (ai.google.dev / generativelanguage.googleapis.com): generateContent, countTokens, usageMetadata
   fields (promptTokenCount, candidatesTokenCount, thoughtsTokenCount?, totalTokenCount?), how to cap/disable thinking.
2. Anthropic Messages API (docs.anthropic.com / docs.claude.com / platform.claude.com): /v1/messages, required headers
   (x-api-key, anthropic-version value), max_tokens, usage fields, /v1/messages/count_tokens.
3. OpenAI-compatible chat completions as offered by Groq (console.groq.com/docs) and OpenAI: /chat/completions, usage
   fields (prompt_tokens, completion_tokens, reasoning tokens field if any), output cap param name
   (max_tokens vs max_completion_tokens).
Prefer fetching raw markdown versions of doc pages when they exist (e.g. `.md` suffix or llms.txt).

## Rules
Only create `docs/research/ai-providers.md`. Don't touch other files. Do not use or need any API key.

## Verify
`test -s docs/research/ai-providers.md`.

## Done when
File exists with one section per provider + a summary table. Final message: for each provider the usage field names and
the count-tokens endpoint (or "none").
