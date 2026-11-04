import React from 'react';

/*
 * QuotaGrid's own illustrations. Every shape encodes the product:
 * violet = tokens used (paid to the seller), green = tokens refunded, amber = the agent's threshold.
 * Animations are CSS keyframes in globals.css and switch off under prefers-reduced-motion.
 */

/** Logo: a 3x3 quota grid. Five cells used, four refunded. */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const used = new Set([0, 1, 2, 3, 4]);
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" className={className} aria-hidden="true">
      {cells.map((i) => {
        const x = 1 + (i % 3) * 10;
        const y = 1 + Math.floor(i / 3) * 10;
        return used.has(i) ? (
          <rect key={i} x={x} y={y} width="8" height="8" rx="1.6" fill="#8b5cf6" />
        ) : (
          <rect key={i} x={x + 0.75} y={y + 0.75} width="6.5" height="6.5" rx="1.3" fill="none" stroke="#34d399" strokeWidth="1.5" />
        );
      })}
    </svg>
  );
}

const T_MAX = 146;
const T_USED = 60;
const COLS = 15;

/**
 * Hero: the real escrow of request #1 on contract v2, one cell per token.
 * Cells appear as escrowed, the first 60 fill as used, the other 86 turn green and are refunded.
 */
export function SettlementGrid() {
  const cell = 14;
  const gap = 4;
  const rows = Math.ceil(T_MAX / COLS);
  const w = COLS * (cell + gap) - gap;
  const h = rows * (cell + gap) - gap;
  return (
    <figure className="qg-settle select-none" aria-label="Request 1: 146 tokens escrowed, 60 used, 86 refunded in the same transaction">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
        {Array.from({ length: T_MAX }, (_, i) => {
          const used = i < T_USED;
          const x = (i % COLS) * (cell + gap);
          const y = Math.floor(i / COLS) * (cell + gap);
          return (
            <rect
              key={i}
              x={x + 0.75}
              y={y + 0.75}
              width={cell - 1.5}
              height={cell - 1.5}
              rx="2.5"
              className={used ? 'qg-cell qg-cell-used' : 'qg-cell qg-cell-refund'}
              style={{ animationDelay: `${(used ? i : i - T_USED) * 18}ms` }}
            />
          );
        })}
      </svg>
      <figcaption className="mt-5 grid grid-cols-3 gap-4 font-mono text-xs">
        <div>
          <div className="text-[#a39fb5]">escrowed</div>
          <div className="mt-1 text-lg text-[#f4f2fa]">146 tokens</div>
        </div>
        <div className="qg-phase-used">
          <div className="text-[#a39fb5]">used, paid to seller</div>
          <div className="mt-1 text-lg text-[#a78bfa]">60</div>
        </div>
        <div className="qg-phase-refund">
          <div className="text-[#a39fb5]">refunded, same tx</div>
          <div className="mt-1 text-lg text-[#34d399]">86</div>
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * The agent's own-key budget stepping 120 -> 99 -> 82 -> 48 (the rehearsal run, decisions.md D-028),
 * crossing the threshold at 50 and switching its route to QuotaGrid.
 */
export function BudgetGauge() {
  const W = 420;
  const thrX = (50 / 120) * W;
  return (
    <div className="qg-gauge" aria-label="Agent budget falls from 120 to 48 tokens, below the threshold of 50, and the agent switches to QuotaGrid">
      <svg viewBox={`0 0 ${W} 74`} className="w-full h-auto" role="img">
        <rect x="0" y="22" width={W} height="18" rx="9" fill="#1b1826" stroke="#2a2638" />
        <rect x="0" y="22" width={W} height="18" rx="9" className="qg-gauge-fill" />
        <line x1={thrX} x2={thrX} y1="14" y2="48" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
        <text x={thrX} y="64" textAnchor="middle" className="fill-[#f59e0b] font-mono" fontSize="11">threshold 50</text>
        <text x="0" y="12" className="fill-[#a39fb5] font-mono" fontSize="11">own-key budget</text>
        <text x={W} y="12" textAnchor="end" className="fill-[#a39fb5] font-mono" fontSize="11">120</text>
      </svg>
      <div className="mt-3 flex items-center gap-3 font-mono text-sm">
        <span className="text-[#a39fb5]">route</span>
        <span className="qg-route relative inline-block h-6 w-36">
          <span className="qg-route-a absolute inset-0 text-[#34d399]">own key</span>
          <span className="qg-route-b absolute inset-0 text-[#22d3ee]">QuotaGrid</span>
        </span>
      </div>
    </div>
  );
}

/** Small glyphs for the three-step list. Drawn, not picked from an icon set. */
export function GlyphSealedKey() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
      <rect x="6" y="17" width="28" height="18" rx="3" fill="none" stroke="#8b5cf6" strokeWidth="2" />
      <path d="M13 17v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#8b5cf6" strokeWidth="2" />
      <circle cx="20" cy="25" r="2.5" fill="#8b5cf6" />
      <path d="M20 27.5v3" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GlyphEscrow() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
      <rect x="5" y="12" width="30" height="20" rx="3" fill="none" stroke="#a39fb5" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={9 + i * 5} y="18" width="3.5" height="8" rx="1" fill={i < 2 ? '#8b5cf6' : '#2a2638'} />
      ))}
      <path d="M12 8h16" stroke="#a39fb5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GlyphSplit() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
      <path d="M6 20h10" stroke="#a39fb5" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20c6 0 8-9 16-9" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20c6 0 8 9 16 9" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <circle cx="33" cy="11" r="2.5" fill="#8b5cf6" />
      <circle cx="33" cy="29" r="2.5" fill="#34d399" />
    </svg>
  );
}
