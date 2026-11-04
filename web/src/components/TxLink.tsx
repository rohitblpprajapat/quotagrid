'use client';

import React from 'react';
import { explorerTx } from '@/lib/chain';
import { shortHash } from '@/lib/format';

export interface TxLinkProps {
  hash: string;
  label?: string;
  className?: string;
}

export function TxLink({ hash, label, className = '' }: TxLinkProps) {
  if (!hash) return null;

  const url = explorerTx(hash);
  const displayText = label || shortHash(hash);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 font-mono text-sm text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 transition-colors ${className}`}
      title={hash}
    >
      <span>{displayText}</span>
      <svg
        className="w-3.5 h-3.5 inline-block opacity-75 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

export default TxLink;
