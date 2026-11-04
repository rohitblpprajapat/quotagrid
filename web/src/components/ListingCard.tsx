'use client';

import React from 'react';
import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { pricePer1kLabel, shortAddr } from '@/lib/format';
import { Card, Badge, Button, Mono } from '@/components/ui';

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

function formatTokens(t: bigint): string {
  return t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getProviderName(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes('anthropic') || p.includes('claude')) return 'Anthropic';
  if (p.includes('gemini') || p.includes('google')) return 'Google Gemini';
  if (p.includes('openai')) return 'OpenAI';
  return provider;
}

export function ListingCard({ listing, className = '' }: ListingCardProps) {
  const isAvailable = listing.active && listing.available > 0n;

  // Calculate percentage of quota remaining
  const quotaPct =
    listing.quotaTotal > 0n
      ? Math.min(
          100,
          Math.max(0, Number((listing.available * 100n) / listing.quotaTotal))
        )
      : 0;

  return (
    <Card
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#2a2638] bg-[#15131d] p-6 transition-all duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-950/20 ${
        !listing.active ? 'opacity-50' : ''
      } ${className}`}
    >
      {/* Top Header: Provider Badge & Status */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-950/60 border border-purple-500/30 text-purple-300 font-medium px-2.5 py-0.5 text-xs">
            {getProviderName(listing.provider)}
          </Badge>
          {!listing.active && (
            <Badge className="bg-amber-950/60 border border-amber-500/30 text-amber-300 font-medium px-2 py-0.5 text-xs">
              Inactive
            </Badge>
          )}
        </div>
        <div className="text-xs text-[#a39fb5]">
          <span className="mr-1">Seller:</span>
          <Mono className="text-xs text-[#f4f2fa]">{shortAddr(listing.seller)}</Mono>
        </div>
      </div>

      {/* Model Name (Large) */}
      <div className="mb-4">
        <h3
          className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#f4f2fa] truncate"
          title={listing.model}
        >
          {listing.model}
        </h3>
        <p className="text-xs text-[#a39fb5] mt-1 font-mono">
          Listing #{listing.id.toString()}
        </p>
      </div>

      {/* Price Section */}
      <div className="mb-5 rounded-lg border border-[#2a2638] bg-[#0b0a10] p-3.5">
        <div className="text-xs uppercase tracking-wider text-[#a39fb5] mb-1 font-medium">
          Price per 1k Tokens
        </div>
        <div className="text-lg sm:text-xl font-bold font-mono text-purple-400">
          {pricePer1kLabel(listing.pricePerKToken)}
        </div>
      </div>

      {/* Quota Progress Bar */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#a39fb5]">Available Quota</span>
          <span className="text-[#f4f2fa] font-semibold">
            {formatTokens(listing.available)}{' '}
            <span className="text-[#a39fb5]">/ {formatTokens(listing.quotaTotal)} tok</span>
          </span>
        </div>

        {/* Bar */}
        <div className="h-2.5 w-full rounded-full bg-[#0b0a10] overflow-hidden border border-[#2a2638]">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              quotaPct > 30
                ? 'bg-purple-500'
                : quotaPct > 10
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#a39fb5]">
          <span>{quotaPct}% remaining</span>
          {listing.quotaLocked > 0n && (
            <span>{formatTokens(listing.quotaLocked)} locked in escrow</span>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div>
        {isAvailable ? (
          <Link href={`/buy/${listing.id.toString()}`} className="block w-full">
            <Button variant="primary" className="w-full py-2.5 font-medium">
              Use this model &rarr;
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            disabled
            className="w-full py-2.5 opacity-50 cursor-not-allowed"
          >
            {!listing.active ? 'Listing Inactive' : 'Out of Quota'}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default ListingCard;
