# Provider pricing & token accounting — fetched live 2026-11-04 ~16:38 IST

All numbers USD per 1M tokens, paid/standard tier. Ratio = output ÷ input price.

## Anthropic — https://platform.claude.com/docs/en/about-claude/pricing (docs.claude.com redirects here)
Every one of the 21 listed models has ratio **exactly 5×**. Examples: Opus 5.5 $4 / $20; Sonnet 5.5 $2 / $10;
Haiku 5.5 $0.10 / $0.50 (prompts ≤100k tokens, $0.50 / $2.50 above); Haiku 4.5 $1 / $5; Fable 5.1 $10 / $50.
- Model ids (https://platform.claude.com/docs/en/about-claude/models/overview): `claude-fable-5-1`, `claude-opus-5-5`,
  `claude-sonnet-5-5`, `claude-haiku-5-5`; all 128K max output, 1M context. Haiku 4.5 id `claude-haiku-4-5-20251001`.
- Thinking (https://platform.claude.com/docs/en/build-with-claude/extended-thinking): "Thinking tokens count toward the
  `max_tokens` limit for the turn"; `usage.output_tokens_details.thinking_tokens` "reports how many of the billed output
  tokens were internal reasoning" → thinking is billed as output. Manual `thinking: {type: enabled}` is deprecated and
  **rejected with 400 on Claude 4.7+**; 5.x models use "adaptive" thinking (Fable 5.1 / Opus 5.5: "always on").
  Our adapter omits the thinking param, so it works on both old and new models; thinking may still occur on 5.x.

## Google Gemini — https://aistudio.google.com/docs/pricing (ai.google.dev redirects here)
Output column is literally labelled "Output price (including thinking tokens)". Thinking page
(https://aistudio.google.com/docs/thinking): "When thinking is turned on, response pricing is the sum of output tokens
and thinking tokens"; `max_output_tokens` "applies to the combined total of thinking tokens and output tokens".

| model | in | out | ratio |
|---|---|---|---|
| gemini-2.5-flash | $0.30 | $2.50 | 8.3× |
| gemini-2.5-flash-lite | $0.10 | $0.40 | 4× |
| gemini-2.5-pro | $1.25 | $10 | 8× |
| gemini-3.8-flash | $0.75 (→$1.50 from 2027-01-01) | $3.75 (→$7.50) | 5× |
| gemini-3.5-flash-lite | $0.30 | $2.50 | 8.3× |
| gemini-3.1-pro-preview | $2 | $12 | 6× |

- Gemini 3.x use `thinking_level` (low/medium/high, some "minimal"); **no "off" level is documented**. 2.5 models use
  `thinkingBudget` (our code sends 0 and retries without it on a 400 mentioning "thinking").
- **Deprecation:** gemini-2.5-flash and 2.5-pro are deprecated; "Effective December 1, 2026, all API requests to
  gemini-2.5-flash will automatically route to gemini-3.5-flash-lite and be billed at Gemini 3.5 Flash-Lite rates."
  2.5-flash-lite is not deprecated. Output limit for 2.5-flash / 2.5-pro: 65,536.

## Groq (OpenAI-compatible) — https://console.groq.com/docs/models (groq.com/pricing has no numbers)
openai/gpt-oss-120b $0.15 / $0.60 (4×, max completion 65,536); openai/gpt-oss-20b $0.075 / $0.30 (4×);
qwen/qwen3.8-27b $0.80 / $4.00 (5×). llama-3.3-70b-versatile and llama-3.1-8b-instant: price "Contact Sales";
llama-3.3-70b context 131,072, max completion 32,768.
- Chat usage object: `prompt_tokens`, `completion_tokens`, `total_tokens` (verbatim example). No token-count endpoint
  exists → our input estimate stays. Reasoning models exist (gpt-oss, qwen3.8); the docs do not say how reasoning tokens
  are billed; the Responses API shows `output_tokens_details.reasoning_tokens` as a sub-count of output.

## What this means for QuotaGrid's single `pricePerKToken`
- Output (incl. thinking) costs the seller 4–8.3× what input costs on every provider checked; Anthropic is a clean 5×.
- Our escrow invariant still holds for Gemini and Anthropic: both providers count thinking inside the output cap we
  send (`min(maxOutputTokens, tMax − input)`), and the contract rejects `tUsed > tMax`. Seller is never paid more than
  escrowed; buyer never pays more than tMax.
- The gap is economic, not safety: a seller pricing at their *input* rate loses money on output-heavy calls; a seller
  pricing at their *output* rate overcharges input-heavy calls. See D-030 for the standardization options.
