'use client';

import React from 'react';
import { formatMON } from '@/lib/format';
import { TxLink } from '@/components/TxLink';
import { Card } from '@/components/ui';

export interface SettlementReceiptProps {
  depositWei: bigint;
  tMax: bigint;
  tUsed: bigint;
  sellerPayoutWei: bigint;
  feeWei: bigint;
  refundWei: bigint;
  openTx?: string;
  settleTx?: string;
  className?: string;
}

function formatTokens(t: bigint): string {
  return t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function SettlementReceipt({
  depositWei,
  tMax,
  tUsed,
  sellerPayoutWei,
  feeWei,
  refundWei,
  openTx,
  settleTx,
  className = '',
}: SettlementReceiptProps) {
  // Calculate percentage shares for the stacked bar
  const total =
    depositWei > 0n
      ? depositWei
      : sellerPayoutWei + feeWei + refundWei;

  let payoutPct = 0;
  let feePct = 0;
  let refundPct = 0;
  let gasPct = 0;

  // D-031: the rest of the deposit is the flat settle fee that pays the operator's settlement gas.
  const settleFeeWei =
    depositWei > sellerPayoutWei + feeWei + refundWei
      ? depositWei - sellerPayoutWei - feeWei - refundWei
      : 0n;

  if (total > 0n) {
    payoutPct = Number((sellerPayoutWei * 10000n) / total) / 100;
    feePct = Number((feeWei * 10000n) / total) / 100;
    gasPct = Number((settleFeeWei * 10000n) / total) / 100;
    refundPct = Math.max(0, 100 - payoutPct - feePct - gasPct);
  }

  const tokenUsagePct =
    tMax > 0n
      ? Math.min(100, Math.max(0, Number((tUsed * 100n) / tMax)))
      : 0;

  const tokensSaved = tMax > tUsed ? tMax - tUsed : 0n;

  return (
    <Card
      className={`rounded-2xl border border-[#2a2638] bg-[#15131d] p-6 sm:p-8 space-y-6 shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2a2638] pb-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-1">
            Settlement Verified On-Chain
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#f4f2fa]">
            Settlement Receipt
          </h3>
        </div>
        <div className="text-xs text-[#a39fb5] font-mono">
          Single-Transaction Split & Refund
        </div>
      </div>

      {/* Prominent Green Refund Callout (Live demo focal point) */}
      <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/60 via-[#15131d] to-emerald-950/30 p-6 text-center shadow-lg shadow-emerald-950/40">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">
          Settlement Guarantee
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-300 tracking-tight my-2">
          Refunded {formatMON(refundWei)} MON
        </div>
        <p className="text-base sm:text-lg font-medium text-emerald-200/90">
          You only paid for what you used
        </p>
        <p className="text-xs text-emerald-400/70 font-mono mt-2">
          {formatTokens(tokensSaved)} unused tokens auto-refunded to your wallet
        </p>
      </div>

      {/* Stacked Deposit Split Bar: Deposit = Payout | Fee | Refund */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#a39fb5] font-medium uppercase tracking-wider">
            Escrow Deposit Distribution ({formatMON(depositWei)} MON)
          </span>
          <span className="text-[#f4f2fa]">100% Accounted</span>
        </div>

        {/* Horizontal Stacked Bar */}
        <div className="flex h-6 w-full overflow-hidden rounded-lg bg-[#0b0a10] border border-[#2a2638] p-0.5">
          {payoutPct > 0 && (
            <div
              style={{ width: `${payoutPct}%` }}
              className="bg-purple-600 transition-all duration-500 rounded-l hover:brightness-110 flex items-center justify-center text-[10px] text-white font-mono font-bold truncate px-1"
              title={`Seller Payout: ${payoutPct.toFixed(1)}%`}
            >
              {payoutPct >= 12 ? `${payoutPct.toFixed(0)}%` : ''}
            </div>
          )}
          {feePct > 0 && (
            <div
              style={{ width: `${feePct}%` }}
              className="bg-indigo-600 transition-all duration-500 hover:brightness-110 flex items-center justify-center text-[10px] text-white font-mono font-bold truncate px-1"
              title={`Protocol Fee: ${feePct.toFixed(1)}%`}
            >
              {feePct >= 12 ? `${feePct.toFixed(0)}%` : ''}
            </div>
          )}
          {gasPct > 0 && (
            <div
              style={{ width: `${gasPct}%` }}
              className="bg-amber-500 transition-all duration-500 hover:brightness-110 flex items-center justify-center text-[10px] text-[#0b0a10] font-mono font-bold truncate px-1"
              title={`Settlement gas fee: ${gasPct.toFixed(1)}%`}
            >
              {gasPct >= 12 ? `${gasPct.toFixed(0)}%` : ''}
            </div>
          )}
          {refundPct > 0 && (
            <div
              style={{ width: `${refundPct}%` }}
              className="bg-emerald-500 transition-all duration-500 rounded-r hover:brightness-110 flex items-center justify-center text-[10px] text-[#0b0a10] font-mono font-bold truncate px-1"
              title={`Buyer Refund: ${refundPct.toFixed(1)}%`}
            >
              {refundPct >= 12 ? `${refundPct.toFixed(0)}%` : ''}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-600 flex-shrink-0" />
            <span className="text-[#a39fb5]">Seller Payout:</span>
            <span className="text-[#f4f2fa] font-bold">{formatMON(sellerPayoutWei)} MON</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-indigo-600 flex-shrink-0" />
            <span className="text-[#a39fb5]">Protocol Fee (2.5%):</span>
            <span className="text-[#f4f2fa] font-bold">{formatMON(feeWei)} MON</span>
          </div>
          {settleFeeWei > 0n && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-[#a39fb5]">Settlement gas (to operator):</span>
              <span className="text-[#f4f2fa] font-bold">{formatMON(settleFeeWei)} MON</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-emerald-400 font-medium">Buyer Refund:</span>
            <span className="text-emerald-400 font-bold">{formatMON(refundWei)} MON</span>
          </div>
        </div>
      </div>

      {/* Token Accounting Grid */}
      <div className="rounded-xl border border-[#2a2638] bg-[#0b0a10] p-4 sm:p-5">
        <div className="text-xs uppercase tracking-wider text-[#a39fb5] mb-3 font-semibold">
          Token Accounting
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
          <div>
            <div className="text-xs text-[#a39fb5]">Reserved (T_max)</div>
            <div className="text-lg sm:text-xl font-bold text-[#f4f2fa]">
              {formatTokens(tMax)}
            </div>
            <div className="text-[11px] text-[#a39fb5]">worst-case escrow</div>
          </div>
          <div>
            <div className="text-xs text-[#a39fb5]">Used (T_used)</div>
            <div className="text-lg sm:text-xl font-bold text-purple-400">
              {formatTokens(tUsed)}
            </div>
            <div className="text-[11px] text-[#a39fb5]">
              {tokenUsagePct}% quota utilized
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs text-[#a39fb5]">Tokens Saved</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400">
              {formatTokens(tokensSaved)}
            </div>
            <div className="text-[11px] text-emerald-400/80">100% refunded</div>
          </div>
        </div>
      </div>

      {/* On-Chain Verification Links */}
      {(openTx || settleTx) && (
        <div className="rounded-xl border border-[#2a2638] bg-[#0b0a10] p-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-[#a39fb5] font-semibold">
            On-Chain Proof
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
            {openTx && (
              <div className="flex items-center gap-2">
                <span className="text-[#a39fb5]">Escrow Tx:</span>
                <TxLink hash={openTx} label="openRequest" />
              </div>
            )}
            {settleTx && (
              <div className="flex items-center gap-2">
                <span className="text-[#a39fb5]">Settlement Tx:</span>
                <TxLink hash={settleTx} label="settle" />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default SettlementReceipt;
