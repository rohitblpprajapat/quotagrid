import { defineChain, createPublicClient, http } from 'viem';
import { monadTestnet as baseMonadTestnet } from 'viem/chains';

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz';

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://testnet.monadvision.com';

export const CONTRACT_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  '0xE15215c6D5A8Ea7a7AC06BCF62C3b8169301E630';

export const monad = defineChain({
  ...baseMonadTestnet,
  rpcUrls: {
    ...baseMonadTestnet.rpcUrls,
    default: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    ...baseMonadTestnet.blockExplorers,
    default: {
      name: 'MonadVision',
      url: EXPLORER_URL,
    },
  },
});

export function explorerTx(hash: string): string {
  const base = EXPLORER_URL.replace(/\/+$/, '');
  return `${base}/tx/${hash}`;
}

export function explorerAddress(addr: string): string {
  const base = EXPLORER_URL.replace(/\/+$/, '');
  return `${base}/address/${addr}`;
}

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(RPC_URL),
});
