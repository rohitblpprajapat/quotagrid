'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { quotaGridAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS, publicClient, monad } from '@/lib/chain';
import { Listing } from '@/lib/types';
import { formatMON, parseMON, pricePer1kLabel } from '@/lib/format';
import { useListings } from '@/hooks/useListings';
import { Card, Button, Badge, Input, Field, Mono, Stat } from '@/components/ui';
import { TxLink } from '@/components/TxLink';

import { useEnsureMonad } from '@/hooks/useEnsureMonad';

interface ListingItemProps {
  listing: Listing;
  onUpdated: () => void;
}

function ListingItem({ listing, onUpdated }: ListingItemProps) {
  const { writeContractAsync } = useWriteContract();
  const { ensureMonad } = useEnsureMonad();

  // Inline edit state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editPrice, setEditPrice] = useState<string>(() =>
    formatMON(listing.pricePerKToken)
  );
  const [addQuota, setAddQuota] = useState<string>('0');
  const [editActive, setEditActive] = useState<boolean>(listing.active);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateTx, setUpdateTx] = useState<`0x${string}` | null>(null);

  // Sync state if listing props update externally
  useEffect(() => {
    if (!isEditing) {
      setEditPrice(formatMON(listing.pricePerKToken));
      setEditActive(listing.active);
    }
  }, [listing.pricePerKToken, listing.active, isEditing]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateTx(null);

    let parsedPrice: bigint;
    try {
      parsedPrice = parseMON(editPrice);
      if (parsedPrice <= 0n) {
        throw new Error('Price must be greater than 0');
      }
    } catch {
      setUpdateError('Invalid price. Please enter a positive MON amount.');
      return;
    }

    let parsedAddQuota: bigint;
    try {
      parsedAddQuota = BigInt(addQuota.trim() || '0');
      if (parsedAddQuota < 0n) {
        throw new Error('Added quota cannot be negative');
      }
    } catch {
      setUpdateError('Invalid added quota. Must be 0 or a positive integer.');
      return;
    }

    setIsUpdating(true);
    try {
      await ensureMonad();
      const hash = await writeContractAsync({
        chainId: monad.id,
        address: CONTRACT_ADDRESS,
        abi: quotaGridAbi,
        functionName: 'updateListing',
        args: [listing.id, parsedPrice, parsedAddQuota, editActive],
      });

      setUpdateTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setAddQuota('0');
      setIsEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update listing';
      setUpdateError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute quota percentages for visual indicator
  const total = listing.quotaTotal > 0n ? Number(listing.quotaTotal) : 1;
  const usedPct = Math.min(100, Math.round((Number(listing.quotaUsed) / total) * 100));
  const lockedPct = Math.min(100 - usedPct, Math.round((Number(listing.quotaLocked) / total) * 100));
  const availPct = Math.max(0, 100 - usedPct - lockedPct);

  return (
    <Card className="p-6 bg-[#15131d] border border-[#2a2638] rounded-xl text-[#f4f2fa] space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2a2638]">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded bg-[#0b0a10] border border-[#2a2638] font-mono text-[#a39fb5]">
            #{listing.id.toString()}
          </span>
          <span className="text-sm font-semibold capitalize px-2.5 py-0.5 rounded bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#f4f2fa]">
            {listing.provider}
          </span>
          <Mono className="text-base font-bold text-[#f4f2fa]">{listing.model}</Mono>
        </div>

        <div className="flex items-center gap-3">
          {listing.active ? (
            <Badge tone="green" className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40">
              Active
            </Badge>
          ) : (
            <Badge tone="amber" className="bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
              Paused
            </Badge>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              setIsEditing(!isEditing);
              setUpdateError(null);
            }}
            className="text-xs text-[#a39fb5] hover:text-[#f4f2fa]"
          >
            {isEditing ? 'Cancel' : 'Edit Listing'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          label="Available"
          value={listing.available.toLocaleString()}
          hint="Ready for buyers"
        />
        <Stat
          label="Used"
          value={listing.quotaUsed.toLocaleString()}
          hint="Consumed tokens"
        />
        <Stat
          label="Locked"
          value={listing.quotaLocked.toLocaleString()}
          hint="Open escrows"
        />
        <Stat
          label="Current Price"
          value={pricePer1kLabel(listing.pricePerKToken)}
          hint="Per 1,000 tokens"
        />
      </div>

      {/* Visual Quota Allocation Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-[#a39fb5]">
          <span>
            Quota Pool: <Mono>{listing.quotaTotal.toLocaleString()}</Mono> total
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" /> Used ({usedPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Locked ({lockedPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Available ({availPct}%)
            </span>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-[#0b0a10] border border-[#2a2638] overflow-hidden flex">
          <div
            className="bg-[#8b5cf6] h-full transition-all duration-300"
            style={{ width: `${usedPct}%` }}
            title={`Used: ${listing.quotaUsed.toLocaleString()}`}
          />
          <div
            className="bg-[#f59e0b] h-full transition-all duration-300"
            style={{ width: `${lockedPct}%` }}
            title={`Locked: ${listing.quotaLocked.toLocaleString()}`}
          />
          <div
            className="bg-[#22c55e] h-full transition-all duration-300"
            style={{ width: `${availPct}%` }}
            title={`Available: ${listing.available.toLocaleString()}`}
          />
        </div>
      </div>

      {/* Update confirmation transaction link if present */}
      {updateTx && (
        <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-between text-xs text-[#22c55e]">
          <span>Listing updated successfully!</span>
          <TxLink hash={updateTx} label="View Update Tx" />
        </div>
      )}

      {/* Inline Edit Form */}
      {isEditing && (
        <form
          onSubmit={handleUpdate}
          className="pt-4 border-t border-[#2a2638] bg-[#0b0a10]/50 -mx-6 -mb-6 p-6 rounded-b-xl space-y-4"
        >
          <div className="text-sm font-semibold text-[#f4f2fa]">
            Update Listing #{listing.id.toString()}
          </div>

          {updateError && (
            <div className="p-3 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#ef4444]">
              {updateError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Price per 1k (MON)" hint="Update unit price">
              <Input
                type="text"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                disabled={isUpdating}
                className="w-full bg-[#15131d] border border-[#2a2638] rounded-lg px-3 py-1.5 text-sm text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
              />
            </Field>

            <Field label="Add Quota (Tokens)" hint="Amount to add (0 for none)">
              <Input
                type="number"
                min="0"
                step="1"
                value={addQuota}
                onChange={(e) => setAddQuota(e.target.value)}
                disabled={isUpdating}
                placeholder="0"
                className="w-full bg-[#15131d] border border-[#2a2638] rounded-lg px-3 py-1.5 text-sm text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
              />
            </Field>

            <Field label="Listing Status" hint="Pause or activate buyers">
              <div className="flex items-center h-10 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    disabled={isUpdating}
                    className="w-4 h-4 rounded border-[#2a2638] bg-[#15131d] accent-[#8b5cf6] focus:ring-0"
                  />
                  <span className={editActive ? 'text-[#22c55e] font-medium' : 'text-[#a39fb5]'}>
                    {editActive ? 'Active (Accepting requests)' : 'Paused (Disabled)'}
                  </span>
                </label>
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isUpdating}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isUpdating}
              disabled={isUpdating}
              className="text-xs"
            >
              {isUpdating ? 'Saving Changes...' : 'Save Updates'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function MyListings() {
  const { address, isConnected } = useAccount();
  const { listings, isLoading, error, refetch } = useListings();

  const myListings = address
    ? listings.filter((l) => l.seller.toLowerCase() === address.toLowerCase())
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#f4f2fa]">My Active Listings</h2>
          <p className="text-sm text-[#a39fb5] mt-0.5">
            Manage your token pools, update rates, or pause listings.
          </p>
        </div>
        {isConnected && myListings.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs text-[#a39fb5] hover:text-[#f4f2fa]"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>

      {!isConnected ? (
        <Card className="p-8 text-center bg-[#15131d] border border-[#2a2638] rounded-xl text-[#a39fb5]">
          <p className="text-base text-[#f4f2fa] font-medium mb-1">Wallet Not Connected</p>
          <p className="text-sm">Connect your wallet to view and manage your QuotaGrid listings.</p>
        </Card>
      ) : isLoading && myListings.length === 0 ? (
        <Card className="p-8 text-center bg-[#15131d] border border-[#2a2638] rounded-xl text-[#a39fb5]">
          <div className="inline-block w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm font-mono">Loading your listings from Monad...</p>
        </Card>
      ) : error ? (
        <Card className="p-6 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl text-[#ef4444] text-sm">
          <div className="font-semibold mb-1">Failed to Load Listings</div>
          <div>{error.message || 'Could not query contract listings.'}</div>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </Card>
      ) : myListings.length === 0 ? (
        <Card className="p-10 text-center bg-[#15131d] border border-[#2a2638] rounded-xl space-y-2">
          <div className="text-base font-semibold text-[#f4f2fa]">
            No listings yet — be the first seller
          </div>
          <p className="text-sm text-[#a39fb5] max-w-md mx-auto">
            You haven't listed any AI API quota yet. Use the listing form above to deposit your sealed key and start earning MON.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {myListings.map((listing) => (
            <ListingItem
              key={listing.id.toString()}
              listing={listing}
              onUpdated={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
