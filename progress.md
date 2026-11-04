# Progress — QuotaGrid (Monad Blitz Mumbai, 2026-11-04)

Code freeze **17:30 IST** · submission **17:45 IST** · demos from 18:00 (3 min, live on-chain tx required).

## Log
| Time (IST) | Update |
|---|---|
| 12:45 | Forked starter repo → `rohitblpprajapat/quotagrid`, cloned into working dir. Wrote AGENTS.md, decisions D-001…D-007. |
| 12:50 | Launched batch 1 (parallel agy): research-chain, research-event, research-ai, contract, web, api. |
| 13:10 | Research done: docs/research/monad.md, event.md, ai-providers.md (all with live URLs). Key: testnet 10143, 10 MON reserve rule, Sourcify verifier. |
| 13:15 | contract + web runs failed (Claude quota) → relaunched on Gemini (D-016). User added token-aware agent flow → D-008…D-015. |
| 13:33 | Generated deployer/operator wallet; asked user to fund. `api` v1 done; resumed as `api-fix1` for D-013. |
| 13:37 | Deployer funding confirmed on-chain (5 MON). Split operator into its own wallet (D-017). Added `/boost` support to agy wrapper (D-018). |
| 13:25 | Launched `sdk` run: agent SDK, fallback wrapper, local OpenAI/Gemini-compatible proxy, MCP server, demo agent. |

| 13:47 | Operator funded (5 MON, verified). contract2 done (17/17). Deployed QuotaGrid `0xC5A6…f5f1` + Sourcify verified. web/.env.local created. |

| 13:55 | First commit pushed to github.com/rohitblpprajapat/quotagrid (e4054fc); secret scan clean. sdk resumed as sdk-fix1 with --boost. |
| 14:20 | sdk-fix1 verified (18/18, live read OK), pushed 56482f5. web2 failed on slow WSL npm install → UI split into 4 parallel Windows agy runs (D-021). |

## Rubric checklist
### Basic (50)
- [x] Forked official starter repo, renamed (10)
- [ ] Proper README: description, setup, live URL, contract address (10)
- [x] Contract deployed on Monad testnet (20) — `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1`
- [ ] Publicly hosted app (10)
### Advance — Project working (50)
- [ ] All announced features work (20)
- [ ] Live on-chain tx during demo (10)
- [x] Contract verified on explorer (10) — Sourcify `match`
- [ ] Reproducible README (10)
### Advance — Build in public (50) — needs the team
- [ ] X/LinkedIn post tagging the required accounts (10)
- [ ] 30s+ demo video on socials (20)
- [ ] Creative teaser video (10)
- [ ] 5K+ combined views before 17:45 (10)
### Bonus (50)
- [ ] Mainnet deploy (10) · [ ] Custom domain (10) · [ ] Pre-market fit / Revenue / Innovation (judges)

## Workstreams
| Stream | Owner | Status |
|---|---|---|
| Research: Monad chain facts | agy `research-chain` | done → docs/research/monad.md |
| Research: event rules/rubric (live) | agy `research-event` | done → docs/research/event.md |
| Research: AI provider APIs | agy `research-ai` | done → docs/research/ai-providers.md |
| Contract `QuotaGrid.sol` + tests | agy `contract2` (Gemini) | done — 17/17 tests pass (rerun by supervisor) |
| Web UI (market, sell, buy, activity, agents) | `web2` failed (50 min stuck in npm install on /mnt/d) → split into 4 parallel Windows runs `ui-core`, `ui-buy`, `ui-sell`, `ui-pages` (boost); deps installed by supervisor on Windows | running |
| Agent SDK / proxy / MCP / demo agent | agy `sdk` → `sdk-fix1` (boost) | done — 18/18 tests (rerun by supervisor), live `models` read OK |
| API routes (operator key, quote, execute) | agy `api` → `api-fix1` | done — D-013 multi-turn payload, crypto self-test PASS |
| Deploy testnet + verify | supervisor | done — deployed + Sourcify verified (D-019) |
| Host on Vercel | supervisor | Vercel CLI 65.11.0 installed; waiting for user `vercel login`; build will run on Vercel (D-022) |
| README | — | pending |

## Needs from the user
- (done) Deployer + operator funded, 5 MON each.
- An AI provider API key for the demo seller listing.
