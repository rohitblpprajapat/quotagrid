'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { monad } from '@/lib/chain';

/**
 * Returns an async guard that makes sure the connected wallet is on Monad testnet
 * before a transaction is sent. useAccount().chainId is the wallet's real chain
 * (useChainId() only reports the app config's chain).
 */
export function useEnsureMonad() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const onMonad = chainId === monad.id;

  async function ensureMonad() {
    if (chainId !== monad.id) {
      await switchChainAsync({ chainId: monad.id });
    }
  }

  return { ensureMonad, onMonad, walletChainId: chainId };
}
