'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicClient, CONTRACT_ADDRESS } from '@/lib/chain';
import { quotaGridAbi } from '@/lib/abi';
import { formatMON } from '@/lib/format';

export default function LandingPage() {
  const [stats, setStats] = useState<{
    listingCount: bigint | null;
    requestCount: bigint | null;
    protocolFeesWei: bigint | null;
    currentBlock: bigint | null;
  }>({
    listingCount: null,
    requestCount: null,
    protocolFeesWei: null,
    currentBlock: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Poll live stats from Monad every 3 seconds
  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const [listingsRes, requestsRes, feesRes, blockRes] = await Promise.all([
          (publicClient as any).readContract({
            address: CONTRACT_ADDRESS,
            abi: quotaGridAbi,
            functionName: 'listingCount',
          }),
          (publicClient as any).readContract({
            address: CONTRACT_ADDRESS,
            abi: quotaGridAbi,
            functionName: 'requestCount',
          }),
          (publicClient as any).readContract({
            address: CONTRACT_ADDRESS,
            abi: quotaGridAbi,
            functionName: 'protocolFees',
          }),
          publicClient.getBlockNumber(),
        ]);

        if (isMounted) {
          setStats({
            listingCount: BigInt(listingsRes),
            requestCount: BigInt(requestsRes),
            protocolFeesWei: BigInt(feesRes),
            currentBlock: BigInt(blockRes),
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to query QuotaGrid contract stats on Monad:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] flex flex-col justify-between selection:bg-[#8b5cf6]/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#8b5cf6]/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative text-center space-y-6 max-w-4xl mx-auto">
          {/* Live Network Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#15131d] border border-[#2a2638] text-xs font-mono text-[#a39fb5] shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            </span>
            <span className="text-[#f4f2fa] font-medium">Monad Testnet</span>
            <span className="text-[#433d59]">|</span>
            <span>300 ms Block Time</span>
            <span className="text-[#433d59]">|</span>
            <span>2-Block Finality</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#f4f2fa] leading-[1.1]">
            Sell your unused AI quota.{' '}
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#c084fc] bg-clip-text text-transparent">
              Pay only for tokens you use.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#a39fb5] max-w-3xl mx-auto leading-relaxed">
            Decentralized AI inference marketplace on Monad testnet. Buyer escrows worst-case{' '}
            <span className="font-mono text-[#f4f2fa] font-semibold">T_max</span>, seller is paid only for{' '}
            <span className="font-mono text-[#f4f2fa] font-semibold">T_used</span>, and unused funds are refunded in the same transaction.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/market"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold text-base transition-all duration-150 shadow-lg shadow-[#8b5cf6]/20 hover:scale-[1.02] active:scale-[0.98] text-center"
            >
              Buy compute
            </Link>

            <Link
              href="/sell"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#15131d] hover:bg-[#1e1a2b] text-[#f4f2fa] border border-[#2a2638] hover:border-[#8b5cf6]/50 font-semibold text-base transition-all duration-150 text-center"
            >
              Sell quota
            </Link>

            <Link
              href="/agents"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-transparent hover:bg-[#15131d] text-[#a78bfa] hover:text-[#c084fc] font-medium text-base transition-all duration-150 flex items-center justify-center space-x-2 text-center"
            >
              <span>For AI agents</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Live On-Chain Stats Strip (3s refresh via publicClient) */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-2 bg-[#12101a] rounded-2xl border border-[#2a2638] shadow-2xl">
            {/* Stat 1: Listings */}
            <div className="p-6 rounded-xl bg-[#15131d] border border-[#2a2638]/50 flex flex-col justify-between">
              <div className="text-xs font-mono font-medium text-[#a39fb5] uppercase tracking-wider flex items-center justify-between">
                <span>Active Listings</span>
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              </div>
              <div className="mt-3">
                <span className="text-3xl md:text-4xl font-mono font-bold text-[#f4f2fa]">
                  {isLoading || stats.listingCount === null
                    ? '...'
                    : stats.listingCount.toString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#a39fb5]">
                AI models ready for instant execution
              </p>
            </div>

            {/* Stat 2: Requests */}
            <div className="p-6 rounded-xl bg-[#15131d] border border-[#2a2638]/50 flex flex-col justify-between">
              <div className="text-xs font-mono font-medium text-[#a39fb5] uppercase tracking-wider flex items-center justify-between">
                <span>Requests Processed</span>
                <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
              </div>
              <div className="mt-3">
                <span className="text-3xl md:text-4xl font-mono font-bold text-[#f4f2fa]">
                  {isLoading || stats.requestCount === null
                    ? '...'
                    : stats.requestCount.toString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#a39fb5]">
                Total on-chain escrow interactions
              </p>
            </div>

            {/* Stat 3: Protocol Fees */}
            <div className="p-6 rounded-xl bg-[#15131d] border border-[#2a2638]/50 flex flex-col justify-between">
              <div className="text-xs font-mono font-medium text-[#a39fb5] uppercase tracking-wider flex items-center justify-between">
                <span>Protocol Fees</span>
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              </div>
              <div className="mt-3 flex items-baseline space-x-1.5">
                <span className="text-3xl md:text-4xl font-mono font-bold text-[#22c55e]">
                  {isLoading || stats.protocolFeesWei === null
                    ? '...'
                    : formatMON(stats.protocolFeesWei, 4)}
                </span>
                <span className="font-mono text-sm font-semibold text-[#22c55e]/90">MON</span>
              </div>
              <p className="mt-2 text-xs text-[#a39fb5]">
                2.5% protocol fee collected
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-2 text-xs font-mono text-[#a39fb5]">
            <span className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span>Contract verified on Monad Testnet</span>
            </span>
            <Link
              href="/activity"
              className="text-[#a78bfa] hover:text-[#c084fc] hover:underline flex items-center space-x-1"
            >
              <span>View Live Activity Screen</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-[#0e0c15] border-y border-[#2a2638] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-[#8b5cf6]">
              Workflow & Architecture
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#f4f2fa] tracking-tight">
              How QuotaGrid Works
            </p>
            <p className="text-base text-[#a39fb5] max-w-2xl mx-auto">
              Per-call escrow ensures trustless API sharing: seller never reveals keys, buyer never overpays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-8 rounded-2xl bg-[#15131d] border border-[#2a2638] flex flex-col justify-between relative group hover:border-[#8b5cf6]/40 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 flex items-center justify-center font-mono font-bold text-lg text-[#a78bfa]">
                  01
                </div>
                <h3 className="text-xl font-bold text-[#f4f2fa]">
                  Seller Lists Quota
                </h3>
                <p className="text-sm text-[#a39fb5] leading-relaxed">
                  The seller inputs model name, available tokens, and price per 1k tokens. The API key is encrypted in the seller&apos;s browser using{' '}
                  <strong className="text-[#f4f2fa]">RSA-OAEP (2048-bit SHA-256)</strong> to the operator&apos;s public key. The sealed ciphertext is saved on-chain. Plaintext never leaks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2a2638]/60 text-xs font-mono text-[#a78bfa]">
                Browser-encrypted • Zero plaintext storage
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl bg-[#15131d] border border-[#2a2638] flex flex-col justify-between relative group hover:border-[#8b5cf6]/40 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/15 border border-[#06b6d4]/30 flex items-center justify-center font-mono font-bold text-lg text-[#06b6d4]">
                  02
                </div>
                <h3 className="text-xl font-bold text-[#f4f2fa]">
                  Buyer Escrows Worst-Case T_max
                </h3>
                <p className="text-sm text-[#a39fb5] leading-relaxed">
                  Buyer selects a listing and escrows native MON for the maximum conceivable token budget (<strong className="text-[#f4f2fa]">T_max</strong>). Quota is locked in the contract to prevent double-selling. The prompt is committed via <strong className="text-[#f4f2fa]">keccak256 hash</strong>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2a2638]/60 text-xs font-mono text-[#06b6d4]">
                Per-call escrow • Locked quota
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl bg-[#15131d] border border-[#2a2638] flex flex-col justify-between relative group hover:border-[#8b5cf6]/40 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center font-mono font-bold text-lg text-[#22c55e]">
                  03
                </div>
                <h3 className="text-xl font-bold text-[#f4f2fa]">
                  Atomic Settle & Auto-Refund
                </h3>
                <p className="text-sm text-[#a39fb5] leading-relaxed">
                  Upon model completion, the operator submits actual usage (<strong className="text-[#f4f2fa]">T_used</strong>). The contract credits the seller for consumed tokens, deducts the 2.5% protocol fee, and <strong className="text-[#22c55e]">refunds all unspent MON to the buyer in the very same transaction</strong>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2a2638]/60 text-xs font-mono text-[#22c55e]">
                Instant refund • 2.5% protocol fee
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Monad Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-[#2a2638] bg-gradient-to-b from-[#15131d] to-[#0f0d17] p-8 sm:p-12 lg:p-16 space-y-10 shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/40">
              Documented Infrastructure Benchmarks
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#f4f2fa] tracking-tight">
              Why QuotaGrid is Built on Monad
            </h2>
            <p className="text-base sm:text-lg text-[#a39fb5] leading-relaxed">
              On Ethereum or standard L2s, per-call escrow is economically impossible — gas fees would exceed the token cost of the AI query itself, and 12-second block intervals would destroy conversational response latency. Monad makes per-call settlement viable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {/* Monad Fact 1 */}
            <div className="p-6 rounded-2xl bg-[#0b0a10] border border-[#2a2638] space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#8b5cf6]">
                300 ms
              </div>
              <div className="text-base font-bold text-[#f4f2fa]">
                Block Frequency
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Sub-second escrow confirmation allows AI agent workflows and user chat sessions to initiate without noticeable latency.
              </p>
            </div>

            {/* Monad Fact 2 */}
            <div className="p-6 rounded-2xl bg-[#0b0a10] border border-[#2a2638] space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#22c55e]">
                600 ms
              </div>
              <div className="text-base font-bold text-[#f4f2fa]">
                2-Block Finality
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Irreversible consensus finality in 2 blocks. No reorg risks for sellers, and immediate settlement certainty for buyers.
              </p>
            </div>

            {/* Monad Fact 3 */}
            <div className="p-6 rounded-2xl bg-[#0b0a10] border border-[#2a2638] space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#06b6d4]">
                100 nMON
              </div>
              <div className="text-base font-bold text-[#f4f2fa]">
                Sub-Cent Base Fee
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Minimum base fee of 100 MON-gwei means the smart contract escrow overhead adds negligible cost to every AI completion.
              </p>
            </div>

            {/* Monad Fact 4 */}
            <div className="p-6 rounded-2xl bg-[#0b0a10] border border-[#2a2638] space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#eab308]">
                10 MON
              </div>
              <div className="text-base font-bold text-[#f4f2fa]">
                Reserve Balance Rule
              </div>
              <p className="text-xs text-[#a39fb5] leading-relaxed">
                Asynchronous consensus rule safeguarding against invalid state dips. Enforced client-side in the SDK before transaction submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Feature Banner */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="p-8 md:p-12 rounded-3xl bg-[#15131d] border border-[#2a2638] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#8b5cf6]">
              Autonomous Infrastructure
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#f4f2fa]">
              Built for Token-Aware Autonomous Agents
            </h3>
            <p className="text-sm sm:text-base text-[#a39fb5] leading-relaxed">
              When your agent hits a primary rate limit (HTTP 429) or token budget threshold, the QuotaGrid SDK automatically opens an on-chain escrow from the agent&apos;s own Monad wallet, executes the prompt, and receives refunds for unused tokens.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
            <Link
              href="/agents"
              className="px-6 py-3.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold text-center transition-all"
            >
              Explore Agent Docs & SDK
            </Link>
            <Link
              href="/activity"
              className="px-6 py-3.5 rounded-xl bg-[#201d2d] hover:bg-[#2c283f] text-[#f4f2fa] border border-[#342e47] font-semibold text-center transition-all"
            >
              Live Feed Screen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
