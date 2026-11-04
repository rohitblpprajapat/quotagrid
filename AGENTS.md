# AGENTS.md — rules for every worker on QuotaGrid

Project: **QuotaGrid** — marketplace where people sell unused AI API quota without revealing their keys. Buyer escrows the
worst-case token cost (T_max) in MON on Monad; seller is paid only for tokens actually used (T_used); the rest is refunded
in the same settlement transaction; protocol takes a small fee. Built for Monad Blitz Mumbai (2026-11-04). Code freeze 17:30 IST.

## Hard rules
- **No faking.** Every chain fact (chain id, RPC, explorer, verifier URL, EVM version), every API fact (endpoint, model
  name, usage field) must come from a live source you fetched today. Write the URL next to the fact in `docs/research/`.
  If you cannot verify something, say so in your report; do not guess.
- **Fresh code only.** Do not copy code from any other repo (hackathon rule: fresh builds only).
- **Stay in your file scope.** Each brief lists the files you own. Do not edit anything else, especially `decisions.md`,
  `progress.md`, `AGENTS.md`, `briefs/`.
- **No secrets in git.** Private keys/API keys live only in `.env` / `.env.local` (gitignored). Never print them in reports.
- No mock data in the UI that pretends to be on-chain. Empty states are fine.

## Layout
- `contracts/` — Foundry project (`QuotaGrid.sol`, tests, deploy script)
- `web/` — Next.js (App Router, TypeScript, Tailwind) frontend + API routes; wagmi/viem
- `docs/research/` — fact-checked research notes with source URLs
- `decisions.md`, `progress.md` — owned by the supervisor (Claude)
