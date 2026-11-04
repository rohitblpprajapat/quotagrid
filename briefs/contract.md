## Goal
Write, test and get ready-to-deploy the `QuotaGrid` Solidity contract with Foundry, in `contracts/`.

## Context
Read `AGENTS.md` and `briefs/interface.md` first. The interface (ABI + semantics) there is FIXED: implement exactly it.

## Do
1. Install Foundry in WSL if `forge` is missing: `curl -L https://foundry.paradigm.xyz | bash` then `~/.foundry/bin/foundryup`
   (use full path `~/.foundry/bin/forge`).
2. In `contracts/`: Foundry project (`foundry.toml`, `src/QuotaGrid.sol`, `test/QuotaGrid.t.sol`, `script/Deploy.s.sol`,
   `lib/forge-std` via `forge install foundry-rs/forge-std --no-git` or equivalent). No OpenZeppelin; write a minimal
   reentrancy guard yourself. Solidity ^0.8.24, optimizer on.
   Verified facts are in `docs/research/monad.md` (read it): Foundry >= 1.8.0 supports `network = "monad"` in
   foundry.toml; testnet chain 10143; verify via Sourcify `https://sourcify-api-monad.blockvision.org/`. Re-check the
   foundry page https://docs.monad.xyz/tooling-and-infra/toolkits/foundry.md live. For `evm_version` and other settings, fetch the live Monad docs (https://docs.monad.xyz, Foundry
   deploy/verify guide) and use what they say; put the source URL in a comment in foundry.toml. If not found, leave the
   default and say so.
3. Tests (must all pass) covering: create/update listing guards; quote rounding up; openRequest locks quota and rejects
   insufficient value / insufficient available quota / inactive listing; two requests can't oversubscribe quota; settle
   pays seller (minus fee), keeps fee, refunds buyer exactly `deposit - cost(tUsed)`, unlocks quota, updates quotaUsed;
   excess msg.value is refunded at settle; settle by non-operator reverts; tUsed > tMax reverts; double settle reverts;
   cancel refunds 100%; reclaim before delay reverts, after delay refunds; refund to a reverting-contract buyer credits
   balances instead of reverting; withdraw / withdrawFees / setFeeBps cap; fuzz test that for any tUsed <= tMax:
   sellerCredit + fee + refund == deposit.
4. `script/Deploy.s.sol`: reads env `OPERATOR_ADDRESS`, deploys `new QuotaGrid(operator, 250)`, logs the address.
5. `contracts/README.md`: build / test / deploy / verify commands (verify command per the Monad docs, with URL).

## Rules
Only create/edit files under `contracts/`. Don't touch anything else. No secrets in files.

## Verify
`cd contracts && ~/.foundry/bin/forge build && ~/.foundry/bin/forge test -vv` -> all pass. Then
`~/.foundry/bin/forge inspect QuotaGrid abi` and check every function/event in briefs/interface.md exists with the same
input types (small python3 script in /tmp). Report the result.

## Done when
Build + tests pass, ABI matches interface. Report: test count/pass, ABI check result, foundry.toml settings + source URL,
the exact verify command.
