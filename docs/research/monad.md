# Monad Chain Fact-Check & Technical Reference

> **Document purpose:** Live, fact-checked reference of Monad chain specifications, execution semantics, tooling, and deployment configurations for the QuotaGrid build at Monad Blitz Mumbai.
> **Verification policy:** Every fact in this document was fetched directly during this run from live official documentation, repositories, or RPC endpoints. No data is based on unverified memory.

---

## 1. Summary Table

| Fact | Value | Source URL | Fetched-at (UTC) |
| :--- | :--- | :--- | :--- |
| **Testnet Chain ID** | `10143` (`0x279f`) | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Network Name** | `Monad Testnet` | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Native Currency** | `MON` (18 decimals) | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Public RPC (Primary)** | `https://testnet-rpc.monad.xyz` (`wss://testnet-rpc.monad.xyz`) | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Public RPC (Ankr)** | `https://rpc.ankr.com/monad_testnet` | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Public RPC (Foundation)** | `https://rpc-testnet.monadinfra.com` (`wss://rpc-testnet.monadinfra.com`) | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Explorer (MonadVision)** | `https://testnet.monadvision.com` | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Explorer (Monadscan)** | `https://testnet.monadscan.com` | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Testnet Faucet** | `https://faucet.monad.xyz` | https://docs.monad.xyz/developer-essentials/testnet.md | 2026-11-04T07:21:04Z |
| **Mainnet Chain ID** | `143` (`0x8f`) | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Network Name** | `Monad Mainnet` | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Native Currency** | `MON` (18 decimals) | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Public RPC (Primary)** | `https://rpc.monad.xyz` (`wss://rpc.monad.xyz`) | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Public RPC (Alchemy)** | `https://rpc1.monad.xyz` (`wss://rpc1.monad.xyz`) | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Public RPC (Foundation)**| `https://rpc-mainnet.monadinfra.com` (`wss://rpc-mainnet.monadinfra.com`) | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Explorer (MonadVision)** | `https://monadvision.com` | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Mainnet Explorer (Monadscan)** | `https://monadscan.com` | https://docs.monad.xyz/developer-essentials/network-information/index.md | 2026-11-04T07:21:16Z |
| **Block Time / Frequency** | `300 ms` | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:22:14Z |
| **Speculative Finality** | `1 block (300 ms)` (Voted stage) | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:22:14Z |
| **Finality (irreversible)** | `2 blocks (600 ms)` (cannot be reorged) | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:22:14Z |
| **State Root Finality (Verified)** | `3 blocks after Finalized` (delayed state trie) | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:22:14Z |
| **Gas Charged Basis** | **Gas Limit** charged (`value + gas_price * gas_limit`) | https://docs.monad.xyz/developer-essentials/gas-pricing.md | 2026-11-04T07:22:45Z |
| **Minimum Base Fee** | `100 MON-gwei` (`100 * 10^-9 MON`) | https://docs.monad.xyz/developer-essentials/gas-pricing.md | 2026-11-04T07:22:45Z |
| **Reserve Balance Threshold** | `10 MON` (`user_reserve_balance`) | https://docs.monad.xyz/developer-essentials/reserve-balance.md | 2026-11-04T07:22:52Z |
| **Reserve Dip Violation Precompile**| `0x1001` (`dippedIntoReserve()`) | https://docs.monad.xyz/developer-essentials/precompiles.md | 2026-11-04T07:30:46Z |
| **Max Contract Size** | `128 KB` (Initcode limit: `256 KB`) | https://docs.monad.xyz/developer-essentials/differences.md | 2026-11-04T07:22:38Z |
| **Per-Transaction Gas Limit** | `30M gas` | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:21:53Z |
| **Block Gas Limit / Target** | `150M gas` limit / `120M gas` target (80%) | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:21:53Z |
| **Supported EVM Version / Opcodes** | Fusaka fork compatible (`0x01` to `0x11` + P256 `0x0100` + Staking `0x1000` + Reserve `0x1001`) | https://docs.monad.xyz/developer-essentials/summary.md | 2026-11-04T07:21:53Z |
| **Foundry Monad Network Flag** | `network = "monad"` (requires Foundry >= 1.8.0) | https://docs.monad.xyz/tooling-and-infra/toolkits/foundry.md | 2026-11-04T07:23:04Z |
| **Foundry Hardfork Setting** | `hardfork = "monad:MonadTen"` (or auto-detected from chain ID) | https://docs.monad.xyz/tooling-and-infra/toolkits/foundry.md | 2026-11-04T07:23:04Z |
| **Testnet Verifier (Sourcify)** | `https://sourcify-api-monad.blockvision.org/` | https://docs.monad.xyz/guides/verify-smart-contract/foundry.md | 2026-11-04T07:23:53Z |
| **Testnet Verifier (Monadscan)** | `https://api-testnet.monadscan.com/api` | https://docs.monad.xyz/tooling-and-infra/block-explorers.md | 2026-11-04T07:30:05Z |
| **Viem Testnet Chain Export** | `monadTestnet` (`id: 10_143`) | https://raw.githubusercontent.com/wevm/viem/main/src/chains/index.ts | 2026-11-04T07:25:58Z |
| **Viem Mainnet Chain Export** | `monad` (`id: 143`) | https://raw.githubusercontent.com/wevm/viem/main/src/chains/index.ts | 2026-11-04T07:25:58Z |
| **Starter Repo Hackathon Link** | Fork repo & submit via `https://blitz.devnads.com` | https://raw.githubusercontent.com/monad-developers/monad-blitz-devcon-mumbai/main/README.md | 2026-11-04T07:19:54Z |

