'use client';

import React, { useEffect, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useSwitchChain,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { monad } from '@/lib/chain';
import { formatMON, shortAddr } from '@/lib/format';

export interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className = '' }: ConnectButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { chainId: walletChainId } = useAccount();
  const chainId = walletChainId;

  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-10 w-36 rounded-lg bg-[#15131d] border border-[#2a2638] animate-pulse ${className}`} />
    );
  }

  // Not connected. With several wallet extensions installed they fight over window.ethereum, so offer each
  // EIP-6963-announced wallet by name (wagmi discovers them by default) and let the user pick.
  const discovered = connectors.filter((c) => c.id !== 'injected');
  if ((!isConnected || !address) && discovered.length > 1) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {discovered.map((c) => (
          <button
            key={c.uid}
            type="button"
            onClick={() => connect({ connector: c })}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {c.icon ? <img src={c.icon} alt="" className="h-4 w-4" /> : null}
            {c.name}
          </button>
        ))}
      </div>
    );
  }
  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={() => connect({ connector: discovered[0] ?? injected() })}
        disabled={isConnecting}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isConnecting ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Connecting…</span>
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>
    );
  }

  // Wrong network check: chainId !== monad.id (10143)
  const isWrongNetwork = chainId !== monad.id;
  if (isWrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: monad.id })}
        disabled={isSwitching}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isSwitching ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Switching…</span>
          </>
        ) : (
          <span>Switch to Monad Testnet</span>
        )}
      </button>
    );
  }

  // Connected on Monad testnet: show address + balance + disconnect
  return (
    <div
      className={`inline-flex items-center gap-2 bg-[#15131d] border border-[#2a2638] rounded-lg p-1.5 text-xs font-mono shadow-sm ${className}`}
    >
      {/* MON Balance */}
      <div className="px-2 py-1 rounded bg-[#0b0a10] border border-[#2a2638] text-[#22c55e] font-semibold">
        {balanceData ? `${formatMON(balanceData.value, 3)} MON` : '…'}
      </div>

      {/* Short Address */}
      <div
        className="px-2 py-1 text-[#f4f2fa] font-medium"
        title={address}
      >
        {shortAddr(address)}
      </div>

      {/* Disconnect Button */}
      <button
        type="button"
        onClick={() => disconnect()}
        className="p-1.5 rounded hover:bg-[#2a2638] text-[#a39fb5] hover:text-rose-400 transition-colors"
        title="Disconnect wallet"
        aria-label="Disconnect wallet"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}

export default ConnectButton;
