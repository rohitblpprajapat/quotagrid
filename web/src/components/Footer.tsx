'use client';

import React from 'react';
import Link from 'next/link';
import { CONTRACT_ADDRESS, explorerAddress } from '@/lib/chain';
import { shortAddr } from '@/lib/format';
import { LogoMark } from '@/components/brand';

const SOURCIFY_JOB = 'https://sourcify-api-monad.blockvision.org/verify-ui/jobs/d79603ec-1f5a-4d93-86ac-96fc000c9beb';

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-[#2a2638] text-sm text-[#a39fb5]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <LogoMark size={18} />
          <span className="text-[#f4f2fa]">QuotaGrid</span>
          <span>built at Monad Blitz Mumbai</span>
        </div>
        <nav className="flex gap-6">
          <Link href="/market" className="hover:text-[#f4f2fa]">Market</Link>
          <Link href="/sell" className="hover:text-[#f4f2fa]">Sell</Link>
          <Link href="/agents" className="hover:text-[#f4f2fa]">Agents</Link>
          <Link href="/activity" className="hover:text-[#f4f2fa]">Activity</Link>
        </nav>
        <p className="font-mono text-xs">
          contract{' '}
          <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="text-[#f4f2fa] hover:text-[#a78bfa]" title={CONTRACT_ADDRESS}>
            {shortAddr(CONTRACT_ADDRESS)}
          </a>{' '}
          on Monad testnet (chain 10143),{' '}
          <a href={SOURCIFY_JOB} target="_blank" rel="noopener noreferrer" className="underline decoration-[#2a2638] underline-offset-4 hover:text-[#f4f2fa]">
            verified on Sourcify
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