---

## 2. Testnet Details

* **Source URL:** https://docs.monad.xyz/developer-essentials/testnet.md
* **Quote:**
  > "Chain ID: `10143`"
  > "Network Name: `Monad Testnet`"
  > "Currency Symbol: `MON`"
  > "Block Explorer (MonadVision): https://testnet.monadvision.com"
  > "Block Explorer (Monadscan): https://testnet.monadscan.com"
  > "Faucet: https://faucet.monad.xyz"
  > "Current version / revision: `v0.16.5` / `MONAD_TEN`"

### Public RPC Endpoints
From https://docs.monad.xyz/developer-essentials/testnet.md:
* **QuickNode:** `https://testnet-rpc.monad.xyz` / `wss://testnet-rpc.monad.xyz` (50 rps, 100 batch limit, archive support: Yes)
* **Ankr:** `https://rpc.ankr.com/monad_testnet` (300 reqs / 10s, batch limit 100, archive: No)
* **Monad Foundation:** `https://rpc-testnet.monadinfra.com` / `wss://rpc-testnet.monadinfra.com` (20 rps, batch requests not allowed, archive: Yes)

### Canonical Testnet Contracts
* **Wrapped MON (`WMON`):** `0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541`
* **CreateX:** `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`
* **Foundry Deterministic Deployer:** `0x4e59b44847b379578588920ca78fbf26c0b4956c`
* **Multicall3:** `0xcA11bde05977b3631167028862bE2a173976CA11`
* **Permit2:** `0x000000000022d473030f116ddee9f6b43ac78ba3`
* **SafeSingletonFactory:** `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`

---

## 3. Mainnet Details

* **Source URL:** https://docs.monad.xyz/developer-essentials/network-information/index.md
* **Quote:**
  > "Network Name: `Monad Mainnet`"
  > "Chain ID: `143`"
  > "Currency Symbol: `MON`"
  > "Block Explorer (MonadVision): https://monadvision.com"
  > "Block Explorer (Monadscan): https://monadscan.com"
  > "Current version / revision: `v0.16.4` / `MONAD_TEN`"

### Public RPC Endpoints
From https://docs.monad.xyz/developer-essentials/network-information/index.md:
* **QuickNode:** `https://rpc.monad.xyz` / `wss://rpc.monad.xyz` (25 rps, batch call limit 100)
* **Alchemy:** `https://rpc1.monad.xyz` / `wss://rpc1.monad.xyz` (15 rps, batch call limit 100)
* **Goldsky Edge:** `https://rpc2.monad.xyz` (300 per 10s, batch call limit 10)
* **Ankr:** `https://rpc3.monad.xyz` / `wss://rpc3.monad.xyz` (300 per 10s, batch call limit 10)
* **Monad Foundation:** `https://rpc-mainnet.monadinfra.com` / `wss://rpc-mainnet.monadinfra.com` (20 rps, batch call limit 1)

### Canonical Mainnet Contracts
* **Wrapped MON (`WMON`):** `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`
* **CreateX:** `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`
* **Multicall3:** `0xcA11bde05977b3631167028862bE2a173976CA11`
* **Permit2:** `0x000000000022d473030f116ddee9f6b43ac78ba3`
* **SafeSingletonFactory:** `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`

---

## 4. Block Time, Finality & Consensus Mechanics

