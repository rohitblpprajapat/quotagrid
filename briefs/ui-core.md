## Goal
Write the shared foundation of the QuotaGrid web UI that three other workers build pages on, in parallel.

## Context
Read `briefs/ui-shared.md` (the contract — implement EVERY export listed under "Exports owned by ui-core" with the exact
names/signatures), `briefs/interface.md`, `sdk/src/payload.ts`, and the existing server files
`web/src/lib/server/payload-validate.ts` (read-only) so `buildPayload` output passes it.

## Do
Create/overwrite exactly these files:
`web/src/lib/abi.ts`, `web/src/lib/chain.ts`, `web/src/lib/types.ts`, `web/src/lib/payload.ts`, `web/src/lib/format.ts`,
`web/src/lib/api.ts`, `web/src/lib/encrypt.ts`, `web/src/lib/wagmi.ts`, `web/src/app/providers.tsx`,
`web/src/app/layout.tsx` (Providers + Header + Footer, metadata title "QuotaGrid — sell unused AI quota on Monad",
fonts via `next/font/google`: a clean sans + a mono), `web/src/app/globals.css` (Tailwind v4 + @theme tokens from the
visual direction), `web/src/hooks/useListings.ts`, `web/src/components/ui.tsx`, `web/src/components/TxLink.tsx`,
`web/src/components/ReserveWarning.tsx`, `web/src/components/ConnectButton.tsx`, `web/src/components/Header.tsx`,
`web/src/components/Footer.tsx`, `web/.env.example` (all vars from interface.md, empty values, comments).

## Rules
Only those files. Don't run commands (Windows host). Don't touch `web/src/app/page.tsx` or any page route.

## Done when
All files written, exports match ui-shared.md exactly. Report the export list per file.
