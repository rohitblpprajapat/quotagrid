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
| 14:50 | UI runs finished (timeouts, pages written). tsc: 83 errors from 6 missing shared components + ES2017 target → target fixed; `ui-core-fix1` writing components (D-023). |
| 15:06 | UI type-checks + builds. Deployed https://quotagrid.vercel.app; pages + operator-key API verified live (D-024). README being written (agy `readme`). |
| 15:08 | README written + fact-fixed, pushed 783ee7f, redeployed. Next: live end-to-end test (needs a seller listing with a real API key). |
| 15:19 | Live test: user's listing never reached our contract (listingCount 0) → wrong-network write bug fixed + SDK reserve floor relaxed (D-026). Redeployed, pushed b3717e2. Agent wallet 0xC44F… funded 5 MON. |
| 15:53 | LIVE E2E PASS on testnet (requests #2, #3 settled; split exact). Demo agent ran; Gemini 503s → cancel+refund worked. SDK no-retry-on-cancel + server transient retry (D-027). |

## Rubric checklist
### Basic (50)
- [x] Forked official starter repo, renamed (10)
- [x] Proper README: description, setup, live URL, contract address (10)
- [x] Contract deployed on Monad testnet (20) — `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1`
- [x] Publicly hosted app (10) — https://quotagrid.vercel.app
### Advance — Project working (50)
- [x] All announced features work (20) — live: list → quote → escrow → execute → settle/refund; agent flow; cancel+refund on provider failure
- [ ] Live on-chain tx during demo (10)
- [x] Contract verified on explorer (10) — Sourcify `match`
- [x] Reproducible README (10) — quickstart for contracts / web / sdk
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
| Web UI (market, sell, buy, activity, agents) | ui-core/buy/sell/pages + ui-core-fix1 | done — tsc 0 errors, build OK |
| Agent SDK / proxy / MCP / demo agent | agy `sdk` → `sdk-fix1` (boost) | done — 18/18 tests (rerun by supervisor), live `models` read OK |
| API routes (operator key, quote, execute) | agy `api` → `api-fix1` | done — D-013 multi-turn payload, crypto self-test PASS |
| Deploy testnet + verify | supervisor | done — deployed + Sourcify verified (D-019) |
| Host on Vercel | supervisor | done — https://quotagrid.vercel.app (smoke-tested, D-024) |
| README | agy `readme` + supervisor fixes | done — live URL filled, CLI commands corrected to `node dist/cli.js` (package not on npm), Node >= 22.12 |

## Needs from the user
- (done) Deployer + operator funded, 5 MON each.
- An AI provider API key for the demo seller listing.
