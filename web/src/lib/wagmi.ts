import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { monad, RPC_URL } from './chain';

export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: {
    [monad.id]: http(RPC_URL),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
