'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useListings } from '@/hooks/useListings';
import { ListingCard } from '@/components/ListingCard';
import { ReserveWarning } from '@/components/ReserveWarning';
import { Button, Input } from '@/components/ui';
import { formatMON } from '@/lib/format';

export default function MarketPage() {
  const { listings, isLoading, error, refetch } = useListings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  // Sort: active first, then by pricePerKToken ascending
  const sortedListings = useMemo(() => {
    return [...(listings || [])].sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      if (a.pricePerKToken < b.pricePerKToken) return -1;
      if (a.pricePerKToken > b.pricePerKToken) return 1;
      return 0;
    });
  }, [listings]);

  // Filter by provider and search query
  const filteredListings = useMemo(() => {
    return sortedListings.filter((listing) => {
      // Provider filter
      if (selectedProvider !== 'all') {
        const p = listing.provider.toLowerCase();
        if (selectedProvider === 'anthropic' && !p.includes('anthropic') && !p.includes('claude')) return false;
        if (selectedProvider === 'gemini' && !p.includes('gemini') && !p.includes('google')) return false;
        if (selectedProvider === 'openai' && !p.includes('openai')) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesModel = listing.model.toLowerCase().includes(query);
        const matchesProvider = listing.provider.toLowerCase().includes(query);
        const matchesId = listing.id.toString() === query;
        if (!matchesModel && !matchesProvider && !matchesId) return false;
      }

      return true;
    });
  }, [sortedListings, selectedProvider, searchQuery]);

  // Quick stats
  const activeCount = useMemo(() => {
    return listings.filter((l) => l.active).length;
  }, [listings]);

  const lowestPrice = useMemo(() => {
    const active = listings.filter((l) => l.active && l.available > 0n);
    if (active.length === 0) return null;
    let min = active[0].pricePerKToken;
    for (const l of active) {
      if (l.pricePerKToken < min) min = l.pricePerKToken;
    }
    return min;
  }, [listings]);

  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Monad 10 MON reserve warning */}
        <ReserveWarning />

        {/* Hero & Market Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2a2638] pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs font-mono text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Per-Call Escrow Marketplace on Monad
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono text-[#f4f2fa]">
              AI Quota Market
            </h1>
            <p className="text-base sm:text-lg text-[#a39fb5] max-w-2xl">
              Buy surplus AI inference quota directly with escrowed MON. Pay only for tokens actually used — excess deposit is automatically refunded in the settlement tx.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 font-mono">
            <div className="rounded-xl border border-[#2a2638] bg-[#15131d] px-4 py-3 text-right">
              <div className="text-xs text-[#a39fb5]">Active Listings</div>
              <div className="text-xl font-bold text-purple-400">{activeCount}</div>
            </div>
            {lowestPrice !== null && (
              <div className="rounded-xl border border-[#2a2638] bg-[#15131d] px-4 py-3 text-right">
                <div className="text-xs text-[#a39fb5]">Floor Price / 1k</div>
                <div className="text-xl font-bold text-emerald-400">
                  {formatMON(lowestPrice, 4)} MON
                </div>
              </div>
            )}
            <Link href="/sell">
              <Button variant="primary" className="h-full py-3 px-5 whitespace-nowrap">
                + Sell Quota
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Provider Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#15131d] rounded-xl border border-[#2a2638]">
            {[
              { id: 'all', label: 'All Providers' },
              { id: 'anthropic', label: 'Anthropic' },
              { id: 'gemini', label: 'Google Gemini' },
              { id: 'openai', label: 'OpenAI-Compatible' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedProvider === p.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-[#a39fb5] hover:text-[#f4f2fa] hover:bg-[#2a2638]/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Input & Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#15131d] border-[#2a2638] text-sm text-[#f4f2fa] placeholder-[#a39fb5] rounded-xl focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a39fb5] hover:text-white"
                >
                  &times;
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              className="text-xs px-3 py-2 border-[#2a2638] bg-[#15131d] text-[#a39fb5] hover:text-[#f4f2fa]"
              title="Refresh listings from chain"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-5 text-rose-300 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Failed to load listings from Monad contract</p>
              <p className="text-xs text-rose-400 mt-0.5">{error.message}</p>
            </div>
            <Button variant="secondary" onClick={() => refetch()} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-xl border border-[#2a2638] bg-[#15131d] p-6 animate-pulse space-y-4"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-24 bg-[#2a2638] rounded" />
                  <div className="h-5 w-20 bg-[#2a2638] rounded" />
                </div>
                <div className="h-8 w-3/4 bg-[#2a2638] rounded" />
                <div className="h-14 w-full bg-[#0b0a10] rounded" />
                <div className="h-4 w-full bg-[#2a2638] rounded" />
                <div className="h-10 w-full bg-[#2a2638] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredListings.length === 0 && (
          <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-12 text-center my-8 max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 text-2xl font-mono">
              QG
            </div>
            <h3 className="text-xl font-bold font-mono text-[#f4f2fa]">
              {listings.length === 0
                ? 'No listings yet — be the first seller'
                : 'No matching listings found'}
            </h3>
            <p className="text-sm text-[#a39fb5] leading-relaxed">
              {listings.length === 0
                ? 'List your unused Claude, Gemini, or OpenAI API quota on Monad testnet and earn native MON for every token used.'
                : 'Try adjusting your search query or provider filter.'}
            </p>
            {listings.length === 0 ? (
              <div className="pt-2">
                <Link href="/sell">
                  <Button variant="primary" className="px-6 py-2.5">
                    List Your Quota
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedProvider('all');
                  setSearchQuery('');
                }}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Listings Grid */}
        {!isLoading && filteredListings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id.toString()} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
