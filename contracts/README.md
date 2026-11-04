# QuotaGrid Contracts

Foundry project for `QuotaGrid` — a decentralized AI API quota marketplace on Monad Testnet.

## Architecture

- `src/QuotaGrid.sol`: Core contract implementing the fixed `QuotaGrid` ABI with native MON escrow, settlement, reentrancy protection, and quota reservation.
- `test/QuotaGrid.t.sol`: Comprehensive unit and fuzz tests covering all guards, rounding, double-spend prevention, reverting-buyer fallback, reentrancy protection, and exact settlement balance conservation.
- `script/Deploy.s.sol`: Deployment script reading `OPERATOR_ADDRESS` and deploying `QuotaGrid(operator, 250)`.

## Monad Configuration

Configured per the official Monad documentation:
- **Documentation Toolkit:** https://docs.monad.xyz/tooling-and-infra/toolkits/foundry.md
- **Foundry Monad Template:** https://raw.githubusercontent.com/monad-developers/foundry-monad/main/foundry.toml
- **Verification Guide:** https://docs.monad.xyz/guides/verify-smart-contract/foundry.md

In `foundry.toml`:
- `network = "monad"` (Enables Monad execution environment, gas model, MIP-8 page storage, and MonadTen hardfork)
- `chain_id = 10143` (Monad Testnet)
- `eth_rpc_url = "https://testnet-rpc.monad.xyz"`
- `solc_version = "0.8.24"`
- `optimizer = true` (`runs = 200`)
- `bytecode_hash = "none"`
- `evm_version`: Left to default per Monad Foundry documentation (defaults to latest Monad hardfork `MonadTen`).

---

## Commands

### 1. Build
```bash
cd contracts
~/.foundry/bin/forge build
```

### 2. Run Tests
```bash
cd contracts
~/.foundry/bin/forge test -vv
```

To run fuzz tests with custom runs:
```bash
cd contracts
~/.foundry/bin/forge test --match-test testFuzz -vv
```

### 3. Inspect ABI
```bash
cd contracts
~/.foundry/bin/forge inspect QuotaGrid abi --json
```

### 4. Deploy to Monad Testnet

Set environment variables:
```bash
export OPERATOR_ADDRESS="0x..." # Address of the operator wallet
export DEPLOYER_PRIVATE_KEY="0x..." # Deployer private key with testnet MON
```

Simulate deployment:
```bash
cd contracts
~/.foundry/bin/forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://testnet-rpc.monad.xyz
```

Broadcast deployment:
```bash
cd contracts
~/.foundry/bin/forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://testnet-rpc.monad.xyz \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY
```

### 5. Verify on Monad Testnet (Chain ID 10143)

Reference: https://docs.monad.xyz/guides/verify-smart-contract/foundry.md

#### Option A: MonadVision (Sourcify-compatible, No API Key Required)
```bash
cd contracts
~/.foundry/bin/forge verify-contract \
    <DEPLOYED_CONTRACT_ADDRESS> \
    src/QuotaGrid.sol:QuotaGrid \
    --chain 10143 \
    --verifier sourcify \
    --verifier-url https://sourcify-api-monad.blockvision.org/ \
    --constructor-args $(~/.foundry/bin/cast abi-encode "constructor(address,uint16)" <OPERATOR_ADDRESS> 250)
```

#### Option B: Monadscan (Etherscan-compatible)
```bash
cd contracts
~/.foundry/bin/forge verify-contract \
    <DEPLOYED_CONTRACT_ADDRESS> \
    src/QuotaGrid.sol:QuotaGrid \
    --chain 10143 \
    --verifier etherscan \
    --etherscan-api-key <YOUR_MONADSCAN_API_KEY> \
    --constructor-args $(~/.foundry/bin/cast abi-encode "constructor(address,uint16)" <OPERATOR_ADDRESS> 250) \
    --watch
```
