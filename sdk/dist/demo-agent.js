import { formatEther } from 'viem';
import { QuotaGridClient } from './core.js';
import { withQuotaGridFallback } from './fallback.js';
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
};
const QUESTIONS = [
    'What is the capital of France?',
    'What does EVM stand for?',
    'Explain what an escrow smart contract does.',
    'Name one benefit of paying per token instead of a flat monthly fee.',
    'What is an API rate limit?',
    'Why can a marketplace for unused AI quota help developers?',
];
// Short answers keep token use well below the escrowed maximum, so the refund is visible.
const STYLE = 'Answer in one short sentence. ';
export async function runDemoAgent(options = {}) {
    const budget = options.budget ?? 120; // Deliberately small budget
    const threshold = options.threshold ?? 50;
    const models = options.models && options.models.length > 0
        ? options.models
        : ['gemini-3.5-flash-lite', 'llama-3.1-8b-instant'];
    console.log(`\n${c.bold}${c.magenta}======================================================${c.reset}`);
    console.log(`${c.bold}${c.magenta}   QuotaGrid Token-Aware Agent Demo (Monad Blitz)    ${c.reset}`);
    console.log(`${c.bold}${c.magenta}======================================================${c.reset}\n`);
    const geminiKey = process.env.PRIMARY_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const openAiKey = process.env.PRIMARY_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    let primaryFn = null;
    let primaryName = 'None';
    if (geminiKey) {
        primaryName = 'Google Gemini (Primary)';
        primaryFn = async (req) => {
            const model = req.models?.[0] || 'gemini-2.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${geminiKey}`;
            const contents = req.messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    // Gemini 2.5 models spend "thinking" tokens inside maxOutputTokens unless thinking is disabled
                    // (https://ai.google.dev/gemini-api/docs/thinking); disable it so the answer isn't cut off.
                    generationConfig: { maxOutputTokens: req.maxOutputTokens || 256, thinkingConfig: { thinkingBudget: 0 } },
                }),
            });
            if (!res.ok) {
                const errText = await res.text();
                const err = new Error(`Gemini API error (${res.status}): ${errText}`);
                err.status = res.status;
                throw err;
            }
            const data = await res.json();
            const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
            const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
            const outputTokens = (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0);
            return {
                text,
                usage: { inputTokens, outputTokens },
            };
        };
    }
    else if (openAiKey) {
        primaryName = 'OpenAI (Primary)';
        primaryFn = async (req) => {
            const url = 'https://api.openai.com/v1/chat/completions';
            const messages = req.messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openAiKey}`,
                },
                body: JSON.stringify({
                    model: req.models?.[0] || 'gpt-4o-mini',
                    messages,
                    max_completion_tokens: req.maxOutputTokens || 256,
                }),
            });
            if (!res.ok) {
                const errText = await res.text();
                const err = new Error(`OpenAI API error (${res.status}): ${errText}`);
                err.status = res.status;
                throw err;
            }
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || '';
            const inputTokens = data.usage?.prompt_tokens || 10;
            const outputTokens = data.usage?.completion_tokens || 20;
            return {
                text,
                usage: { inputTokens, outputTokens },
            };
        };
    }
    const client = new QuotaGridClient();
    if (!primaryFn) {
        console.log(`${c.yellow}ℹ️ No primary API key found (PRIMARY_GEMINI_API_KEY or PRIMARY_OPENAI_API_KEY).${c.reset}`);
        console.log(`${c.yellow}  Starting directly in QuotaGrid-only fallback mode on Monad.${c.reset}\n`);
    }
    else {
        console.log(`${c.cyan}✓ Primary Provider: ${c.bold}${primaryName}${c.reset}`);
        console.log(`${c.cyan}✓ Initial Token Budget: ${c.bold}${budget} tokens${c.reset} (Threshold: ${threshold} tokens)`);
        console.log(`${c.cyan}✓ Fallback Target: ${c.bold}QuotaGrid on Monad Testnet${c.reset}\n`);
    }
    let effectiveBudget = primaryFn ? budget : 0;
    const agentCaller = withQuotaGridFallback(primaryFn ||
        (async () => {
            throw new Error('No primary provider configured');
        }), {
        budgetTokens: effectiveBudget,
        thresholdTokens: threshold,
        models,
        maxPricePerKTokenMON: options.maxPricePerKTokenMON,
        client,
        onSwitch: (reason, details) => {
            console.log(`\n${c.bold}${c.yellow}⚡ [SWITCH TRIGGERED] Reason: ${reason}${c.reset}`);
            if (reason === 'budget_threshold') {
                console.log(`   Remaining budget (${details?.remainingBudget} tokens) dropped below threshold (${details?.threshold} tokens).`);
            }
            else if (reason === 'quota_error') {
                console.log(`   Primary provider returned quota error: ${details?.error?.message}`);
            }
            console.log(`   ${c.green}→ Seamlessly routing next requests to QuotaGrid on Monad!${c.reset}\n`);
        },
    });
    for (let i = 0; i < QUESTIONS.length; i++) {
        const q = QUESTIONS[i];
        console.log(`------------------------------------------------------`);
        console.log(`${c.bold}[Step ${i + 1}/${QUESTIONS.length}] Question: "${q}"${c.reset}`);
        try {
            const response = await agentCaller({
                messages: [{ role: 'user', content: STYLE + q }],
                maxOutputTokens: 256,
                models,
            });
            if (response.source === 'primary') {
                const used = response.usage.inputTokens + response.usage.outputTokens;
                effectiveBudget -= used;
                console.log(`Route:  ${c.cyan}${c.bold}PRIMARY (${primaryName})${c.reset}`);
                console.log(`Tokens: ${used} tokens (${response.usage.inputTokens} prompt, ${response.usage.outputTokens} completion)`);
                console.log(`Budget: ${Math.max(0, effectiveBudget)} tokens remaining`);
                console.log(`Answer: ${response.text.trim()}`);
            }
            else {
                const qg = response.quotagridResult;
                const depositMON = formatEther(qg.depositWei);
                const refundMON = formatEther(qg.refundWei);
                const costMON = formatEther(qg.depositWei - qg.refundWei);
                console.log(`Route:   ${c.green}${c.bold}QUOTAGRID (Monad Testnet Escrow)${c.reset}`);
                console.log(`Model:   ${qg.model} (Listing #${qg.listingId}, Request #${qg.requestId})`);
                console.log(`Tokens:  ${qg.tUsed} used / ${qg.tMax} max locked`);
                console.log(`Cost:    ${c.bold}${costMON} MON${c.reset} (Deposit: ${depositMON} MON, Refund: ${refundMON} MON)`);
                console.log(`Open Tx:   https://testnet.monadvision.com/tx/${qg.openTx}`);
                console.log(`Settle Tx: https://testnet.monadvision.com/tx/${qg.settleTx}`);
                console.log(`Latency: ${qg.latencyMs} ms`);
                console.log(`Answer:  ${qg.text.trim()}`);
            }
        }
        catch (err) {
            console.log(`${c.red}❌ Error executing step ${i + 1}: ${err.message}${c.reset}`);
        }
        console.log('');
    }
    console.log(`${c.bold}${c.magenta}======================================================${c.reset}`);
    console.log(`${c.bold}${c.green}   Demo Agent Workflow Completed Successfully!        ${c.reset}`);
    console.log(`${c.bold}${c.magenta}======================================================${c.reset}\n`);
}
//# sourceMappingURL=demo-agent.js.map