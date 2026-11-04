# QuotaGrid — 3-minute demo script (Monad Blitz Mumbai, 4 Nov 2026)

Rule to hit: **a live on-chain transaction during the 3 minutes.** We do two: a human buy and an agent buy.

## Setup (before going on stage)
- **Laptop screen 1 (browser):** tab A `https://quotagrid.vercel.app/buy/1`, tab B `https://quotagrid.vercel.app/activity`,
  tab C the settle tx on `testnet.monadvision.com` (fallback). Wallet connected **on Monad Testnet**, > 1 MON.
- **Laptop screen 2 (terminal):** in `sdk/`, command typed but not run:
  `node --env-file=.env dist/cli.js demo-agent --models gemini-2.5-flash --max-price 0.01 --budget 120 --threshold 50`
  (needs `PRIMARY_GEMINI_API_KEY` in `sdk/.env` so the agent starts on its own key and visibly switches; without it the
  agent runs QuotaGrid-only — still a live tx, but no "switch" moment).
- Check right before: `node --env-file=.env dist/cli.js models` shows listing #1 with free quota; operator wallet has gas.
- Zoom browser to 125–150 % so numbers read from the back.

## Script

**0:00 – 0:20 · Problem** (say, don't show slides)
> "Everyone here has AI credits expiring every month, and every agent dies the moment it runs out of tokens. And when you
> pay for AI, you pay for the worst case — not what you used. QuotaGrid fixes both, on Monad."

**0:20 – 1:15 · Live: a human buys one AI call** (tab A)
1. "This is a real listing — someone's Gemini quota. Their API key is encrypted in their browser and sits on-chain only as
   ciphertext. I never see it."
2. Type: *"In one sentence, why do AI agents need per-call payments?"* → **Get quote**.
   > "QuotaGrid counts the exact input tokens and adds the max output: that's T-max, the worst case. I escrow only that."
3. **Pay & run** → approve in wallet.
   > "That's an escrow on Monad… the model is running… and settled."
4. Point at the receipt: tokens reserved vs used, seller payout, 2.5 % fee, **refund in green**.
   > "I reserved ~140 tokens, used ~40. The seller got paid for exactly what I used, and the rest came back to me in the
   > same transaction. Escrow, answer, settlement, refund — about five seconds."

**1:15 – 2:10 · Live: a token-aware agent** (terminal + tab B side by side)
1. Run the demo-agent command.
   > "This agent runs on its own Gemini key with a tiny budget. Watch what happens when it's low on tokens."
2. When the route flips to `QUOTAGRID`:
   > "It didn't crash. It noticed its budget was low — or it got a 429 — and bought the call on QuotaGrid from its own
   > Monad wallet. No human, no credit card."
3. Point at tab B (Activity): RequestOpened → RequestSettled rows streaming in.
   > "Every agent call is its own escrow and settlement. That's only sane with 300 ms blocks and sub-cent gas — that's why
   > this is on Monad."
4. One line: "Any agent can use it: our SDK wrapper, an MCP server, or a local OpenAI- and Gemini-compatible endpoint —
   just change the base URL."

**2:10 – 2:40 · Why you can trust it**
- "Prompt is bound on-chain by hash — nobody can spend my deposit on a different prompt."
- "If the provider fails, the operator cancels and I get 100 % back — we saw Gemini return 503s today and every one refunded."
- "If the operator disappears, I reclaim my deposit myself after 10 minutes."
- "Contract is verified on Sourcify; 17 Foundry tests incl. a fuzz test that payout + fee + refund always equals the deposit."

**2:40 – 3:00 · Business + close**
> "2.5 % on every settled call. Sellers monetise quota that would expire; buyers and agents pay per token with automatic
> refunds. QuotaGrid — quotagrid.vercel.app — live on Monad testnet now."

## If something goes wrong
| Problem | Do this |
|---|---|
| Gemini 503 / provider error | Say: "Provider's overloaded — watch: cancelled, 100 % refunded." Show the cancel tx. That *is* the safety demo. Then retry once. |
| Wallet popup doesn't appear | Use the agent terminal as the live tx; show tab C as the earlier human settle. |
| Venue Wi-Fi slow | Phone hotspot. The agent CLI needs only RPC + our API. |
| Listing quota exhausted | Seller adds quota in `/sell` → My listings (one tx), or a second listing. |

## Numbers you can quote (all verified today, see decisions.md D-027)
- Request #3: reserved 146 tokens, used 71, refund 0.000075 MON, **5.7 s end-to-end** (escrow → model → settle).
- Monad docs: 300 ms blocks, finality in 2 blocks (~600 ms).
- Contract `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1`, verified on Sourcify.
