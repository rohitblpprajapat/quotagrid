# QuotaGrid SDK (`quotagrid`)

**QuotaGrid** is an autonomous quota marketplace on Monad where AI agents and developers buy unused AI model quota (Gemini, Claude, Llama via Groq) without exposing seller API keys.

Buyer escrows the worst-case token cost ($T_{\text{max}}$) in native MON on Monad; seller is paid only for tokens actually used ($T_{\text{used}}$); the remaining deposit is automatically refunded in the same transaction; protocol takes a 2.5% fee.

The `quotagrid` package provides TypeScript clients, an automatic quota-fallback wrapper, a local drop-in proxy (OpenAI & Gemini compatible), a Model Context Protocol (MCP) server, and CLI tools for autonomous agents.

---

## Installation

```bash
npm install quotagrid
```

Or install globally for CLI usage:
```bash
npm install -g quotagrid
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `QUOTAGRID_API_URL` | Base URL of the QuotaGrid backend API | `http://localhost:3000` |
| `QUOTAGRID_PRIVATE_KEY` | Agent Monad wallet private key (`0x...`) | *(Required for execution)* |
| `QUOTAGRID_CONTRACT` | Deployed QuotaGrid contract address on Monad | `0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630` |
| `MONAD_RPC_URL` | Monad JSON-RPC endpoint | `https://testnet-rpc.monad.xyz` |

---

## 1. Local HTTP Proxy (OpenAI & Gemini Drop-In)

Run a local proxy server that accepts standard OpenAI or Gemini calls from any existing AI tool/agent and translates them into on-chain Monad escrows:

```bash
quotagrid proxy --port 8787 --models gemini-3.5-flash-lite,llama-3.1-8b-instant
```

### OpenAI SDK Integration
Set `baseURL` to `http://127.0.0.1:8787/v1`:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'unused-local-key',
  baseURL: 'http://127.0.0.1:8787/v1',
});

const completion = await openai.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'Explain zero-knowledge proofs in 20 words.' }],
  max_tokens: 100,
});

console.log(completion.choices[0].message.content);
// On-chain metadata and Monad explorer links:
console.log(completion.quotagrid.openTxUrl);
console.log(completion.quotagrid.settleTxUrl);
```

### Gemini REST Integration
Point Gemini API requests to `http://127.0.0.1:8787/v1beta`:

```bash
curl -X POST http://127.0.0.1:8787/v1beta/models/gemini-3.5-flash-lite:generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello QuotaGrid on Monad!"}]}],
    "generationConfig": {"maxOutputTokens": 64}
  }'
```

### Token-Aware Hybrid Mode
The proxy can forward requests to your primary API key, track token usage, and automatically pivot to QuotaGrid when your tokens drop below a threshold:

```bash
quotagrid proxy --port 8787 \
  --primary gemini \
  --primary-key-env GEMINI_API_KEY \
  --budget 2000 \
  --threshold 200
```

---

## 2. Model Context Protocol (MCP) Server

Connect QuotaGrid tools directly to Claude Desktop, Claude Code, Cursor, or any MCP client:

### Claude Desktop Configuration
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quotagrid": {
      "command": "quotagrid",
      "args": ["mcp"],
      "env": {
        "QUOTAGRID_API_URL": "https://your-quotagrid-app.com",
        "QUOTAGRID_PRIVATE_KEY": "0x...",
        "QUOTAGRID_CONTRACT": "0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630",
        "MONAD_RPC_URL": "https://testnet-rpc.monad.xyz"
      }
    }
  }
}
```

### Tools Exposed
- `quotagrid_list_models`: View active AI models, providers, and prices on Monad.
- `quotagrid_complete`: Escrow MON on Monad and execute completions.
- `quotagrid_wallet`: Verify agent wallet balance and 10 MON reserve safety status.

---

## 3. TypeScript SDK & Fallback Wrapper

### Core Client

```typescript
import { QuotaGridClient } from 'quotagrid';

const client = new QuotaGridClient({
  apiUrl: 'https://your-app.com',
  privateKey: '0x...',
  contractAddress: '0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630',
});

// 1. Check active listings
const listings = await client.listListings();

// 2. Execute completion with safety limits
const result = await client.complete({
  messages: [{ role: 'user', content: 'What is Monad block time?' }],
  models: ['llama-3.1-8b-instant', 'gemini-3.5-flash-lite'],
  maxOutputTokens: 128,
  maxPricePerKTokenMON: 0.05,
  maxSpendPerCallMON: 0.02,
});

console.log('Result:', result.text);
console.log('Open Tx:', `https://testnet.monadvision.com/tx/${result.openTx}`);
console.log('Settle Tx:', `https://testnet.monadvision.com/tx/${result.settleTx}`);
```

### Proactive + Reactive Fallback Wrapper

```typescript
import { withQuotaGridFallback } from 'quotagrid';

const callModel = withQuotaGridFallback(
  async (req) => {
    // Call your primary provider
    const res = await callYourPrimaryAPI(req);
    return { text: res.text, usage: res.usage };
  },
  {
    budgetTokens: 10000,
    thresholdTokens: 500,
    models: ['llama-3.1-8b-instant'],
    onSwitch: (reason, details) => {
      console.log(`[Switch] Switched to QuotaGrid on Monad! Reason: ${reason}`);
    },
  }
);
```

---

## 4. CLI Commands

```bash
# Check agent wallet balance and Monad reserve safety
quotagrid wallet

# View live listings and pricing on Monad testnet
quotagrid models

# Run multi-step fallback demo agent
quotagrid demo-agent --budget 120 --threshold 50
```

---

## Safety Limits & The Monad 10 MON Reserve

### Monad Reserve Balance Rule (D-015)
In Monad, each Externally Owned Account (EOA) is subject to an on-chain reserve rule:
$$\text{user\_reserve\_balance} = 10\text{ MON}$$

Transactions that would dip an account's balance below 10 MON (before refunds) will revert.
The QuotaGrid SDK enforces this client-side before submitting transactions:
$$\text{wallet\_balance} \ge \text{quoted\_deposit} + 10\text{ MON} + 0.05\text{ MON gas margin}$$

If the wallet balance is below this threshold, the SDK throws a clear, actionable error instead of failing on-chain.

### Spend Limits
- `maxPricePerKTokenMON`: Maximum acceptable price per 1,000 tokens (refuses expensive listings).
- `maxSpendPerCallMON`: Maximum total MON deposited on any single completion.
- `maxSpendTotalMON`: Hard ceiling on cumulative spend across the client's session.

### Delayed Reclaim
If an execution fails and the operator does not settle within 10 minutes (`RECLAIM_DELAY = 600` seconds), the buyer can reclaim 100% of their deposit directly on-chain:
```typescript
await client.reclaim(requestId);
```
