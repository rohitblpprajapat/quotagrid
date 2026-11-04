import { defineChain, type Chain } from 'viem';
import { monadTestnet } from 'viem/chains';

export const DEFAULT_MONAD_RPC = 'https://testnet-rpc.monad.xyz';
export const DEFAULT_EXPLORER_URL = 'https://testnet.monadvision.com';
export const MONAD_RESERVE_BALANCE_WEI = 10_000_000_000_000_000_000n; // 10 MON reserve (D-015)
export const DEFAULT_GAS_MARGIN_WEI = 50_000_000_000_000_000n; // 0.05 MON safety margin

export interface QuotaGridConfig {
  apiUrl: string;
  privateKey?: `0x${string}`;
  contractAddress?: `0x${string}`;
  rpcUrl: string;
  chain: Chain;
}

export function createMonadChain(rpcUrl: string = DEFAULT_MONAD_RPC): Chain {
  return defineChain({
    ...monadTestnet,
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
}

export function loadConfig(overrides?: Partial<QuotaGridConfig>): QuotaGridConfig {
  const rawApiUrl =
    overrides?.apiUrl ||
    process.env.QUOTAGRID_API_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const apiUrl = rawApiUrl.replace(/\/+$/, '');

  let rawPk = overrides?.privateKey || process.env.QUOTAGRID_PRIVATE_KEY || process.env.PRIVATE_KEY;
  let privateKey: `0x${string}` | undefined = undefined;
  if (rawPk) {
    privateKey = (rawPk.startsWith('0x') ? rawPk : `0x${rawPk}`) as `0x${string}`;
  }

  let rawContract =
    overrides?.contractAddress ||
    process.env.QUOTAGRID_CONTRACT ||
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  let contractAddress: `0x${string}` | undefined = undefined;
  if (rawContract) {
    contractAddress = (rawContract.startsWith('0x') ? rawContract : `0x${rawContract}`) as `0x${string}`;
  }

  const rpcUrl =
    overrides?.rpcUrl ||
    process.env.MONAD_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    DEFAULT_MONAD_RPC;

  const chain = overrides?.chain || createMonadChain(rpcUrl);

  return {
    apiUrl,
    privateKey,
    contractAddress,
    rpcUrl,
    chain,
  };
}