* **Source URL:** https://docs.monad.xyz/developer-essentials/summary.md
* **Quotes:**
  > "Block frequency: `300 ms`"
  > "`TIMESTAMP` opcode: As in Ethereum, `TIMESTAMP` is a second-granularity unix timestamp. Since blocks are every 300 ms, this means that 3-4 blocks will likely have the same timestamp."
  > "Finality: Blocks are finalized after two blocks (600 ms). Once a block is finalized, it cannot be reorged."
  > "Speculative finality: Blocks can be speculatively finalized after one block (300 ms), when it is marked as being in the `Voted` stage."
  > "Asynchronous execution is a technique that allows Monad to substantially increase execution throughput by decoupling consensus from execution. In asynchronous execution, validators **vote first, execute later**... There is a delayed merkle root three blocks later which confirms that the network got the same state trie as local execution."
  > "Developers with significant off-chain financial logic (e.g. exchanges, bridges, and stablecoin/RWA issuers) should wait until blocks reach the `Verified` phase (aka state root finality), three blocks later than `Finalized`..."

---

## 5. Gas Model & Pricing Differences

* **Source URL:** https://docs.monad.xyz/developer-essentials/gas-pricing.md
* **Quotes:**
  > "In Monad, the gas charged for a transaction is the gas limit set in the transaction, rather than the gas used in the course of execution."
  > "This is a design decision to support asynchronous execution. Under asynchronous execution, leaders build blocks (and validators vote on block validity) prior to executing. If the protocol charged `gas_used`, a user could submit a transaction with a large `gas_limit` that actually consumes very little gas. This transaction would take up a lot of space toward the block gas limit but wouldn't pay very much for taking up that space, opening up a DOS vector."
  > "`gas_paid = gas_limit * price_per_gas`"
  > "`min_base_price_per_gas = 100 MON-gwei (100 * 10^-9 MON)`"
  > "Per-transaction gas limit: `30M gas`"
  > "Block gas limit: `150M gas`"

### Storage Page Repricing (MIP-8)
* **Source URL:** https://docs.monad.xyz/developer-essentials/differences.md
* **Quotes:**
  > "Storage slots are grouped into pages of 128 consecutive slots. Access is warmed per page rather than per slot: the first `SLOAD` or `SSTORE` to a page pays the cold cost, and every other slot of that page is warm for the rest of the transaction."
  > "Cold access cost - account: Ethereum 2,600 vs Monad 10,100"
  > "Cold access cost - storage: Ethereum 2,100 per slot vs Monad 8,100 per 128-slot page"
  > "`SSTORE` write and state growth: Monad 2,800 first write per page + 17,000 per net new slot in a page"
  > "Memory expansion cost: Ethereum `3*w + w^2/512` vs Monad `w/2` (capped at 8 MB per tx)"

---

## 6. Reserve Balance Rules & EIP-7702

* **Source URL:** https://docs.monad.xyz/developer-essentials/reserve-balance.md
* **Quotes:**
  > "The Reserve Balance mechanism is a set of light constraints - at consensus time on which transactions can be **included**, and at execution time on which transactions **don't revert** - which allow Monad to simultaneously support asynchronous execution and EIP-7702."
  > "Parameter: `user_reserve_balance = 10 MON`"
  > "*Execution time*: during execution, transactions revert due to **value spend** when that account's ending balance (before refunds) dips below `user_reserve_balance`, except in certain circumstances [emptying transactions]."
  > "*Consensus time*: For each account, consensus has a budget for the **gas spend** for all inflight transactions; this budget is `user_reserve_balance` (or the account's balance from the lagged execution state, whichever is lower)."
  > "If an EOA is EIP-7702-delegated, its balance cannot be lowered below 10 MON due to the Reserve Balance rules."
  > "If an EOA is EIP-7702-delegated, when it is called as a smart contract, the `CREATE` and `CREATE2` opcodes are banned."

* **Reserve Check Precompile (`0x1001`):**
  * **Source URL:** https://docs.monad.xyz/developer-essentials/precompiles.md
  * **Quote:**
    > "Address `0x1001` exposes a single method, `dippedIntoReserve()` (selector `0x3a61584e`, gas cost `100`), which returns a `bool` indicating whether the current execution state is in reserve balance violation... `dippedIntoReserve()` must be invoked via `CALL`. Invoking it via `STATICCALL` - or via `DELEGATECALL` or `CALLCODE` - reverts."

---

## 7. EVM Compatibility, Compiler Settings & Limits

