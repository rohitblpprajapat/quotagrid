'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ReserveWarning } from '@/components/ReserveWarning';
import { ConnectButton } from '@/components/ConnectButton';
import { CreateListingForm } from '@/components/sell/CreateListingForm';
import { MyListings } from '@/components/sell/MyListings';
import { Earnings } from '@/components/sell/Earnings';
import { Card } from '@/components/ui';

export default function SellPage() {
  const { isConnected } = useAccount();
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleListingCreated = () => {
    // Increment trigger to signal listings refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30">
            <span>QuotaGrid Marketplace</span>
            <span>•</span>
            <span>Monad Blitz</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f4f2fa]">
            Sell AI API Quota
          </h1>

          <p className="text-base sm:text-lg text-[#a39fb5] max-w-3xl leading-relaxed">
            Monetize idle provider capacity without exposing plaintext keys. Buyers escrow the worst-case
            token cost in MON; you get paid automatically for every token consumed.
          </p>
        </div>

        {/* 3-Step Explainer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <Card className="p-5 bg-[#15131d] border border-[#2a2638] rounded-xl flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">
                  Step 01
                </span>
                <span className="text-xs text-[#a39fb5] font-mono">Client-side</span>
              </div>
              <h3 className="text-lg font-bold text-[#f4f2fa]">Encrypt key</h3>
              <p className="text-sm text-[#a39fb5] leading-relaxed">
                Your API key is encrypted in your browser with RSA-OAEP before touching the chain.
                The plaintext is never stored or revealed publicly.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-[#8b5cf6]/80 flex items-center gap-1">
              <span>WebCrypto RSA-2048</span>
              <span>→</span>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="p-5 bg-[#15131d] border border-[#2a2638] rounded-xl flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">
                  Step 02
                </span>
                <span className="text-xs text-[#a39fb5] font-mono">On-chain</span>
              </div>
              <h3 className="text-lg font-bold text-[#f4f2fa]">List quota</h3>
              <p className="text-sm text-[#a39fb5] leading-relaxed">
                Choose provider, model ID, token capacity, and rate per 1k tokens in MON.
                The encrypted ciphertext is stored on-chain in your listing.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-[#8b5cf6]/80 flex items-center gap-1">
              <span>createListing()</span>
              <span>→</span>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="p-5 bg-[#15131d] border border-[#2a2638] rounded-xl flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">
                  Step 03
                </span>
                <span className="text-xs text-[#22c55e] font-mono">Settlement</span>
              </div>
              <h3 className="text-lg font-bold text-[#f4f2fa]">Get paid per token used</h3>
              <p className="text-sm text-[#a39fb5] leading-relaxed">
                Buyers escrow worst-case cost (T_max). When executed, the operator settles on-chain:
                you receive payout for T_used, and excess escrow is refunded.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-[#22c55e] flex items-center gap-1">
              <span>settle() & withdraw()</span>
              <span>✓</span>
            </div>
          </Card>
        </div>

        {/* Reserve Warning (D-015: EOAs must maintain >= 10 MON) */}
        <ReserveWarning />

        {/* Connect Wallet banner if disconnected */}
        {!isConnected && (
          <Card className="p-6 bg-[#15131d] border border-[#8b5cf6]/40 rounded-xl text-center space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-[#f4f2fa]">Connect Wallet to Manage Listings</h2>
              <p className="text-sm text-[#a39fb5]">
                Connect your Monad testnet wallet to list your API quota, manage active offers, and withdraw earnings.
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <ConnectButton />
            </div>
          </Card>
        )}

        {/* Section 1: Earnings & Withdrawals */}
        <section aria-labelledby="earnings-heading">
          <Earnings />
        </section>

        {/* Section 2: Create Listing Form */}
        <section aria-labelledby="create-listing-heading">
          <CreateListingForm onListingCreated={handleListingCreated} />
        </section>

        {/* Section 3: My Active Listings */}
        <section aria-labelledby="my-listings-heading">
          <MyListings key={refreshTrigger} />
        </section>
      </div>
    </div>
  );
}
