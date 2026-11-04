## Goal
Write the submission `README.md` at the repo root (replace the starter's "submission process" text entirely). Judges score:
proper README (description, setup guide, live URL, contract address) and a REPRODUCIBLE README (anyone can clone and run
without help). Clear, skimmable, honest. No hype words, no emoji walls.

## Sources to read (use their facts; don't invent)
`decisions.md` (all decisions), `progress.md`, `docs/research/monad.md`, `docs/research/event.md`, `contracts/README.md`,
`contracts/src/QuotaGrid.sol`, `sdk/README.md`, `sdk/src/cli.ts`, `web/.env.example` (if missing, use env table in
`briefs/interface.md`), `scripts/deploy-testnet.sh`, `scripts/verify-testnet.sh`, `web/package.json`, `sdk/package.json`.

## Verified facts
- Project: **QuotaGrid** — sell unused AI API quota without revealing your key; buyers (humans or AI agents) escrow the
  worst-case token cost T_max in MON; the operator settles with the exact tokens used T_used; seller paid cost(T_used)
  minus 2.5% fee; buyer refunded deposit − cost(T_used) in the same transaction. Idea inspired by ShunyaGrid; fresh build.
- Contract: `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1` on Monad testnet (chain 10143),
  explorer https://testnet.monadvision.com/address/0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1 , deploy tx
  `0x14efce9ca1fb0ad9a58ea90517d0878ab4d88c6037d7432915e8d90cfeb898c4`, verified on Sourcify (status `match`,
  https://sourcify-api-monad.blockvision.org/verify-ui/jobs/beda484b-eade-40f9-8ff7-a9e88a157756). Owner/deployer
  `0xF01D4dDF483F0c125df2C9cdf72485356798b179`, operator `0xE959Fdd4f6E50F553C762260e0398332c438C8aA`, feeBps 250.
- Live app: put the literal placeholder `LIVE_URL_TBD` (supervisor fills it after deploy).
- Repo: https://github.com/rohitblpprajapat/quotagrid (fork of monad-developers/monad-blitz-devcon-mumbai).
- Tests: 17 Foundry tests incl. 256-run fuzz (seller + fee + refund == deposit); SDK 18 tests.
- Monad facts (cite docs.monad.xyz links from docs/research/monad.md): 300 ms blocks, finality 2 blocks (~600 ms), gas
  charged on gas limit, 10 MON reserve balance per EOA.

## Structure
1. Title + one-line pitch + badges-as-text line (Monad testnet · contract verified · live app link).
2. Links table: live app, contract (explorer), Sourcify verification, demo video (`DEMO_VIDEO_TBD`), repo.
3. The problem (4 short bullets: mid-way token exhaustion, all-or-nothing escrows, key/prompt exposure, expiring unused quota).
4. How it works: ASCII sequence diagram buyer → contract (openRequest, T_max escrow, quota lock) → API (verify prompt hash,
   decrypt seller key in RAM, call model with cap) → contract (settle: payout / fee / refund) ; formulas for T_max and the
   split. Lifecycle states Open → Settled | Cancelled | Reclaimed.
5. Two flows: Humans (Market → Buy → Pay & run; Sell: encrypt key in browser → list; withdraw earnings) and
   Token-aware AI agents (SDK `withQuotaGridFallback` with budget threshold + 429/quota-error trigger, local
   OpenAI-compatible + Gemini-compatible proxy, MCP server, demo agent) — exact commands from sdk files.
6. Why Monad (per-call escrow + settlement only practical with sub-second blocks and tiny fees; cite docs).
7. Repo layout tree (contracts/, web/, sdk/, docs/research/, scripts/, decisions.md, progress.md, briefs/).
8. **Quickstart (reproducible)**, numbered, copy-paste, with prerequisites (Node 20+, Foundry >= 1.8, a wallet with testnet
   MON from https://faucet.monad.xyz — keep > 10 MON):
   a) clone; b) contracts: `forge install`/build/test, deploy via `scripts/deploy-testnet.sh` with `.env` vars
   (DEPLOYER_PRIVATE_KEY, OPERATOR_ADDRESS), verify via `scripts/verify-testnet.sh <address>`; c) web: `cd web && npm
   install`, generate RSA key `node scripts/gen-operator-keys.mjs`, fill `.env.local` (table of every var + meaning),
   `npm run dev`, open localhost:3000; d) SDK: `cd sdk && npm install && npm run build && npm test`, env vars, run proxy /
   mcp / demo-agent. Mention you can skip (b) and use the deployed contract.
9. Security model & trust assumptions (honest): operator can decrypt seller keys in memory and reports usage; mitigations
   (key only as ciphertext on-chain, prompt hash binding, buyer reclaim after 10 min, operator can't withdraw fees,
   separate owner/operator keys); known gaps (lost execute response after settlement is unrecoverable; no TEE yet).
10. Business model: 2.5% protocol fee on settled spend; future: multi-operator / TEE, more providers, mainnet.
11. Engineering process: link `decisions.md`, `progress.md`, `docs/research/` (every fact fact-checked live with URLs).
12. Hackathon: Monad Blitz Mumbai [Devcon Edition], 4 Nov 2026.

## Rules
Only write `README.md` at the repo root. Windows host: don't run commands. Don't touch other files.

## Done when
README.md written; report its section list.
