# QuotaGrid

**Demo video (42 s):** [`docs/video/quotagrid-demo.mp4`](docs/video/quotagrid-demo.mp4), rendered from [`docs/video/quotagrid-demo.html`](docs/video/quotagrid-demo.html). Settlement numbers in it come from the live testnet request #1 on contract v2.


**Decentralized AI API quota marketplace on Monad with exact token-level escrow and settlement.**

`Monad Testnet (Chain ID 10143)` · `Contract Verified on Sourcify` · `Live App: https://quotagrid.vercel.app`

---

## Overview

QuotaGrid is a decentralized marketplace on Monad where developers and autonomous AI agents buy and sell unused AI API quota (Google Gemini, Anthropic Claude, and Llama via Groq) without exposing API keys.

The buyer escrows the worst-case token cost ($T_{\text{max}}$) in native MON on Monad. The operator executes the model completion and settles the escrow on-chain with the exact tokens consumed ($T_{\text{used}}$). The seller is paid $\text{cost}(T_{\text{used}})$ minus a 2.5% protocol fee, and the buyer is refunded the difference ($\text{deposit} - \text{cost}(T_{\text{used}})$) in the very same settlement transaction.

---

## Key Links

| Resource | Value / Link |
| :--- | :--- |
| **Live Web App** | `https://quotagrid.vercel.app` |
| **Deployed Contract** | [`0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630`](https://testnet.monadvision.com/address/0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630) |
| **Deployment Transaction** | [`0x14efce9ca1fb0ad9a58ea90517d0878ab4d88c6037d7432915e8d90cfeb898c4`](https://testnet.monadvision.com/tx/0x14efce9ca1fb0ad9a58ea90517d0878ab4d88c6037d7432915e8d90cfeb898c4) |
| **Contract Verification** | [Sourcify Match Job `beda484b-eade-40f9-8ff7-a9e88a157756`](https://sourcify-api-monad.blockvision.org/verify-ui/jobs/beda484b-eade-40f9-8ff7-a9e88a157756) |
| **Monad Testnet Explorer** | [MonadVision](https://testnet.monadvision.com/address/0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630) |
| **Demo Video** | [https://youtu.be/Pb3VDOos478?si=u9s1b7dbv18gHvts](https://youtu.be/Pb3VDOos478?si=u9s1b7dbv18gHvts) |
| **Advertisement Video** | [https://youtu.be/gjikWjG_wg8?si=LrkvTDhCIjNt4zVJ](https://youtu.be/gjikWjG_wg8?si=LrkvTDhCIjNt4zVJ) |
| **Source Repository** | [github.com/rohitblpprajapat/quotagrid](https://github.com/rohitblpprajapat/quotagrid) |
| **Contract Owner** | `0xF01D4dDF483F0c125df2C9cdf72485356798b179` |
| **Contract Operator** | `0xE959Fdd4f6E50F553C762260e0398332c438C8aA` |
| **Protocol Fee** | 250 bps (2.5%) |

---

## The Problem

1. **Mid-way Token Exhaustion:** Autonomous AI agents and developers hit API rate limits (`HTTP 429`, `RESOURCE_EXHAUSTED`, insufficient quota) mid-execution, terminating complex agentic loops and production tasks without recourse.
2. **All-or-Nothing Escrows:** Traditional crypto escrow systems charge upfront flat amounts based on worst-case token allowances ($T_{\text{max}}$). Because LLMs produce variable output lengths, buyers are systematically overcharged or capital is locked indefinitely.
3. **Key and Prompt Exposure:** Selling excess API quota traditionally requires sharing plaintext API keys or routing sensitive prompts through untrusted, custodial middleman proxies.
4. **Expiring Unused Quota:** Tiered enterprise and developer subscriptions grant monthly API quota that expires at billing renewal if not consumed, turning prepaid capacity into dead loss.

---

## How It Works

### Architecture & Lifecycle Flow

```text
 Buyer / Agent                     Monad Contract                      Operator API                   AI Provider
  (Human / SDK)                   (QuotaGrid.sol)                     (Next.js Server)             (Gemini/Claude/Groq)
       |                                |                                    |                              |
       | 1. openRequest(listing,T_max)  |                                    |                              |
       |------------------------------->|                                    |                              |
       |    [Escrows MON deposit]       |                                    |                              |
       |    [Locks T_max quota]         |                                    |                              |
       |    [Stores promptHash]         |                                    |                              |
       |                                |                                    |                              |
       | 2. POST /api/execute (requestId, payload, maxOutputTokens)          |                              |
       |-------------------------------------------------------------------->|                              |
       |                                |                                    |                              |
       |                                | 3. getRequest & getListing         |                              |
       |                                |<-----------------------------------|                              |
       |                                |    [Verify Open & promptHash]      |                              |
       |                                |----------------------------------->|                              |
       |                                |                                    |                              |
       |                                |                                    | 4. Decrypt seller key in RAM |
       |                                |                                    |    [RSA-OAEP 2048 / SHA-256] |
       |                                |                                    |                              |
       |                                |                                    | 5. Call model (output cap)   |
       |                                |                                    |----------------------------->|
       |                                |                                    | 6. Response + exact usage    |
       |                                |                                    |<-----------------------------|
       |                                |                                    |                              |
       |                                | 7. settle(requestId, T_used)       |                              |
       |                                |<-----------------------------------|                              |
       |                                |    [Seller += cost(T_used) - fee]  |                              |
       |                                |    [Protocol += fee (2.5%)]        |                              |
       |                                |    [Buyer refunded deposit - cost] |                              |
       | 8. Refund auto-credited        |    [Unused quota unlocked]         |                              |
       |<===============================|                                    |                              |
       |                                                                     |                              |
       | 9. HTTP Response { output, tUsed, settleTx, refund }                |                              |
       |<--------------------------------------------------------------------|                              |
```

### Mathematical Formulas

- **Token Cost Formula:**
  $$\text{cost}(T) = \left\lceil \frac{T \times \text{pricePerKToken}}{1000} \right\rceil \quad (\text{in wei})$$

- **Worst-Case Escrow Deposit:**
  $$\text{deposit} \ge \text{cost}(T_{\text{max}})$$
  Where $T_{\text{max}} = T_{\text{input}} + T_{\text{max\_output}}$.

- **Settlement Distribution:**
  $$\text{costUsed} = \text{cost}(T_{\text{used}})$$
  $$\text{fee} = \left\lfloor \frac{\text{costUsed} \times \text{feeBps}}{10000} \right\rfloor \quad (\text{where } \text{feeBps} = 250, \text{ i.e. } 2.5\%)$$
  $$\text{sellerPayout} = \text{costUsed} - \text{fee}$$
  $$\text{buyerRefund} = \text{deposit} - \text{costUsed}$$

- **Conservation Invariant:**
  $$\text{sellerPayout} + \text{fee} + \text{buyerRefund} \equiv \text{deposit}$$
  *(Verified by 256-run fuzz testing in Foundry test suite).*

### Lifecycle States

| Status | Code | Meaning |
| :--- | :---: | :--- |
| `None` | `0` | Request does not exist. |
| `Open` | `1` | Buyer deposited MON, quota is reserved, awaiting execution. |
| `Settled` | `2` | Operator submitted verified $T_{\text{used}}$, seller credited, fee accrued, buyer refunded surplus. |
| `Cancelled` | `3` | Provider call failed or rejected; 100% of deposit returned to buyer and reserved quota released. |
| `Reclaimed` | `4` | Operator timed out (> 10 minutes); buyer called `reclaim(requestId)` directly on-chain for 100% refund. |

---

## Two Core User Flows

### 1. Human Web Flow

- **Marketplace Discovery:** Buyers inspect live listings on Monad testnet, filtering by provider (Gemini, Claude, Groq), model, price per 1,000 tokens, and available quota.
- **Pay & Run:** Select a model, input prompt and parameters, and review the cost quote. A single wallet confirmation deposits $T_{\text{max}}$ MON into `openRequest`. The operator API verifies prompt hash binding, executes against the provider, and triggers on-chain settlement. Surplus MON is refunded immediately into the buyer's wallet.
- **Selling Quota:** Sellers input their provider API key in the browser. The frontend retrieves the operator's RSA public key (`GET /api/operator-key`), encrypts the key client-side with RSA-OAEP SHA-256 via WebCrypto, then **checks the key before listing**: it sends the ciphertext to `POST /api/validate-listing`, where the server decrypts it in RAM and makes one tiny real call on the chosen model. An invalid key, unknown model or exhausted quota blocks the listing with a clear reason (D-029). Only then does it write the listing to Monad via `createListing`. Plaintext keys never touch the network or any server. Sellers manage active status, replenish quota, and withdraw earnings on demand (`withdraw()`).

### 2. Token-Aware Autonomous AI Agents

QuotaGrid provides a complete TypeScript SDK (`quotagrid`) allowing AI agents to treat on-chain quota as an autonomous failover utility.

- **Proactive & Reactive Fallback Wrapper (`withQuotaGridFallback`):**
  Wraps existing provider clients. Automatically routes calls to QuotaGrid on Monad when an agent's internal token budget drops below a threshold, or reactively upon receiving `HTTP 429` / quota exhaustion errors from the primary provider.
- **Local Drop-In Proxy (`quotagrid proxy`):**
  Runs locally on the agent's machine (`127.0.0.1:8787`), exposing standard OpenAI-compatible (`POST /v1/chat/completions`) and Gemini-compatible (`POST /v1beta/models/{model}:generateContent`) endpoints. Holds the agent's private key locally, signs on-chain Monad escrows non-custodially, and forwards completions transparently.
- **Model Context Protocol (MCP) Server (`quotagrid mcp`):**
  Stdio MCP server exposing `quotagrid_list_models`, `quotagrid_complete`, and `quotagrid_wallet` to MCP-compatible IDEs and assistants (Claude Desktop, Claude Code, Cursor).
- **Autonomous Demo Agent (`quotagrid demo-agent`):**
  Executes a multi-turn task with a mock or limited primary budget, demonstrates proactive switching to Monad testnet, and outputs live on-chain transaction receipts.

---

## Why Monad?

Per-call micro-escrow and settlement is economically and technically impractical on legacy chains. QuotaGrid leverages Monad's architecture:

- **300 ms Block Time:** Real-time on-chain escrow creation and settlement that matches interactive LLM latency without blocking agent execution loops ([Monad Architecture Summary](https://docs.monad.xyz/developer-essentials/summary.md)).
- **Sub-Second Finality (2 Blocks / 600 ms):** Irreversible block finality after 2 blocks guarantees that token payouts and buyer refunds cannot be reorged before returning output ([Monad Consensus](https://docs.monad.xyz/developer-essentials/summary.md)).
- **Sub-Cent Gas Fees:** Minimum base fee of 100 MON-gwei ([Monad Gas Pricing](https://docs.monad.xyz/developer-essentials/gas-pricing.md)) ensures that opening and settling an escrow incurs minimal overhead.
- **Asynchronous Execution & Gas Limits:** Monad validator execution is decoupled from consensus. Monad charges transaction gas on the declared `gas_limit` ([Gas Pricing Mechanics](https://docs.monad.xyz/developer-essentials/gas-pricing.md)), preventing DoS while maintaining deterministic throughput.
- **10 MON Reserve Balance Enforcement:** Protocol client-side tooling respects Monad's consensus and execution reserve rule (`user_reserve_balance = 10 MON`, [Reserve Balance](https://docs.monad.xyz/developer-essentials/reserve-balance.md)), warning buyers and enforcing safe wallet thresholds before submitting transactions.

---

## Repository Layout

```text
quotagrid/
├── contracts/               # Foundry smart contracts project
│   ├── src/
│   │   └── QuotaGrid.sol    # Core escrow, listing, and settlement contract
│   ├── test/
│   │   └── QuotaGrid.t.sol  # 17 Foundry unit and fuzz invariant tests
│   ├── script/
│   │   └── Deploy.s.sol     # Deployment script reading OPERATOR_ADDRESS
│   └── foundry.toml         # Configured for Monad network & MonadTen hardfork
├── web/                     # Next.js 16 (App Router, TypeScript, Tailwind CSS)
│   ├── src/
│   │   ├── app/             # App Router pages (Market, Buy, Sell, Activity, Agents)
│   │   │   └── api/         # API routes (/api/operator-key, /api/quote, /api/execute)
│   │   ├── components/      # Modular UI components & web3 providers
│   │   └── lib/             # Shared ABI, chain definitions, and server crypto
│   └── scripts/
│       └── gen-operator-keys.mjs  # Generates RSA-2048 PKCS#8 keypair for operator
├── sdk/                     # Autonomous agent package (quotagrid on npm)
│   ├── src/
│   │   ├── core.ts          # QuotaGridClient (read listings, open, execute, settle)
│   │   ├── fallback.ts      # withQuotaGridFallback wrapper (proactive + reactive)
│   │   ├── proxy.ts         # Local HTTP proxy (OpenAI & Gemini drop-in endpoints)
│   │   ├── mcp.ts           # Model Context Protocol stdio server
│   │   ├── demo-agent.ts    # CLI demo agent showing live budget failover
│   │   └── cli.ts           # CLI binary entrypoint (proxy, mcp, demo-agent, wallet, models)
│   └── test/                # 18 SDK unit tests (mock client, fallback, reserve checks)
├── docs/research/           # Live fact-check research notes with source URLs
│   ├── monad.md             # Monad testnet/mainnet RPCs, gas rules, reserve balances
│   ├── event.md             # Monad Blitz Mumbai rules, schedule, rubric, and prizes
│   └── ai-providers.md      # Gemini, Anthropic, and Groq API token counting specs
├── scripts/                 # Root deployment and verification shell scripts
│   ├── deploy-testnet.sh    # Reproducible testnet deploy via forge script
│   └── verify-testnet.sh    # Sourcify contract verification script
├── decisions.md             # Complete architecture decision record (D-001 through D-023)
├── progress.md              # Build timeline and rubric verification checklist
└── briefs/                  # Component interface and agent task specifications
```

---

## Reproducible Quickstart

Follow these numbered steps to run the complete QuotaGrid stack locally.

### Prerequisites

- **Node.js:** `>= 22.12` (required by the web build; Tailwind v4 Turbopack loader)
- **Foundry:** `>= 1.8.0` (with Monad execution support). Install via:
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- **Monad Testnet Wallet:** A funded wallet with $> 10\text{ MON}$ (Monad requires a 10 MON reserve balance per EOA). Get testnet tokens from the [Official Monad Faucet](https://faucet.monad.xyz) or the [Monad Blitz Faucet](https://blitz.devnads.com/events/monad-blitz-mumbai-devcon-edition#faucet).

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/rohitblpprajapat/quotagrid.git
cd quotagrid
```

---

### Step 2: Smart Contracts (Foundry)

> [!NOTE]
> You can skip contract deployment and directly use the already-deployed verified contract on Monad Testnet at `0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630`.

#### 1. Build and Run Tests

```bash
cd contracts
forge install
forge build
forge test -vv
```

All 17 tests (including fuzz tests with 256 runs verifying zero-loss settlement conservation) will pass.

#### 2. Optional: Deploy to Monad Testnet

Set your deployer private key and operator address in the root `.env` file:

```bash
cd ..
cat << 'EOF' > .env
DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
OPERATOR_ADDRESS=0xYOUR_OPERATOR_ADDRESS
EOF
```

Run the deploy script:

```bash
./scripts/deploy-testnet.sh
```

#### 3. Optional: Verify on Sourcify

Verify the deployed contract on Monad testnet using the official Sourcify verifier:

```bash
./scripts/verify-testnet.sh <DEPLOYED_CONTRACT_ADDRESS>
```

---

### Step 3: Web Application & API Server

#### 1. Install Web Dependencies

```bash
cd web
npm install
```

#### 2. Generate Operator RSA Keypair

Generate an RSA-2048 keypair for the operator server to decrypt seller keys in memory:

```bash
node scripts/gen-operator-keys.mjs
```
*(Copy the printed base64 string for use in `.env.local` below).*

#### 3. Configure Environment Variables

Create `web/.env.local`:

```bash
cat << 'EOF' > .env.local
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadvision.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630
OPERATOR_PRIVATE_KEY=0xYOUR_OPERATOR_HOT_WALLET_PRIVATE_KEY
OPERATOR_RSA_PRIVATE_KEY=YOUR_BASE64_RSA_KEY_FROM_STEP_2
EOF
```

#### Environment Variables Reference

| Variable | Target | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CHAIN_ID` | Client & Server | Monad Testnet Chain ID (`10143`). |
| `NEXT_PUBLIC_RPC_URL` | Client & Server | Monad Testnet RPC endpoint (`https://testnet-rpc.monad.xyz`). |
| `NEXT_PUBLIC_EXPLORER_URL`| Client | Base explorer URL for transaction and address links (`https://testnet.monadvision.com`). |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Client & Server | Deployed `QuotaGrid` contract address. |
| `OPERATOR_PRIVATE_KEY` | Server API | Private key of operator wallet calling `settle` and `cancel`. |
| `OPERATOR_RSA_PRIVATE_KEY`| Server API | Base64-encoded PKCS#8 PEM RSA-2048 private key used to decrypt seller keys in RAM. |

#### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 4: Autonomous Agent SDK & Tools

#### 1. Build and Test SDK

```bash
cd ../sdk
npm install
npm run build
npm test
```

All 18 unit tests will pass.

#### 2. Configure SDK Environment

```bash
export QUOTAGRID_API_URL="http://localhost:3000"
export QUOTAGRID_CONTRACT="0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630"
export QUOTAGRID_PRIVATE_KEY="0xYOUR_AGENT_WALLET_PRIVATE_KEY"
export MONAD_RPC_URL="https://testnet-rpc.monad.xyz"
```

#### 3. Check Agent Wallet & Monad Reserve Safety

Verify your agent wallet balance and confirm compliance with Monad's 10 MON reserve requirement:

```bash
node dist/cli.js wallet
```

#### 4. View Active Live Listings on Monad

```bash
node dist/cli.js models
```

#### 5. Run Local Drop-In Proxy (OpenAI & Gemini Compatible)

Start the proxy server on port `8787`:

```bash
node dist/cli.js proxy --port 8787 --models gemini-2.5-flash,llama-3.1-8b-instant
```

Use with any standard OpenAI SDK client:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'unused-local-key',
  baseURL: 'http://127.0.0.1:8787/v1',
});

const completion = await openai.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'What is Monad block time?' }],
});

console.log(completion.choices[0].message.content);
console.log('Open Tx:', completion.quotagrid.openTxUrl);
console.log('Settle Tx:', completion.quotagrid.settleTxUrl);
```

#### 6. Run Autonomous Demo Agent

Run the demo agent showcasing proactive token budget tracking and automatic failover to QuotaGrid on Monad:

```bash
node dist/cli.js demo-agent --budget 120 --threshold 50
```

#### 7. Connect MCP Server to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quotagrid": {
      "command": "npx",
      "args": ["quotagrid", "mcp"],
      "env": {
        "QUOTAGRID_API_URL": "http://localhost:3000",
        "QUOTAGRID_CONTRACT": "0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630",
        "QUOTAGRID_PRIVATE_KEY": "0xYOUR_AGENT_WALLET_PRIVATE_KEY",
        "MONAD_RPC_URL": "https://testnet-rpc.monad.xyz"
      }
    }
  }
}
```

---

## Security Model & Trust Assumptions

### Honest Trust Assumptions

- **Operator Memory Isolation:** The operator server decrypts seller API keys in volatile RAM at execution time to forward prompts to the underlying AI model providers.
- **Usage Reporting:** The operator measures and reports token consumption ($T_{\text{used}}$) upon submitting the settlement transaction.

### Cryptographic & Contractual Mitigations

1. **Client-Side Key Encryption:** Seller API keys are encrypted directly in the browser via WebCrypto using RSA-OAEP SHA-256 before being broadcast. The plaintext key is never written to chain state, disk, or databases.
2. **On-Chain Prompt Hash Binding:** `openRequest` records `promptHash = keccak256(canonicalPayload)`. The execution API refuses to process any request whose submitted prompt payload does not match the on-chain commitment, preventing prompt substitution or front-running.
3. **Non-Custodial Escrow & Buyer Reclaim:** Buyer funds cannot be trapped by an unresponsive operator. If the operator fails to settle or cancel within `RECLAIM_DELAY = 600` seconds (10 minutes), the buyer can call `reclaim(requestId)` on-chain to withdraw 100% of their deposit.
4. **Key Role Separation:** The deployer/owner address (`0xF01D...`) is segregated from the operator hot wallet (`0xE959...`). If the operator server key is compromised, the attacker cannot withdraw protocol fees or alter marketplace configuration.
5. **Reentrancy Protection & Pull Payment:** Reentrancy guards protect all value-transfer methods. Seller proceeds accrue to an on-chain balance pulled via `withdraw()`. Buyer refund failures fall back to on-chain balances without reverting settlement.

### Known Gaps & Roadmap

- **Lost Execute Response:** If on-chain settlement succeeds but the HTTP connection drops before the client receives the LLM response text, the response cannot currently be retrieved because the operator does not persist prompt outputs.
- **Confidential Computing (TEE):** Currently, RAM isolation relies on Node.js process security. Transitioning the operator into a hardware-attested Trusted Execution Environment (AWS Nitro Enclave or Intel SGX) will eliminate operator trust completely.

---

## Business Model & Economics

- **Protocol Fee:** 2.5% (250 bps) deducted from the seller's gross payout on settled token usage ($T_{\text{used}}$). The buyer pays zero platform surcharge and is refunded 100% of unconsumed tokens.
- **Monetization for Sellers:** Sellers transform wasted, expiring tier quotas into liquid MON revenue without leaking their private credentials.
- **Cost Reduction for Buyers & Agents:** Buyers purchase model capacity on a strict per-token pay-as-you-go basis without monthly minimums or upfront tier commitments.
- **Future Directions:** Multi-operator decentralized network with staked economic bonds, WebSocket-based token streaming settlement, and expansion to Monad Mainnet.

---

## Engineering Process & Verification

Every component of QuotaGrid was built under a strict, verifiable engineering process:

- **`decisions.md`:** 23 recorded architecture decisions ([D-001 through D-023](decisions.md)) tracking technical trade-offs, interface freezing, and implementation details.
- **`progress.md`:** Real-time event log tracking milestones, wallet funding, deployments, and rubric verification ([Progress Log](progress.md)).
- **`docs/research/`:** Fact-checked technical notes containing live-fetched documentation citations and RPC queries:
  - [`docs/research/monad.md`](docs/research/monad.md): Testnet/Mainnet RPCs, gas limits, MIP-8 storage pages, and reserve balances.
  - [`docs/research/event.md`](docs/research/event.md): Monad Blitz Mumbai rules, timeline, team limits, and scoring rubric.
  - [`docs/research/ai-providers.md`](docs/research/ai-providers.md): Token counting endpoints, system prompt schemas, and rate-limit error codes.
- **Automated Verification:** 17 Foundry tests with 256-run fuzzing and 18 SDK unit tests executed and verified.

---

## Hackathon Details

- **Event:** [Monad Blitz Mumbai [Devcon Edition]](https://blitz.devnads.com/events/monad-blitz-mumbai-devcon-edition)
- **Date:** 4 November 2026
- **Venue:** Sorena, Mansionz One, Bandra West, Mumbai, India
- **Organizers:** Monad Foundation & Devnads
- **Starter Template:** Fork of [`monad-developers/monad-blitz-devcon-mumbai`](https://github.com/monad-developers/monad-blitz-devcon-mumbai)
