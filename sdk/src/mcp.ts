import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { formatEther } from 'viem';
import { QuotaGridClient } from './core.js';

export function createMcpServer(customClient?: QuotaGridClient): McpServer {
  const client = customClient || new QuotaGridClient();

  const server = new McpServer({
    name: 'quotagrid-mcp',
    version: '0.1.0',
  });

  // Tool 1: List models available on QuotaGrid
  server.tool(
    'quotagrid_list_models',
    'List AI models, providers, available quota, and prices on QuotaGrid (Monad testnet)',
    async () => {
      try {
        const listings = await client.listListings();
        const active = listings.filter((l) => l.active && l.available > 0n);

        if (active.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No active listings found on QuotaGrid at this time.',
              },
            ],
          };
        }

        const formatted = active.map((l) => ({
          listingId: l.id.toString(),
          model: l.model,
          provider: l.provider,
          pricePerKTokenMON: formatEther(l.pricePerKToken),
          availableTokens: l.available.toString(),
          seller: l.seller,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing QuotaGrid models: ${err?.message || 'unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: Complete prompt via QuotaGrid
  server.tool(
    'quotagrid_complete',
    'Execute an LLM prompt on Monad using QuotaGrid decentralized quota marketplace',
    {
      prompt: z.string().describe('The prompt or instruction to execute'),
      system: z.string().optional().describe('Optional system prompt'),
      models: z.array(z.string()).optional().describe('List of preferred model names in priority order'),
      maxOutputTokens: z.number().int().positive().optional().describe('Maximum output tokens to generate (default 512)'),
      maxPricePerKTokenMON: z.number().positive().optional().describe('Maximum price in MON per 1,000 tokens'),
    },
    async (args) => {
      try {
        const models = args.models && args.models.length > 0
          ? args.models
          : ['gemini-3.5-flash-lite', 'llama-3.1-8b-instant'];

        const result = await client.complete({
          system: args.system,
          messages: [{ role: 'user', content: args.prompt }],
          maxOutputTokens: args.maxOutputTokens ?? 512,
          models,
          maxPricePerKTokenMON: args.maxPricePerKTokenMON,
        });

        const depositMON = formatEther(result.depositWei);
        const refundMON = formatEther(result.refundWei);
        const actualCostMON = formatEther(result.depositWei - result.refundWei);

        const summary = [
          result.text,
          '',
          '--- QuotaGrid Settlement ---',
          `Model: ${result.model} (Listing #${result.listingId})`,
          `Request ID: ${result.requestId.toString()}`,
          `Tokens: ${result.tUsed.toString()} used / ${result.tMax.toString()} max`,
          `Cost: ${actualCostMON} MON (Deposit: ${depositMON} MON, Refund: ${refundMON} MON)`,
          `Open Tx:   https://testnet.monadvision.com/tx/${result.openTx}`,
          `Settle Tx: https://testnet.monadvision.com/tx/${result.settleTx}`,
        ].join('\n');

        return {
          content: [
            {
              type: 'text',
              text: summary,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `QuotaGrid execution error: ${err?.message || 'unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: Check agent wallet info
  server.tool(
    'quotagrid_wallet',
    'Check agent Monad wallet address, MON balance, and Monad 10 MON reserve safety requirement',
    async () => {
      try {
        const info = await client.walletInfo();
        const reserveNotice = info.reserveSafe
          ? 'Safe (balance >= 10.5 MON)'
          : 'Warning: Balance is below 10.5 MON. Monad requires 10 MON minimum reserve balance (D-015).';

        const text = [
          `Wallet Address: ${info.address}`,
          `Balance: ${info.balanceMON} MON`,
          `Reserve Status: ${reserveNotice}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text }],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching wallet info: ${err?.message || 'unknown error'}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

export async function runMcpServer(customClient?: QuotaGridClient): Promise<void> {
  const mcp = createMcpServer(customClient);
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}