* **Source URL:** https://docs.monad.xyz/developer-essentials/summary.md
* **Quotes:**
  > "All opcodes as of the Fusaka fork are supported."
  > "All Ethereum precompiles as of the Fusaka fork (`0x01` to `0x11`), plus P256 signature verification at `0x0100` (EIP-7951) and the staking precompile at `0x1000`."
  > "Max contract size: `128 kb` (up from 24.5 kb in Ethereum)"
  > "Transaction types supported: 0 (legacy), 1 (EIP-2930), 2 (EIP-1559), 4 (EIP-7702). Not supported: 3 (EIP-4844 blobs)."

* **Source URL:** https://docs.monad.xyz/developer-essentials/differences.md
* **Quote:**
  > "The maximum contract code size limit is 128 KB (up from 24 KB in Ethereum). Consequently, the max init code size limit is 256 KB (up from 48 KB in Ethereum)."

### Solidity / Foundry Compiler Settings
* **Source URL:** https://raw.githubusercontent.com/monad-developers/foundry-monad/main/foundry.toml
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
metadata = true
metadata_hash = "none"        # disable ipfs
use_literal_content = true   # use source code

# Monad Testnet Configuration
eth-rpc-url = "https://testnet-rpc.monad.xyz"
chain_id = 10143
network = "monad"
```

---

## 8. Foundry Tooling, Deployment & Verification

* **Source URL:** https://docs.monad.xyz/tooling-and-infra/toolkits/foundry.md
* **Quotes:**
  > "Foundry v1.8 or later includes first-class Monad execution support across Forge, Anvil, Cast, Chisel, traces, and cheatcodes."
  > "Set the execution network in your project's `foundry.toml`: `[profile.default] network = \"monad\"`"
  > "Local Monad execution defaults to the latest supported Monad hardfork, currently `MonadTen`."

### Deployment Commands
* **Source URL:** https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
* **Keystore deploy (Recommended):**
  ```bash
  cast wallet import monad-deployer --private-key $(cast wallet new | grep 'Private key:' | awk '{print $3}')
  forge create src/Counter.sol:Counter --account monad-deployer --broadcast
  ```
* **Direct Private Key deploy:**
  ```bash
  forge create --private-key <your_private_key> src/Counter.sol:Counter --broadcast
  ```

### Verification Commands on Monad Testnet (Chain ID 10143)
* **Source URL:** https://docs.monad.xyz/guides/verify-smart-contract/foundry.md
* **Source URL:** https://docs.monad.xyz/tooling-and-infra/block-explorers.md

1. **Option 1: MonadVision (Sourcify-compatible, No API Key needed)**
   ```bash
   forge verify-contract \
       <contract_address> \
       <contract_name> \
       --chain 10143 \
       --verifier sourcify \
       --verifier-url https://sourcify-api-monad.blockvision.org/
   ```

2. **Option 2: Monadscan (Etherscan-compatible)**
   ```bash
   forge verify-contract \
       <contract_address> \
       <contract_name> \
       --chain 10143 \
       --verifier etherscan \
       --etherscan-api-key <YOUR_API_KEY> \
       --watch
   ```
   *Note:* The underlying verifier endpoint for testnet Monadscan is `https://api-testnet.monadscan.com/api` (as confirmed in `tooling-and-infra/block-explorers.md`).

---

## 9. Viem Chain Exports

* **Source URL:** https://raw.githubusercontent.com/wevm/viem/main/src/chains/index.ts
* **Quote:**
  ```typescript
  export { monad } from './definitions/monad.js'
  export { monadTestnet } from './definitions/monadTestnet.js'
  ```

### Viem `monadTestnet` Definition
* **Source URL:** https://raw.githubusercontent.com/wevm/viem/main/src/chains/definitions/monadTestnet.ts
* **Fields:**
  - `id`: `10_143`
  - `name`: `'Monad Testnet'`
  - `blockTime`: `300`
  - `nativeCurrency`: `{ name: 'Testnet MON Token', symbol: 'MON', decimals: 18 }`
  - `rpcUrls.default.http`: `['https://testnet-rpc.monad.xyz']`
  - `blockExplorers.default`: `{ name: 'Monad Testnet explorer', url: 'https://testnet.monadexplorer.com' }`
  - `contracts.multicall3`: `{ address: '0xcA11bde05977b3631167028862bE2a173976CA11', blockCreated: 251449 }`
  - `testnet`: `true`

