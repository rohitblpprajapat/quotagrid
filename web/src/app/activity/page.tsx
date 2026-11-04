'use client';

import React from 'react';
import Link from 'next/link';
import { ActivityFeed } from '@/components/ActivityFeed';
import { CONTRACT_ADDRESS, EXPLORER_URL } from '@/lib/chain';
import { shortAddr } from '@/lib/format';

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] px-4 py-8 md:px-8 lg:px-12 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Projector Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2a2638] pb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/40 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
              <span>Projector Mode</span>
            </span>
            <span className="text-xs font-mono text-[#a39fb5]">
              Monad Testnet (Chain ID 10143)
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#f4f2fa]">
            Live On-Chain Activity
          </h1>
          <p className="text-base md:text-lg text-[#a39fb5] max-w-2xl">
            Real-time feed of quota listings, deposits, escrow settlements, and automatic token refunds running on Monad&apos;s 300 ms blocks.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <a
            href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#15131d] border border-[#2a2638] text-[#a39fb5] hover:text-[#f4f2fa] hover:border-[#8b5cf6]/50 transition-colors"
          >
            <span>Contract:</span>
            <span className="text-[#8b5cf6] font-semibold">{shortAddr(CONTRACT_ADDRESS)}</span>
            <svg className="w-3.5 h-3.5 text-[#a39fb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <Link
            href="/market"
            className="px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium transition-colors"
          >
            Open Market
          </Link>
        </div>
      </div>

      {/* Speed & Guarantees Callout strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[#a39fb5] bg-[#15131d]/60 p-3.5 rounded-xl border border-[#2a2638]/60">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span><strong className="text-[#f4f2fa]">300 ms Block Time:</strong> Instant per-call escrow confirmation</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          <span><strong className="text-[#f4f2fa]">2-Block Finality:</strong> 600 ms irreversible settlement</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
          <span><strong className="text-[#f4f2fa]">Single-Tx Refund:</strong> Unused tokens returned automatically</span>
        </div>
      </div>

      {/* Main Activity Feed */}
      <ActivityFeed maxEvents={100} />
    </div>
  );
}
