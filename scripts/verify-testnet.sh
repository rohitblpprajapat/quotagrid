#!/usr/bin/env bash
# Reads deployed QuotaGrid state and verifies source on Sourcify (Monad testnet, per docs.monad.xyz/guides/verify-smart-contract/foundry.md).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source <(tr -d '\r' < .env); set +a
C="${1:?contract address}"; R=https://testnet-rpc.monad.xyz; B="$HOME/.foundry/bin"
echo "owner:    $("$B/cast" call "$C" 'owner()(address)' --rpc-url $R)"
echo "operator: $("$B/cast" call "$C" 'operator()(address)' --rpc-url $R)"
echo "feeBps:   $("$B/cast" call "$C" 'feeBps()(uint16)' --rpc-url $R)"
cd contracts
"$B/forge" verify-contract "$C" src/QuotaGrid.sol:QuotaGrid \
  --chain 10143 --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/ \
  --constructor-args "$("$B/cast" abi-encode 'constructor(address,uint16)' "$OPERATOR_ADDRESS" 250)" --watch