### Viem `monad` (Mainnet) Definition
* **Source URL:** https://raw.githubusercontent.com/wevm/viem/main/src/chains/definitions/monad.ts
* **Fields:**
  - `id`: `143`
  - `name`: `'Monad'`
  - `blockTime`: `300`
  - `nativeCurrency`: `{ name: 'Monad', symbol: 'MON', decimals: 18 }`
  - `rpcUrls.default.http`: `['https://rpc.monad.xyz', 'https://rpc1.monad.xyz']`
  - `rpcUrls.default.webSocket`: `['wss://rpc.monad.xyz', 'wss://rpc1.monad.xyz']`
  - `blockExplorers.default`: `{ name: 'Monadscan', url: 'https://monadscan.com', apiUrl: 'https://api.etherscan.io/v2/api?chainid=143' }`
  - `blockExplorers.monadvision`: `{ name: 'MonadVision', url: 'https://monadvision.com' }`
  - `contracts.multicall3`: `{ address: '0xcA11bde05977b3631167028862bE2a173976CA11', blockCreated: 9248132 }`
  - `testnet`: `false`

---

## 10. Live RPC Query Results

Direct JSON-RPC calls executed live using `curl` against official public endpoints:

### A. Testnet RPC (`https://testnet-rpc.monad.xyz`)

1. **`eth_chainId`:**
   - **Command:** `curl -s -X POST https://testnet-rpc.monad.xyz -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`
   - **Timestamp:** `2026-11-04T07:32:43Z`
   - **Raw Response:**
     ```json
     {"result":"0x279f","id":1,"jsonrpc":"2.0"}
     ```
   - **Decoded Chain ID:** `0x279f` = `10143` (Decimal)

2. **`eth_blockNumber` (Sample 1):**
   - **Command:** `curl -s -X POST https://testnet-rpc.monad.xyz -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
   - **Timestamp:** `2026-11-04T07:32:48Z`
   - **Raw Response:**
     ```json
     {"jsonrpc":"2.0","result":"0x494c1da","id":1}
     ```
   - **Decoded Block Number:** `0x494c1da` = `76861914`

3. **`eth_blockNumber` (Sample 2, taken ~7s later):**
   - **Command:** `curl -s -X POST https://testnet-rpc.monad.xyz -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
   - **Timestamp:** `2026-11-04T07:32:55Z`
   - **Raw Response:**
     ```json
     {"jsonrpc":"2.0","result":"0x494c208","id":1}
     ```
   - **Decoded Block Number:** `0x494c208` = `76861960`
   - **Observation:** Advanced 46 blocks in ~7 seconds (avg ~152 ms/block during batch progression, matching high throughput sub-second execution).

4. **Secondary Endpoint Confirmation (`https://rpc-testnet.monadinfra.com`):**
   - **Timestamp:** `2026-11-04T07:29:23Z`
   - **Raw Response:** `{"jsonrpc":"2.0","result":"0x279f","id":1}`
   - **Decoded Chain ID:** `10143`

### B. Mainnet RPC (`https://rpc.monad.xyz`)

1. **`eth_chainId`:**
   - **Command:** `curl -s -X POST https://rpc.monad.xyz -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`
   - **Timestamp:** `2026-11-04T07:33:07Z`
   - **Raw Response:**
     ```json
     {"jsonrpc":"2.0","id":1,"result":"0x8f"}
     ```
   - **Decoded Chain ID:** `0x8f` = `143` (Decimal)

2. **`eth_blockNumber`:**
   - **Command:** `curl -s -X POST https://rpc.monad.xyz -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
   - **Timestamp:** `2026-11-04T07:33:15Z`
   - **Raw Response:**
     ```json
     {"jsonrpc":"2.0","id":1,"result":"0x71be3a7"}
     ```
   - **Decoded Block Number:** `0x71be3a7` = `119268263`

3. **Secondary Endpoint Confirmation (`https://rpc-mainnet.monadinfra.com`):**
   - **Timestamp:** `2026-11-04T07:29:31Z`
   - **Raw Response:** `{"id":1,"result":"0x8f","jsonrpc":"2.0"}`
   - **Decoded Chain ID:** `143`

---

## 11. Starter Repo Facts

* **Source URL:** https://raw.githubusercontent.com/monad-developers/monad-blitz-devcon-mumbai/main/README.md
* **Key Requirements & Workflow:**
  1. Fork the template repo `monad-developers/monad-blitz-devcon-mumbai` (branch `main`).
  2. Set project name and one-liner description.
  3. All code modifications are to be made within the forked repository.
  4. Submit final project via the **Blitz Portal**: `https://blitz.devnads.com`.
