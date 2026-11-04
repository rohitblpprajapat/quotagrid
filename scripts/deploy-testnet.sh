#!/usr/bin/env bash
# Deploys QuotaGrid to Monad testnet using keys from the repo-root .env (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source <(tr -d '\r' < .env); set +a
FORGE="${FORGE:-$HOME/.foundry/bin/forge}"
cd contracts
"$FORGE" script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast
