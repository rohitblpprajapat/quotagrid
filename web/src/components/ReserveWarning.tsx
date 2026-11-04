'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatMON } from '@/lib/format';

export interface ReserveWarningProps {
  className?: string;
}

// Monad testnet reserve rule: EOAs must keep >= 10 MON in reserve.
// We warn when balance is below 10.5 MON to avoid transaction failure.
const RESERVE_THRESHOLD_WEI = 10_500_000_000_000_000_000n; // 10.5 MON

export function ReserveWarning({ className = '' }: ReserveWarningProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
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

  if (!mounted || !isConnected || !balanceData) {
    return null;
  }

  const currentBalanceWei = balanceData.value;
  const isBelowReserve = currentBalanceWei < RESERVE_THRESHOLD_WEI;

  if (!isBelowReserve) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-200 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <svg
            className="h-5 w-5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-amber-300">
            Monad Reserve Warning (Balance &lt; 10.5 MON)
          </div>
          <div className="text-xs leading-relaxed text-amber-200/90 font-mono">
            Monad testnet accounts must maintain a minimum reserve of 10 MON. Your current balance is{' '}
            <span className="font-bold underline text-amber-100">
              {formatMON(currentBalanceWei)} MON
            </span>
            . To avoid transaction errors when escrowing or executing requests, please ensure your account has at least 10.5 MON.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReserveWarning;
