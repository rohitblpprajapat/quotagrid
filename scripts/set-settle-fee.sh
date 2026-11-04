#!/usr/bin/env bash
# Owner-only: set the per-request settle fee (wei). 0 = treasury subsidises settlement gas (D-032).
# Usage: scripts/set-settle-fee.sh <contract> <feeWei>
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source <(tr -d '\r' < .env); set +a
CAST="${CAST:-$HOME/.foundry/bin/cast}"
"$CAST" send "$1" "setSettleFee(uint256)" "$2" --rpc-url https://testnet-rpc.monad.xyz --private-key "$DEPLOYER_PRIVATE_KEY" | grep -E "^status|transactionHash"
echo "settleFee now: $("$CAST" call "$1" "settleFee()(uint256)" --rpc-url https://testnet-rpc.monad.xyz)"
