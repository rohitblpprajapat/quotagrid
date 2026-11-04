# Build-in-public posts — QuotaGrid

Rubric: post on X / LinkedIn tagging **@monad @monad_dev @geeky_kartikey**, a 30 s+ demo video, a creative teaser, and
5K+ combined views counted before **17:45 IST**. Post early; reply to your own post with the video if needed.

## X — main post (with the 30 s demo video attached)
> Your AI credits expire every month. Your agents die when they run out of tokens.
>
> Built QuotaGrid at #MonadBlitz Mumbai: sell unused AI quota without revealing your key. Buyers escrow the worst case,
> pay only for tokens used, and get the rest refunded in the same tx.
>
> Live on Monad testnet 👇
> @monad @monad_dev @geeky_kartikey

(≈ 270 characters before the link — check the counter; drop "Mumbai" if it's over.)

## X — thread replies
1. > How it works:
   > 1. Seller lists quota — API key encrypted in the browser, on-chain only as ciphertext
   > 2. Buyer escrows T_max (input + max output)
   > 3. Settle: seller paid for T_used, 2.5% fee, unused MON refunded — same transaction
2. > The fun part: token-aware agents. When an agent's own budget runs low (or it hits a 429) it buys the call on
   > QuotaGrid from its own Monad wallet. SDK wrapper, MCP server, or a local OpenAI/Gemini-compatible endpoint — change
   > one base URL.
3. > Why Monad: every AI call is its own escrow + settlement. That only works with 300 ms blocks and sub-cent gas.
   > Today's test: reserved 146 tokens, used 71, refund back, 5.7 s from escrow to settlement.
4. > Try it: https://quotagrid.vercel.app
   > Code: https://github.com/rohitblpprajapat/quotagrid
   > Contract (verified): 0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1

## Teaser video idea (10–15 s, the "creative" point)
Screen recording, no voice-over, captions only:
1. Terminal: agent answering questions… caption **"agent: 50 tokens left"**
2. Route flips to `QUOTAGRID` … caption **"it didn't crash. it bought more."**
3. Activity page: RequestOpened → RequestSettled rows flashing in … caption **"escrow → answer → refund. 5 seconds. on Monad."**
4. End card: **QuotaGrid · quotagrid.vercel.app · @monad**

## 30 s demo video (the 20-point one)
Record the Buy page flow from `docs/demo-script.md` 0:20–1:15 (quote → Pay & run → receipt with refund), then 10 s of the
agent terminal switching to QuotaGrid. Captions are enough; no editing needed.

## LinkedIn version
> At Monad Blitz Mumbai today we built **QuotaGrid**: a marketplace for unused AI API quota.
>
> Two problems we kept hitting: monthly AI credits that expire unused, and AI agents that fail the moment they run out
> of tokens. On QuotaGrid, sellers list spare quota without exposing their key (it's encrypted in the browser and stored
> on-chain only as ciphertext). Buyers — people or autonomous agents — escrow the worst-case token cost, pay only for the
> tokens actually used, and get the rest refunded in the same transaction.
>
> Agents can switch to QuotaGrid automatically when their own budget runs low, through an SDK wrapper, an MCP server, or a
> local OpenAI/Gemini-compatible endpoint.
>
> Built on Monad, where per-call escrow and settlement are fast and cheap enough to make sense (live test: 5.7 s from
> escrow to refunded settlement).
>
> Live: https://quotagrid.vercel.app · Code: https://github.com/rohitblpprajapat/quotagrid
> @Monad #MonadBlitz #Web3 #AIagents
