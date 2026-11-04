'use client';

import { useQuery } from '@tanstack/react-query';
import { publicClient, CONTRACT_ADDRESS } from '@/lib/chain';
import { quotaGridAbi } from '@/lib/abi';
import type { Listing } from '@/lib/types';

export function useListings(): {
  listings: Listing[];
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['listings'],
    queryFn: async (): Promise<Listing[]> => {
      const count = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: quotaGridAbi,
        functionName: 'listingCount',
      })) as bigint;

      const total = Number(count);
      if (total === 0) return [];

      const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const [listingData, avail] = await Promise.all([
              publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: quotaGridAbi,
                functionName: 'getListing',
                args: [id],
              }) as Promise<{
                seller: `0x${string}`;
                provider: string;
                model: string;
                pricePerKToken: bigint;
                quotaTotal: bigint;
                quotaUsed: bigint;
                quotaLocked: bigint;
                active: boolean;
                encryptedKey: `0x${string}`;
              }>,
              publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: quotaGridAbi,
                functionName: 'available',
                args: [id],
              }) as Promise<bigint>,
            ]);

            const item: Listing = {
              id,
              seller: listingData.seller,
              provider: listingData.provider,
              model: listingData.model,
              pricePerKToken: listingData.pricePerKToken,
              quotaTotal: listingData.quotaTotal,
              quotaUsed: listingData.quotaUsed,
              quotaLocked: listingData.quotaLocked,
              active: listingData.active,
              available: avail,
            };
            return item;
          } catch {
            return null;
          }
        })
      );

      return results.filter((item): item is Listing => item !== null);
    },
    refetchInterval: 5000,
  });

  return {
    listings: query.data || [],
    isLoading: query.isLoading,
    error: (query.error as Error) || undefined,
    refetch: () => {
      query.refetch();
    },
  };
}

export function useListing(id: bigint): {
  listing?: Listing;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['listing', id?.toString()],
    enabled: typeof id === 'bigint' && id > 0n,
    queryFn: async (): Promise<Listing | null> => {
      if (!id || id <= 0n) return null;

      const [listingData, avail] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: quotaGridAbi,
          functionName: 'getListing',
          args: [id],
        }) as Promise<{
          seller: `0x${string}`;
          provider: string;
          model: string;
          pricePerKToken: bigint;
          quotaTotal: bigint;
          quotaUsed: bigint;
          quotaLocked: bigint;
          active: boolean;
          encryptedKey: `0x${string}`;
        }>,
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: quotaGridAbi,
          functionName: 'available',
          args: [id],
        }) as Promise<bigint>,
      ]);

      return {
        id,
        seller: listingData.seller,
        provider: listingData.provider,
        model: listingData.model,
        pricePerKToken: listingData.pricePerKToken,
        quotaTotal: listingData.quotaTotal,
        quotaUsed: listingData.quotaUsed,
        quotaLocked: listingData.quotaLocked,
        active: listingData.active,
        available: avail,
      };
    },
    refetchInterval: 5000,
  });

  return {
    listing: query.data || undefined,
    isLoading: query.isLoading,
    error: (query.error as Error) || undefined,
    refetch: () => {
      query.refetch();
    },
  };
}
