## Goal
Your previous run timed out before writing the shared components. Write ONLY these 6 missing files now, quickly:
`web/src/components/ui.tsx`, `web/src/components/TxLink.tsx`, `web/src/components/ReserveWarning.tsx`,
`web/src/components/ConnectButton.tsx`, `web/src/components/Header.tsx`, `web/src/components/Footer.tsx`.

## Context
Spec: `briefs/ui-shared.md`. The pages that use them already exist — grep `web/src/app` and `web/src/components` for every
usage of these components and make the props compatible with how they are actually used (e.g. `Input`/`Textarea`/`Select`
must forward all native props incl. `onChange` typed as React.ChangeEvent; `Button` takes `variant`, `loading`, native
button props; `Stat` {label, value, hint?}; `Field` {label, hint?, children}; `Badge` accepts children + optional `tone`;
`Mono` span; `Card` div with className passthrough). Existing libs to use: `@/lib/chain` (explorerTx, explorerAddress,
CONTRACT_ADDRESS, monad), `@/lib/format` (formatMON, shortAddr, shortHash), wagmi v2 hooks (`useAccount`, `useConnect`,
`useDisconnect`, `useBalance`, `useSwitchChain`, `useChainId`), `injected` from `wagmi/connectors`.
- ConnectButton: connect via injected; when connected show short address + MON balance + disconnect; if chainId !==
  monad.id show "Switch to Monad Testnet" (useSwitchChain; wallets add the chain automatically on 4902 via wagmi).
- ReserveWarning: amber notice if connected balance < 10.5 MON (Monad 10 MON reserve rule).
- Header: logo text "QuotaGrid", nav links Market (/market), Sell (/sell), Agents (/agents), Activity (/activity) with
  active state (usePathname), ConnectButton; responsive.
- Footer: contract address link (explorerAddress), "Verified on Sourcify", "Monad Testnet · chain 10143".

## Rules
Only those 6 files. Windows host: don't run commands. Be fast — keep each file small and correct.

## Done when
6 files written; report the exported names and props.
