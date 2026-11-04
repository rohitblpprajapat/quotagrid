## Goal
Finish and verify the `sdk/` package from your previous run (it ended without a report). Brief: `briefs/sdk.md` (same scope
and rules). Files already exist in `sdk/src/` (abi, cli, config, converters, core, demo-agent, fallback, index, mcp,
payload, proxy, test/).

## New facts
- QuotaGrid is deployed and verified on Monad testnet: `0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1` (chain 10143). Use it as
  the default for `QUOTAGRID_CONTRACT` in config.ts (still overridable by env).
- The web app API now takes `payload` (canonical JSON, D-013) for `/api/quote` and `/api/execute`
  (`{requestId, payload, maxOutputTokens}`); see `briefs/interface.md`. Make sure core.ts matches exactly.
- The server-side payload validator is `web/src/lib/server/payload-validate.ts` — read it and make sure `sdk/src/payload.ts`
  produces strings it accepts (last message must be role user, etc.).

## Do
1. Review every file in `sdk/src` against `briefs/sdk.md` items 1–11; complete anything missing or stubbed.
2. Write `sdk/README.md` if missing.
3. Run the Verify steps from `briefs/sdk.md` and fix until they pass. Also run a read-only live check:
   `node dist/cli.js models` with `QUOTAGRID_CONTRACT` default and `QUOTAGRID_API_URL=http://localhost:3000` — it must read
   `listingCount` from the live contract (0 listings is fine) without crashing.

## Rules
Only files under `sdk/`. Don't touch anything else. No secrets. No simulated AI answers.

## Done when
Build + tests pass, live read-only check works. Report: files, test results, the live check output, anything unverified.
