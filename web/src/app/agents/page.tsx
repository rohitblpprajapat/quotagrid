'use client';

import React from 'react';
import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] px-4 py-8 md:px-8 lg:px-12 max-w-7xl mx-auto space-y-12">
      {/* Header Banner */}
      <div className="border-b border-[#2a2638] pb-8 space-y-4">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/40">
            Developer & Autonomous Agent Guide
          </span>
          <span className="text-xs font-mono text-[#a39fb5]">
            TypeScript SDK • Local Proxy • MCP Server
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#f4f2fa]">
          Token-Aware AI Agents on Monad
        </h1>
        <p className="text-base md:text-xl text-[#a39fb5] max-w-3xl leading-relaxed">
          Never crash on rate limits or depleted quotas again. When your primary LLM provider errors or your token budget runs low, your agent automatically purchases compute on QuotaGrid using per-call escrows from its own Monad wallet.
        </p>
      </div>

      {/* Conceptual Diagram / Flow Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-[#15131d] border border-[#2a2638] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a39fb5]">
            <span>PHASE 1</span>
            <span className="text-[#8b5cf6]">Normal Execution</span>
          </div>
          <h3 className="text-lg font-bold text-[#f4f2fa]">Primary Provider</h3>
          <p className="text-xs text-[#a39fb5] leading-relaxed">
            The agent issues standard LLM calls against its default API key (OpenAI, Anthropic, or Gemini) while the QuotaGrid SDK tracks usage and health.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#15131d] border border-[#2a2638] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a39fb5]">
            <span>PHASE 2</span>
            <span className="text-[#f59e0b]">Dual-Trigger Switch</span>
          </div>
          <h3 className="text-lg font-bold text-[#f4f2fa]">Threshold or 429 Error</h3>
          <p className="text-xs text-[#a39fb5] leading-relaxed">
            Switching triggers <strong>proactively</strong> when the token budget drops below <code className="text-[#a78bfa]">threshold</code>, or <strong>reactively</strong> on HTTP 429, <code className="text-[#a78bfa]">RESOURCE_EXHAUSTED</code>, or quota limits.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#15131d] border border-[#2a2638] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a39fb5]">
            <span>PHASE 3</span>
            <span className="text-[#22c55e]">On-Chain Monad Escrow</span>
          </div>
          <h3 className="text-lg font-bold text-[#f4f2fa]">Per-Call Settlement</h3>
          <p className="text-xs text-[#a39fb5] leading-relaxed">
            The agent opens an escrow on Monad for worst-case <code className="text-[#22c55e]">T_max</code>. Prompt executes, seller gets paid for <code className="text-[#22c55e]">T_used</code>, and unused MON is refunded in the same transaction.
          </p>
        </div>
      </div>

      {/* Integration Options Grid */}
      <div className="space-y-12">
        {/* Option 1: TypeScript SDK with Fallback Wrapper */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-mono text-[#8b5cf6] font-semibold uppercase tracking-wider">
                Option 1
              </span>
              <h2 className="text-2xl font-bold text-[#f4f2fa]">
                TypeScript SDK Fallback Wrapper (<code className="text-[#a78bfa]">withQuotaGridFallback</code>)
              </h2>
            </div>
            <span className="text-xs font-mono text-[#a39fb5] bg-[#1e1b2b] px-3 py-1 rounded-lg border border-[#2e2946]">
              npm install quotagrid
            </span>
          </div>
          <p className="text-sm text-[#a39fb5] max-w-3xl">
            Wrap any existing provider call. When your token budget is depleted or the primary returns a quota error, the wrapper transparently routes requests to QuotaGrid on Monad.
          </p>

          <CodeBlock
            title="agent.ts"
            language="typescript"
            code={`import { withQuotaGridFallback, QuotaGridClient } from 'quotagrid';

// 1. Wrap your existing primary provider invocation
const callModel = withQuotaGridFallback(
  async (req) => {
    // Primary execution (e.g. OpenAI, Anthropic, or local LLM)
    const response = await myPrimaryClient.chat(req);
    return {
      text: response.content,
      usage: { inputTokens: response.inputTokens, outputTokens: response.outputTokens },
    };
  },
  {
    // Proactive tracking: switch before running dry
    budgetTokens: 50000,
    thresholdTokens: 2000,
    // Acceptable fallback models listed on QuotaGrid
    models: ['llama-3.1-8b-instant', 'gemini-3.5-flash-lite'],
    // Safety caps
    maxPricePerKTokenMON: 0.05,
    maxSpendPerCallMON: 0.02,
    // Callback when switch occurs
    onSwitch: (reason, details) => {
      console.log(\`[QuotaGrid] Switched to Monad escrow! Reason: \${reason}\`);
      if (details.openTx) console.log(\`Open Tx: \${details.openTx}\`);
    },
  }
);

// 2. Execute seamlessly: fallback engages autonomously when necessary
const result = await callModel({
  messages: [{ role: 'user', content: 'Generate quarterly risk assessment summary.' }],
  maxTokens: 500,
});

console.log('Result:', result.text);`}
          />
        </section>

        {/* Option 2: Local HTTP Proxy */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-mono text-[#8b5cf6] font-semibold uppercase tracking-wider">
              Option 2
            </span>
            <h2 className="text-2xl font-bold text-[#f4f2fa]">
              Local Drop-In Proxy (<code className="text-[#a78bfa]">quotagrid proxy</code>)
            </h2>
          </div>
          <p className="text-sm text-[#a39fb5] max-w-3xl">
            Run a local proxy server that intercepts standard OpenAI or Gemini API calls. The proxy holds the agent&apos;s private key locally, signs Monad escrow transactions on the fly, and translates responses into standard OpenAI/Gemini formats.
          </p>

          <CodeBlock
            title="Terminal — Start Local Proxy"
            language="bash"
            code={`# Start local proxy on port 8787 with selected models
node sdk/dist/cli.js proxy --port 8787 --models gemini-3.5-flash-lite,llama-3.1-8b-instant

# Or start in hybrid proactive mode (forwards to primary until budget hits threshold)
node sdk/dist/cli.js proxy --port 8787 \\
  --primary gemini \\
  --primary-key-env GEMINI_API_KEY \\
  --budget 10000 \\
  --threshold 500`}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* OpenAI SDK Integration */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#f4f2fa] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <span>OpenAI SDK Integration</span>
              </h4>
              <p className="text-xs text-[#a39fb5]">
                Change only <code className="text-[#a78bfa]">baseURL</code> to point to your local QuotaGrid proxy:
              </p>
              <CodeBlock
                title="openai-client.ts"
                language="typescript"
                code={`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'unused-local-key',
  baseURL: 'http://127.0.0.1:8787/v1',
});

const completion = await openai.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'What is Monad block time?' }],
  max_tokens: 100,
});

console.log(completion.choices[0].message.content);
// Monad tx links attached to response:
console.log(completion.quotagrid?.settleTxUrl);`}
              />
            </div>

            {/* Gemini REST Integration */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#f4f2fa] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                <span>Gemini REST Integration</span>
              </h4>
              <p className="text-xs text-[#a39fb5]">
                Point Google Gemini API calls directly to the local proxy:
              </p>
              <CodeBlock
                title="gemini-curl.sh"
                language="bash"
                code={`curl -X POST http://127.0.0.1:8787/v1beta/models/gemini-3.5-flash-lite:generateContent \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{
      "parts": [{"text": "Explain Monad 300ms consensus finality."}]
    }],
    "generationConfig": {
      "maxOutputTokens": 150
    }
  }'`}
              />
            </div>
          </div>
        </section>

        {/* Option 3: Model Context Protocol (MCP) Server */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-mono text-[#8b5cf6] font-semibold uppercase tracking-wider">
              Option 3
            </span>
            <h2 className="text-2xl font-bold text-[#f4f2fa]">
              Model Context Protocol (MCP) Server (<code className="text-[#a78bfa]">quotagrid mcp</code>)
            </h2>
          </div>
          <p className="text-sm text-[#a39fb5] max-w-3xl">
            Give Claude Desktop, Claude Code, Cursor, or any MCP-enabled agent direct tools to inspect available AI listings on Monad, check wallet safety, and escrow completions autonomously.
          </p>

          <CodeBlock
            title="claude_desktop_config.json"
            language="json"
            code={`{
  "mcpServers": {
    "quotagrid": {
      "command": "npx",
      "args": ["-y", "quotagrid", "mcp"],
      "env": {
        "QUOTAGRID_API_URL": "https://your-quotagrid-domain.com",
        "QUOTAGRID_PRIVATE_KEY": "0xYourAgentMonadPrivateKeyHere",
        "QUOTAGRID_CONTRACT": "0xC5A6C25c44EA183c9e7A42B3e773Ad462F4df5f1",
        "MONAD_RPC_URL": "https://testnet-rpc.monad.xyz"
      }
    }
  }
}`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
            <div className="p-3.5 rounded-xl bg-[#15131d] border border-[#2a2638]">
              <span className="text-[#8b5cf6] font-bold block mb-1">quotagrid_list_models</span>
              <span className="text-[#a39fb5]">Query active providers, models, prices, and quota availability.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#15131d] border border-[#2a2638]">
              <span className="text-[#22c55e] font-bold block mb-1">quotagrid_complete</span>
              <span className="text-[#a39fb5]">Escrow MON, invoke inference, settle, and receive unused token refund.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#15131d] border border-[#2a2638]">
              <span className="text-[#06b6d4] font-bold block mb-1">quotagrid_wallet</span>
              <span className="text-[#a39fb5]">Verify agent balance and validate Monad 10 MON reserve requirement.</span>
            </div>
          </div>
        </section>

        {/* Option 4: CLI Demo Agent */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-mono text-[#8b5cf6] font-semibold uppercase tracking-wider">
              Option 4
            </span>
            <h2 className="text-2xl font-bold text-[#f4f2fa]">
              Autonomous Demo Agent (<code className="text-[#a78bfa]">quotagrid demo-agent</code>)
            </h2>
          </div>
          <p className="text-sm text-[#a39fb5] max-w-3xl">
            Run a live, multi-step agent task from the terminal. Watch it start with a tiny token budget, hit the threshold, seamlessly pivot to QuotaGrid on Monad, and print explorer links for open and settle transactions.
          </p>

          <CodeBlock
            title="Terminal"
            language="bash"
            code={`# Check agent wallet balance and Monad reserve safety
node sdk/dist/cli.js wallet

# List live models and pricing on Monad testnet
node sdk/dist/cli.js models

# Run the autonomous multi-step demo agent
node sdk/dist/cli.js demo-agent --budget 120 --threshold 50 --max-price 0.05`}
          />
        </section>

        {/* Safety & Guardrails Section */}
        <section className="rounded-2xl border border-[#2a2638] bg-[#12101a] p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#eab308]">
              Agent Safety Guardrails & Rules
            </span>
            <h2 className="text-2xl font-bold text-[#f4f2fa]">
              Built-In Agent Protection
            </h2>
            <p className="text-sm text-[#a39fb5]">
              Autonomous wallets require strict guardrails to prevent runaway loops and unexpected expenditures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Guardrail 1: Monad Reserve Balance */}
            <div className="p-5 rounded-xl bg-[#15131d] border border-[#2a2638] space-y-2">
              <div className="flex items-center space-x-2 text-[#eab308] font-bold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Monad 10 MON Reserve Rule (D-015)</span>
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Monad consensus maintains <code className="text-[#f4f2fa]">user_reserve_balance = 10 MON</code> per EOA. Any transaction that would leave an agent wallet below 10 MON will revert. The QuotaGrid SDK performs client-side pre-flight checks (<code className="text-[#f4f2fa]">balance &ge; deposit + 10 MON + gas</code>) before opening escrows.
              </p>
            </div>

            {/* Guardrail 2: Spend Caps */}
            <div className="p-5 rounded-xl bg-[#15131d] border border-[#2a2638] space-y-2">
              <div className="flex items-center space-x-2 text-[#8b5cf6] font-bold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Per-Call & Total Spend Caps</span>
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Set <code className="text-[#f4f2fa]">maxPricePerKTokenMON</code> to reject expensive listings, <code className="text-[#f4f2fa]">maxSpendPerCallMON</code> to cap single call deposits, and <code className="text-[#f4f2fa]">maxSpendTotalMON</code> to enforce a strict session budget ceiling.
              </p>
            </div>

            {/* Guardrail 3: 10-Minute Delayed Reclaim */}
            <div className="p-5 rounded-xl bg-[#15131d] border border-[#2a2638] space-y-2">
              <div className="flex items-center space-x-2 text-[#22c55e] font-bold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>10-Minute Delayed Reclaim Safety</span>
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                If the operator backend fails or an upstream provider drops offline, buyer funds are never trapped. After <code className="text-[#f4f2fa]">RECLAIM_DELAY = 600</code> seconds (10 min), the buyer agent can call <code className="text-[#22c55e]">client.reclaim(requestId)</code> directly on Monad for a 100% refund.
              </p>
            </div>

            {/* Guardrail 4: Multi-Turn Hash Binding */}
            <div className="p-5 rounded-xl bg-[#15131d] border border-[#2a2638] space-y-2">
              <div className="flex items-center space-x-2 text-[#06b6d4] font-bold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Cryptographic Hash Binding (D-007, D-013)</span>
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Every request binds <code className="text-[#f4f2fa]">promptHash = keccak256(payload)</code> on-chain. The backend operator verifies the exact canonical multi-turn conversation before executing, ensuring no third party can redirect escrowed funds.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-[#15131d] border border-[#2a2638]">
          <div>
            <h4 className="text-lg font-bold text-[#f4f2fa]">Ready to test with your agent?</h4>
            <p className="text-xs text-[#a39fb5]">Browse live models or watch real-time settlements on the activity feed.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/market"
              className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold text-sm transition-colors"
            >
              Browse Market
            </Link>
            <Link
              href="/activity"
              className="px-5 py-2.5 rounded-xl bg-[#201d2d] hover:bg-[#2b273d] text-[#f4f2fa] border border-[#302b44] font-semibold text-sm transition-colors"
            >
              Live Feed
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
