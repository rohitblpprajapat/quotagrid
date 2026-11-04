#!/usr/bin/env node

import { formatEther } from 'viem';
import { QuotaGridClient } from './core.js';
import { startProxyServer } from './proxy.js';
import { runMcpServer } from './mcp.js';
import { runDemoAgent } from './demo-agent.js';

function printHelp() {
  console.log(`
QuotaGrid CLI — Autonomous AI Agent Quota Marketplace on Monad

Usage:
  quotagrid <command> [options]

Commands:
  proxy       Run local OpenAI & Gemini compatible HTTP proxy
  mcp         Run stdio MCP server for Claude Desktop / Claude Code
  demo-agent  Run demo agent multi-step workflow with proactive/reactive fallback
  wallet      Display agent wallet balance and Monad 10 MON reserve safety check
  models      List active AI models and current pricing on Monad

Options:
  --port <number>             Port for proxy server (default: 8787)
  --host <string>             Host for proxy server (default: 127.0.0.1)
  --models <list>             Comma-separated list of fallback models
  --max-price <number>        Max price cap in MON per 1,000 tokens
  --budget <number>           Token budget before switching to QuotaGrid (demo-agent / proxy)
  --threshold <number>        Token threshold triggering proactive switch (default: 50)
  --primary <openai|gemini>   Primary provider to use before QuotaGrid fallback
  --primary-base-url <url>    Base URL for primary provider
  --primary-key-env <name>    Env var name containing primary provider API key
  --help, -h                  Show this help message

Environment Variables:
  QUOTAGRID_API_URL           Base URL of QuotaGrid web API (required for execution)
  QUOTAGRID_PRIVATE_KEY       Agent Monad wallet private key (0x...)
  QUOTAGRID_CONTRACT          Deployed QuotaGrid contract address
  MONAD_RPC_URL               Monad RPC endpoint (default: https://testnet-rpc.monad.xyz)

Examples:
  quotagrid proxy --port 8787
  quotagrid demo-agent --budget 100
  quotagrid models
  quotagrid wallet
  quotagrid mcp
`);
}

function parseArgs(args: string[]): {
  command: string;
  options: Record<string, string>;
} {
  const options: Record<string, string> = {};
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      options.help = 'true';
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = 'true';
      }
    } else if (!command) {
      command = arg;
    }
  }

  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (options.help || !command) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'proxy': {
      const port = options.port ? parseInt(options.port, 10) : 8787;
      const host = options.host || '127.0.0.1';
      const models = options.models ? options.models.split(',').map((m) => m.trim()) : undefined;
      const maxPrice = options['max-price'] ? parseFloat(options['max-price']) : undefined;
      const primary = options.primary as 'openai' | 'gemini' | undefined;
      const budget = options.budget ? parseInt(options.budget, 10) : undefined;
      const threshold = options.threshold ? parseInt(options.threshold, 10) : undefined;

      startProxyServer({
        port,
        host,
        models,
        maxPricePerKTokenMON: maxPrice,
        primary,
        primaryBaseUrl: options['primary-base-url'],
        primaryKeyEnv: options['primary-key-env'],
        budget,
        threshold,
      });
      break;
    }

    case 'mcp': {
      await runMcpServer();
      break;
    }

    case 'demo-agent': {
      const budget = options.budget ? parseInt(options.budget, 10) : 120;
      const threshold = options.threshold ? parseInt(options.threshold, 10) : 50;
      const models = options.models ? options.models.split(',').map((m) => m.trim()) : undefined;
      const maxPrice = options['max-price'] ? parseFloat(options['max-price']) : undefined;

      await runDemoAgent({
        budget,
        threshold,
        models,
        maxPricePerKTokenMON: maxPrice,
      });
      break;
    }

    case 'wallet': {
      try {
        const client = new QuotaGridClient();
        const info = await client.walletInfo();

        console.log('\n--- QuotaGrid Agent Wallet ---');
        console.log(`Address:        ${info.address}`);
        console.log(`Balance:        ${info.balanceMON} MON`);
        console.log(`Reserve Status: ${info.reserveSafe ? 'SAFE (>= 10.5 MON)' : 'WARNING: Less than 10.5 MON'}`);
        if (!info.reserveSafe) {
          console.log('\nNote: Monad consensus reserves 10 MON per EOA (D-015). Maintain balance > 10.5 MON to avoid failed value-spending transactions.');
        }
        console.log('');
      } catch (err: any) {
        console.error(`Error checking wallet: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'models': {
      try {
        const client = new QuotaGridClient();
        console.log('Fetching active listings from QuotaGrid contract...');
        const listings = await client.listListings();
        const active = listings.filter((l) => l.active);

        if (active.length === 0) {
          console.log('No active listings found on QuotaGrid.');
          break;
        }

        console.log('\nID   Provider          Model                    Price/1k (MON)      Available Quota');
        console.log('-----------------------------------------------------------------------------------');
        for (const l of active) {
          const idStr = l.id.toString().padEnd(4);
          const provStr = l.provider.padEnd(17);
          const modelStr = l.model.padEnd(24);
          const priceStr = formatEther(l.pricePerKToken).padEnd(19);
          const availStr = l.available.toString();
          console.log(`${idStr} ${provStr} ${modelStr} ${priceStr} ${availStr}`);
        }
        console.log('');
      } catch (err: any) {
        console.error(`Error listing models: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    default: {
      console.error(`Unknown command: "${command}". Run "quotagrid --help" for available commands.`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
