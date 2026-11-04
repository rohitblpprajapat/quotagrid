## Goal
Fact-check, from LIVE sources fetched now, every Monad chain fact the build needs. Output: `docs/research/monad.md`.
Nothing from memory: every line needs a source URL you fetched in this run (curl/wget) and a short quoted snippet.

## Do
1. Fetch the official Monad docs (start at https://docs.monad.xyz and follow links; try `curl -sL`, and the docs'
   `llms.txt` / `llms-full.txt` if they exist). Find and record:
   - Testnet: chain id, public RPC URL(s), explorer URL(s), faucet, native currency symbol.
   - Mainnet: chain id, RPC, explorer.
   - Block time / finality numbers as stated by the docs.
   - Gas model differences (is gas charged on gas limit? any reserve-balance rule that affects sending value?).
   - Supported EVM version / Solidity compiler settings recommended for deploying (e.g. evm_version), contract size limit.
   - How to deploy with Foundry and how to VERIFY a contract on testnet (exact `forge verify-contract` flags, verifier
     name and URL — sourcify / etherscan-compatible / blockscout — whatever the docs say). Record the exact commands.
   - Whether viem exports a `monadTestnet` chain (check https://raw.githubusercontent.com/wevm/viem/main/src/chains/index.ts
     and the chain file it points to); record its id/rpc/explorer fields.
2. Confirm live: `curl` the testnet RPC with `eth_chainId` and `eth_blockNumber` (twice, a few seconds apart) and record the
   raw responses and the decoded chain id. Same `eth_chainId` for the mainnet RPC.
3. Record the starter repo README facts: https://raw.githubusercontent.com/monad-developers/monad-blitz-devcon-mumbai/main/README.md

## Rules
- Only create `docs/research/monad.md`. Don't touch any other file.
- If a page can't be fetched or a fact isn't found, write "NOT VERIFIED" with what you tried.

## Verify
`test -s docs/research/monad.md && grep -c http docs/research/monad.md` (expect many URLs).

## Done when
`docs/research/monad.md` exists with a summary table at the top (fact | value | source URL | fetched-at time) then details.
Report the key values (testnet chain id, RPC, explorer, verify command) in your final message.
