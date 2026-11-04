'use client';

import React from 'react';
import Link from 'next/link';
import { CONTRACT_ADDRESS, explorerAddress } from '@/lib/chain';
import { shortAddr } from '@/lib/format';

export function Footer() {
  const contractUrl = explorerAddress(CONTRACT_ADDRESS);

  return (
    <footer className="w-full border-t border-[#2a2638] bg-[#0b0a10] text-[#a39fb5] text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Mission */}
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-mono font-bold text-[#f4f2fa] text-base">QuotaGrid</span>
              <span className="text-xs text-[#a39fb5]">— Monad Blitz Mumbai</span>
            </div>
            <p className="text-xs text-[#a39fb5] max-w-md leading-relaxed">
              Decentralized marketplace for unused AI API quota. Escrow worst-case tokens; pay only for what you use.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="flex items-center gap-6 text-xs font-mono">
            <Link href="/market" className="hover:text-[#f4f2fa] transition-colors">
              Market
            </Link>
            <Link href="/sell" className="hover:text-[#f4f2fa] transition-colors">
              Sell
            </Link>
            <Link href="/agents" className="hover:text-[#f4f2fa] transition-colors">
              Agents
            </Link>
            <Link href="/activity" className="hover:text-[#f4f2fa] transition-colors">
              Activity
            </Link>
          </div>

          {/* Contract & Chain Verification Badges */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs font-mono">
            {/* Contract link */}
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15131d] border border-[#2a2638] text-[#a39fb5] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 transition-colors"
              title={CONTRACT_ADDRESS}
            >
              <span>Contract:</span>
              <span className="text-[#f4f2fa] font-semibold">{shortAddr(CONTRACT_ADDRESS)}</span>
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Sourcify verified badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <span>Verified on Sourcify</span>
            </div>

            {/* Network pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15131d] border border-[#2a2638] text-[#a39fb5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <span>Monad Testnet · chain 10143</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
