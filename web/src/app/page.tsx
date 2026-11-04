'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { publicClient, CONTRACT_ADDRESS, explorerTx, explorerAddress } from '@/lib/chain';
import { quotaGridAbi } from '@/lib/abi';
import { shortAddr } from '@/lib/format';
import { SettlementGrid, BudgetGauge, GlyphSealedKey, GlyphEscrow, GlyphSplit } from '@/components/brand';

// Request #1 on contract v2 (decisions.md D-032): escrow 146 tokens, used 60, refund in the settle tx, 4.2 s.
const SETTLE_TX = '0x94ec7ed09b13db9c8562095c1b89e671055de7414c7e59f2b948586abd72dda2';

/** Adds .is-in when the element scrolls into view (CSS handles the motion). */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), io.unobserve(e.target))),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function LiveStrip() {
  const [s, setS] = useState<{ listings?: bigint; requests?: bigint; block?: bigint }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [listings, requests, block] = await Promise.all([
          (publicClient as any).readContract({ address: CONTRACT_ADDRESS, abi: quotaGridAbi, functionName: 'listingCount' }),
          (publicClient as any).readContract({ address: CONTRACT_ADDRESS, abi: quotaGridAbi, functionName: 'requestCount' }),
          publicClient.getBlockNumber(),
        ]);
        if (!alive) return;
        setS((prev) => {
          if (prev.block !== BigInt(block)) setTick((t) => t + 1);
          return { listings: BigInt(listings), requests: BigInt(requests), block: BigInt(block) };
        });
      } catch {
        /* keep last values; the strip shows dashes until the first read succeeds */
      }
    }
    load();
    // The public Monad RPC rate-limits (429); poll gently and not at all in a background tab.
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const v = (x?: bigint) => (x === undefined ? '–' : x.toString());
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-[#a39fb5]">
      <span>
        live from{' '}
        <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="text-[#f4f2fa] underline decoration-[#2a2638] underline-offset-4 hover:decoration-[#8b5cf6]">
          {shortAddr(CONTRACT_ADDRESS)}
        </a>
      </span>
      <span><span className="text-[#f4f2fa]">{v(s.listings)}</span> listings</span>
      <span><span className="text-[#f4f2fa]">{v(s.requests)}</span> requests</span>
      <span>
        block <span key={tick} className="qg-tick text-[#f4f2fa]">{v(s.block)}</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  const agentsRef = useReveal<HTMLElement>();
  const stepsRef = useReveal<HTMLElement>();
  const monadRef = useReveal<HTMLElement>();

  return (
    <div className="text-[#f4f2fa]">
      {/* Hero: the claim on the left, the actual settlement on the right */}
      <section className="grid items-center gap-12 pt-6 pb-16 md:pt-14 md:pb-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Pay for the tokens you used.
            <br />
            <span className="text-[#a39fb5]">Get the rest back in the same transaction.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#a39fb5]">
            QuotaGrid lets people sell spare AI API quota without handing over their key. A buyer, or their agent, escrows
            the worst-case cost in MON on Monad. When the model answers, the seller is paid for what was used and the
            remainder goes straight back.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/market"
              className="rounded-lg bg-[#8b5cf6] px-6 py-3 font-medium text-white transition-colors hover:bg-[#7c3aed] active:translate-y-px"
            >
              Make a live call
            </Link>
            <Link href="/sell" className="font-medium text-[#f4f2fa] underline decoration-[#2a2638] underline-offset-[6px] hover:decoration-[#8b5cf6]">
              Sell your quota
            </Link>
            <Link href="/agents" className="font-medium text-[#f4f2fa] underline decoration-[#2a2638] underline-offset-[6px] hover:decoration-[#8b5cf6]">
              Use it from an agent
            </Link>
          </div>
          <div className="mt-12">
            <LiveStrip />
          </div>
        </div>

        <div className="rounded-2xl border border-[#2a2638] bg-[#100e17] p-6 sm:p-8">
          <div className="mb-5 flex items-baseline justify-between gap-4 font-mono text-xs text-[#a39fb5]">
            <span>request #1 · one cell per token</span>
            <a href={explorerTx(SETTLE_TX)} target="_blank" rel="noreferrer" className="hover:text-[#f4f2fa]">
              settle tx ↗
            </a>
          </div>
          <SettlementGrid />
          <p className="mt-5 border-t border-[#2a2638] pt-4 text-sm text-[#a39fb5]">
            4.2 s from escrow to settlement on Monad testnet. Seller paid 0.0000585 MON, 2.5% fee, 0.000086 MON refunded.
          </p>
        </div>
      </section>

      {/* Agents: the differentiator gets the space */}
      <section ref={agentsRef} className="qg-reveal grid gap-12 border-t border-[#2a2638] py-16 md:py-24 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Agents that don&apos;t stop when their tokens run out.</h2>
          <p className="mt-5 max-w-lg leading-relaxed text-[#a39fb5]">
            An agent runs on its own key with a token budget. When the budget drops below its threshold, or the provider
            answers 429, the QuotaGrid SDK buys the next call from its own Monad wallet: cheapest matching listing,
            exact quote, escrow, answer, refund. No human, no card.
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-[#a39fb5]">
            Use the TypeScript wrapper, the MCP server, or point an OpenAI- or Gemini-compatible client at the local proxy.
          </p>
          <Link href="/agents" className="mt-6 inline-block font-medium text-[#f4f2fa] underline decoration-[#2a2638] underline-offset-[6px] hover:decoration-[#8b5cf6]">
            Agent setup
          </Link>
        </div>
        <div className="rounded-2xl border border-[#2a2638] bg-[#100e17] p-6 sm:p-8">
          <BudgetGauge />
          <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0b0a10] p-4 font-mono text-[12.5px] leading-6 text-[#a39fb5]">
{`step 1  own key    budget 120 -> 99
step 2  own key    budget 99 -> 82
step 3  own key    budget 82 -> 48
`}<span className="text-[#f59e0b]">SWITCH  budget_threshold (48 &lt; 50)</span>{`
step 4  `}<span className="text-[#22d3ee]">QuotaGrid</span>{`  escrow -> answer -> refund`}
          </pre>
          <p className="mt-3 font-mono text-[11px] text-[#5d5870]">from the rehearsal run of sdk demo-agent, 4 Nov 2026</p>
        </div>
      </section>

      {/* How a call works: a list, because it is a sequence */}
      <section ref={stepsRef} className="qg-reveal border-t border-[#2a2638] py-16 md:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What happens in one call</h2>
        <ol className="mt-10 divide-y divide-[#2a2638] border-y border-[#2a2638]">
          {[
            {
              g: <GlyphSealedKey />,
              t: 'The seller’s key is sealed in their browser',
              d: 'It is encrypted to the operator’s RSA key before it leaves the page, checked with one real call so a dead key can’t be listed, and stored on-chain only as ciphertext.',
            },
            {
              g: <GlyphEscrow />,
              t: 'The buyer escrows the worst case',
              d: 'Input tokens are counted exactly and the output cap is added: that is T_max. The prompt is bound to the escrow by its keccak256 hash, so the deposit can’t be spent on anything else.',
            },
            {
              g: <GlyphSplit />,
              t: 'One settlement splits it three ways',
              d: 'The seller is paid for T_used, the protocol takes 2.5%, and the rest is refunded in the same transaction. If the provider fails the buyer gets 100% back; if the operator vanishes the buyer reclaims after 10 minutes.',
            },
          ].map((s, i) => (
            <li key={i} className="grid gap-4 py-7 sm:grid-cols-[3rem_16rem_1fr] sm:gap-8">
              <div>{s.g}</div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="leading-relaxed text-[#a39fb5]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why Monad: two sourced facts and one measured number, no fact cards */}
      <section ref={monadRef} className="qg-reveal border-t border-[#2a2638] py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why this needs Monad</h2>
          <div className="space-y-4 leading-relaxed text-[#a39fb5]">
            <p>
              Every AI call here is its own escrow and its own settlement. That only feels like an API call if blocks are fast
              and final: Monad produces a block every <span className="text-[#f4f2fa]">300 ms</span> and finalises in{' '}
              <span className="text-[#f4f2fa]">two blocks</span>. Our measured round trip, escrow to refund, is{' '}
              <span className="text-[#f4f2fa]">4.2 s</span>, most of it the model thinking.
            </p>
            <p>
              Gas is the open problem: settling still costs more than a tiny call earns. Today the protocol treasury pays
              settlement gas; a prepaid tab that settles many calls at once is next.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
