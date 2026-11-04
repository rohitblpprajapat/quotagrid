'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { quotaGridAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS, publicClient } from '@/lib/chain';
import { formatMON } from '@/lib/format';
import { Card, Button, Mono } from '@/components/ui';
import { TxLink } from '@/components/TxLink';

export function Earnings() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawTx, setWithdrawTx] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read balances(address) with refetch every 3s
  const {
    data: balanceData,
    refetch,
    isLoading: isReadingBalance,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 3000,
    },
  });

  // Guarantee 3-second refetching interval while component is mounted
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [address, refetch]);

  const balanceWei = (balanceData as bigint | undefined) ?? 0n;
  const isZero = balanceWei === 0n;

  const handleWithdraw = async () => {
    if (!isConnected || isZero) return;

    setError(null);
    setWithdrawTx(null);
    setIsWithdrawing(true);

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: quotaGridAbi,
        functionName: 'withdraw',
      });

      setWithdrawTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Card className="p-6 bg-[#15131d] border border-[#2a2638] rounded-xl text-[#f4f2fa]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Balance Display */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#a39fb5]">
              Seller Earnings Balance
            </span>
            <span
              className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"
              title="Auto-refreshed every 3 seconds"
            />
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-[#f4f2fa]">
              {isConnected ? formatMON(balanceWei, 6) : '0.000000'}
            </span>
            <span className="text-xl md:text-2xl font-bold text-[#8b5cf6]">
              MON
            </span>
          </div>

          <p className="text-xs text-[#a39fb5]">
            Settled earnings from completed prompt requests. Non-custodial pull-payment on Monad.
          </p>
        </div>

        {/* Withdraw Action */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <Button
            variant="primary"
            loading={isWithdrawing}
            disabled={isZero || isWithdrawing || !isConnected}
            onClick={handleWithdraw}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold"
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Earnings'}
          </Button>

          {/* Disabled at 0 with a hint */}
          {isZero && isConnected && (
            <p className="text-xs text-[#a39fb5] max-w-xs sm:text-right">
              No earnings to withdraw yet. Earnings accrue automatically when buyers consume your quota.
            </p>
          )}

          {!isConnected && (
            <p className="text-xs text-[#a39fb5] max-w-xs sm:text-right">
              Connect wallet to check and withdraw your earnings balance.
            </p>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#ef4444]">
          <span className="font-semibold">Withdrawal Error: </span>
          {error}
        </div>
      )}

      {/* Success Transaction */}
      {withdrawTx && (
        <div className="mt-4 p-3.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#22c55e]">
          <div className="flex items-center gap-2">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Withdrawal confirmed and transferred to your wallet!</span>
          </div>
          <TxLink hash={withdrawTx} label="View TX" />
        </div>
      )}
    </Card>
  );
}
