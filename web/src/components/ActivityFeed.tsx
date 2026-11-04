'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { quotaGridAbi } from '@/lib/abi';
import { publicClient, CONTRACT_ADDRESS } from '@/lib/chain';
import { formatMON, shortAddr } from '@/lib/format';
import { TxLink } from '@/components/TxLink';

export interface FeedEvent {
  id: string; // `${txHash}-${logIndex}`
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  timestamp: number;
  isNew?: boolean;
  args: Record<string, any>;
}

export interface ActivityFeedProps {
  maxEvents?: number;
  compact?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 2) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export function ActivityFeed({ maxEvents = 100, compact = false }: ActivityFeedProps) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [currentBlock, setCurrentBlock] = useState<bigint | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'SETTLED' | 'REQUESTS' | 'LISTINGS'>('ALL');
  const [, setTick] = useState(0);

  // Keep a cursor for the latest block processed
  const cursorRef = useRef<bigint | null>(null);
  const isFetchingRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const blockRangeRef = useRef<bigint>(5000n);

  // Tick relative time every second
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll Monad on-chain events every 1 second
  useEffect(() => {
    let isMounted = true;

    async function pollEvents() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const latest = await publicClient.getBlockNumber();
        if (!isMounted) return;
        setCurrentBlock(latest);

        let fromBlock: bigint;
        let toBlock = latest;

        if (cursorRef.current === null) {
          // Initial run: attempt lookback of ~5000 blocks
          fromBlock = latest > blockRangeRef.current ? latest - blockRangeRef.current : 0n;
        } else {
          if (latest <= cursorRef.current) {
            isFetchingRef.current = false;
            return;
          }
          fromBlock = cursorRef.current + 1n;
          // Protect against huge range if tab was asleep
          if (toBlock - fromBlock > 500n) {
            fromBlock = toBlock - 500n;
          }
        }

        let logs: any[] = [];
        try {
          logs = await (publicClient as any).getContractEvents({
            address: CONTRACT_ADDRESS,
            abi: quotaGridAbi,
            fromBlock,
            toBlock,
          });
        } catch (fetchErr: any) {
          // If the RPC rejected the large block range, fall back to smaller 100-block range
          console.warn('getContractEvents range query error, falling back to 100 blocks:', fetchErr?.message);
          blockRangeRef.current = 100n;
          const fallbackFrom = toBlock > 100n ? toBlock - 100n : 0n;
          try {
            logs = await (publicClient as any).getContractEvents({
              address: CONTRACT_ADDRESS,
              abi: quotaGridAbi,
              fromBlock: fallbackFrom,
              toBlock,
            });
          } catch (retryErr) {
            console.error('getContractEvents retry failed:', retryErr);
          }
        }

        cursorRef.current = toBlock;

        if (!isMounted || !logs || logs.length === 0) {
          isFetchingRef.current = false;
          return;
        }

        const newParsed: FeedEvent[] = [];
        const now = Date.now();

        for (const log of logs) {
          const uniqueId = `${log.transactionHash}-${log.logIndex ?? 0}`;
          if (!seenIdsRef.current.has(uniqueId)) {
            seenIdsRef.current.add(uniqueId);

            // Estimate event timestamp from Monad 300ms block time
            const blockDiff = Number(latest - BigInt(log.blockNumber));
            const estTimestamp = now - Math.max(0, blockDiff * 300);

            newParsed.push({
              id: uniqueId,
              eventName: log.eventName,
              blockNumber: BigInt(log.blockNumber),
              transactionHash: log.transactionHash,
              logIndex: Number(log.logIndex ?? 0),
              timestamp: estTimestamp,
              isNew: cursorRef.current !== null, // Only animate if not the very first bulk load
              args: log.args || {},
            });
          }
        }

        if (newParsed.length > 0) {
          setEvents((prev) => {
            const combined = [...newParsed, ...prev];
            // Sort newest block first, then highest logIndex
            combined.sort((a, b) => {
              if (b.blockNumber !== a.blockNumber) {
                return b.blockNumber > a.blockNumber ? 1 : -1;
              }
              return b.logIndex - a.logIndex;
            });
            return combined.slice(0, maxEvents);
          });

          // Unset isNew highlight after 2.5s
          setTimeout(() => {
            if (isMounted) {
              setEvents((current) =>
                current.map((e) => (e.isNew ? { ...e, isNew: false } : e))
              );
            }
          }, 2500);
        }
      } catch (err) {
        console.error('Error polling contract events from Monad:', err);
      } finally {
        isFetchingRef.current = false;
      }
    }

    // Trigger initial poll immediately
    pollEvents();
    const interval = setInterval(pollEvents, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [maxEvents]);

  // Aggregate Counters
  const { totalEventsSeen, settlementsCount, totalRefundedWei } = useMemo(() => {
    let settlements = 0;
    let refundedWei = 0n;

    for (const ev of events) {
      if (ev.eventName === 'RequestSettled') {
        settlements++;
        if (ev.args.refund) {
          refundedWei += BigInt(ev.args.refund);
        }
      } else if (ev.eventName === 'RequestCancelled') {
        if (ev.args.refund) {
          refundedWei += BigInt(ev.args.refund);
        }
      }
    }

    return {
      totalEventsSeen: events.length,
      settlementsCount: settlements,
      totalRefundedWei: refundedWei,
    };
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events;
    if (filter === 'SETTLED') return events.filter((e) => e.eventName === 'RequestSettled');
    if (filter === 'REQUESTS')
      return events.filter(
        (e) => e.eventName === 'RequestOpened' || e.eventName === 'RequestCancelled'
      );
    if (filter === 'LISTINGS')
      return events.filter(
        (e) => e.eventName === 'ListingCreated' || e.eventName === 'ListingUpdated'
      );
    return events;
  }, [events, filter]);

  return (
    <div className="w-full space-y-6">
      {/* Header Projector Stats (Readable from 10m) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Events Seen */}
        <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-medium text-[#a39fb5] uppercase tracking-wider">
            <span>Events Observed</span>
            <span className="flex items-center space-x-1.5 text-xs text-[#22c55e]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
              </span>
              <span>1s Live</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl lg:text-4xl font-mono font-bold text-[#f4f2fa] tracking-tight">
              {totalEventsSeen.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#a39fb5]/80">
            Across Monad testnet blocks
          </p>
        </div>

        {/* Metric 2: Settlements */}
        <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-5 flex flex-col justify-between shadow-md">
          <div className="text-xs font-medium text-[#a39fb5] uppercase tracking-wider">
            Settlements Executed
          </div>
          <div className="mt-3">
            <span className="text-3xl lg:text-4xl font-mono font-bold text-[#8b5cf6] tracking-tight">
              {settlementsCount.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#a39fb5]/80">
            Per-call atomic settlements
          </p>
        </div>

        {/* Metric 3: Total MON Refunded */}
        <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-5 flex flex-col justify-between shadow-md">
          <div className="text-xs font-medium text-[#a39fb5] uppercase tracking-wider">
            Total Refunded to Buyers
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl lg:text-4xl font-mono font-bold text-[#22c55e] tracking-tight">
              {formatMON(totalRefundedWei, 4)}
            </span>
            <span className="font-mono text-sm text-[#22c55e]/90 font-semibold">MON</span>
          </div>
          <p className="mt-2 text-xs text-[#22c55e]/80">
            Unused T_max returned in same tx
          </p>
        </div>

        {/* Metric 4: Monad Chain Status */}
        <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-5 flex flex-col justify-between shadow-md">
          <div className="text-xs font-medium text-[#a39fb5] uppercase tracking-wider flex items-center justify-between">
            <span>Monad Testnet</span>
            <span className="font-mono text-[11px] text-[#a39fb5]">300ms Blocks</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-mono font-bold text-[#f4f2fa] tracking-tight">
              {currentBlock ? `#${currentBlock.toLocaleString()}` : 'Connecting...'}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#a39fb5]/80">
            Finality: 2 blocks (600 ms)
          </p>
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-1.5 bg-[#15131d] p-1 rounded-xl border border-[#2a2638]">
          {(['ALL', 'SETTLED', 'REQUESTS', 'LISTINGS'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab
                  ? 'bg-[#8b5cf6] text-white shadow-sm'
                  : 'text-[#a39fb5] hover:text-[#f4f2fa] hover:bg-[#201d2d]'
              }`}
            >
              {tab === 'ALL' && 'All Events'}
              {tab === 'SETTLED' && 'Settlements'}
              {tab === 'REQUESTS' && 'Requests'}
              {tab === 'LISTINGS' && 'Listings'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-[#a39fb5]">
          <span>Showing {filteredEvents.length} events</span>
          <span className="text-[#3b3452]">•</span>
          <span className="text-[#22c55e]">Auto-refreshing 1s</span>
        </div>
      </div>

      {/* Event Stream List */}
      <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] overflow-hidden shadow-xl">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#201d30] border border-[#2e2946] text-[#8b5cf6]">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="text-lg font-medium text-[#f4f2fa]">
              Listening for events on Monad testnet...
            </div>
            <p className="text-sm text-[#a39fb5] max-w-md mx-auto">
              Watching smart contract <span className="font-mono text-xs text-[#8b5cf6]">{shortAddr(CONTRACT_ADDRESS)}</span>.
              New listings, escrows, and settlements will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2638]/60">
            {filteredEvents.map((ev) => {
              const isSettled = ev.eventName === 'RequestSettled';
              const isOpened = ev.eventName === 'RequestOpened';
              const isCreated = ev.eventName === 'ListingCreated';
              const isUpdated = ev.eventName === 'ListingUpdated';
              const isCancelled = ev.eventName === 'RequestCancelled';
              const isWithdrawn = ev.eventName === 'Withdrawn';

              return (
                <div
                  key={ev.id}
                  className={`p-4 md:p-5 transition-all duration-500 hover:bg-[#1a1724] ${
                    ev.isNew
                      ? 'bg-[#8b5cf6]/10 border-l-4 border-l-[#8b5cf6]'
                      : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Badge & Core Identity */}
                    <div className="flex items-start md:items-center space-x-3">
                      {isSettled && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
                          Request Settled
                        </span>
                      )}
                      {isOpened && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30">
                          Request Opened
                        </span>
                      )}
                      {isCreated && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#8b5cf6]/15 text-[#a78bfa] border border-[#8b5cf6]/30">
                          Listing Created
                        </span>
                      )}
                      {isUpdated && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30">
                          Listing Updated
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">
                          Request Cancelled
                        </span>
                      )}
                      {isWithdrawn && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30">
                          Seller Withdrawn
                        </span>
                      )}

                      {/* Event Context Description */}
                      <div className="flex items-center space-x-2 font-mono text-sm">
                        {ev.args.requestId && (
                          <span className="text-[#f4f2fa] font-bold">
                            Request #{ev.args.requestId.toString()}
                          </span>
                        )}
                        {ev.args.listingId && (
                          <span className="text-[#a39fb5]">
                            (Listing #{ev.args.listingId.toString()})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Block Number, Relative Time & Explorer Link */}
                    <div className="flex items-center space-x-3 text-xs font-mono text-[#a39fb5] self-end md:self-auto">
                      <span className="bg-[#1e1b2b] px-2 py-0.5 rounded border border-[#2e2946] text-[#c4c0d4]">
                        Block #{ev.blockNumber.toString()}
                      </span>
                      <span>{formatRelativeTime(ev.timestamp)}</span>
                      <TxLink hash={ev.transactionHash} />
                    </div>
                  </div>

                  {/* Event Details Row */}
                  <div className="mt-3 pt-2 border-t border-[#2a2638]/40 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {isSettled && (
                      <>
                        <div>
                          <div className="text-[#a39fb5]">Tokens Used</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {Number(ev.args.tUsed || 0).toLocaleString()} tok
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Seller Payout</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {formatMON(BigInt(ev.args.sellerPayout || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Protocol Fee (2.5%)</div>
                          <div className="font-mono text-sm font-semibold text-[#a39fb5]">
                            {formatMON(BigInt(ev.args.fee || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#22c55e] font-medium">Buyer Refund</div>
                          <div className="font-mono text-sm font-bold text-[#22c55e]">
                            +{formatMON(BigInt(ev.args.refund || 0n))} MON
                          </div>
                        </div>
                      </>
                    )}

                    {isOpened && (
                      <>
                        <div>
                          <div className="text-[#a39fb5]">Escrow Deposit</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {formatMON(BigInt(ev.args.deposit || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Worst-Case T_max</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {Number(ev.args.tMax || 0).toLocaleString()} tok
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Buyer Address</div>
                          <div className="font-mono text-sm text-[#a39fb5]">
                            {ev.args.buyer ? shortAddr(ev.args.buyer) : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Prompt Hash</div>
                          <div className="font-mono text-xs text-[#a39fb5] truncate">
                            {ev.args.promptHash ? `${ev.args.promptHash.slice(0, 10)}...` : '—'}
                          </div>
                        </div>
                      </>
                    )}

                    {isCreated && (
                      <>
                        <div>
                          <div className="text-[#a39fb5]">Provider & Model</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {ev.args.provider} / {ev.args.model}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Price per 1k</div>
                          <div className="font-mono text-sm font-semibold text-[#8b5cf6]">
                            {formatMON(BigInt(ev.args.pricePerKToken || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Total Quota</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {Number(ev.args.quota || 0).toLocaleString()} tok
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Seller</div>
                          <div className="font-mono text-sm text-[#a39fb5]">
                            {ev.args.seller ? shortAddr(ev.args.seller) : '—'}
                          </div>
                        </div>
                      </>
                    )}

                    {isUpdated && (
                      <>
                        <div>
                          <div className="text-[#a39fb5]">Price per 1k</div>
                          <div className="font-mono text-sm font-semibold text-[#8b5cf6]">
                            {formatMON(BigInt(ev.args.pricePerKToken || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Total Quota</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {Number(ev.args.quotaTotal || 0).toLocaleString()} tok
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Status</div>
                          <div className="font-mono text-sm font-semibold text-[#f4f2fa]">
                            {ev.args.active ? 'Active' : 'Paused'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Listing ID</div>
                          <div className="font-mono text-sm text-[#a39fb5]">
                            #{ev.args.listingId?.toString()}
                          </div>
                        </div>
                      </>
                    )}

                    {isCancelled && (
                      <>
                        <div>
                          <div className="text-[#ef4444] font-medium">Refund to Buyer</div>
                          <div className="font-mono text-sm font-bold text-[#ef4444]">
                            100% ({formatMON(BigInt(ev.args.refund || 0n))} MON)
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Reason</div>
                          <div className="text-xs text-[#a39fb5] mt-0.5">
                            Provider error / request cancelled
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Status</div>
                          <div className="font-mono text-sm text-[#ef4444]">Cancelled</div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Deposit Refunded</div>
                          <div className="font-mono text-sm text-[#f4f2fa]">Immediately</div>
                        </div>
                      </>
                    )}

                    {isWithdrawn && (
                      <>
                        <div>
                          <div className="text-[#f59e0b] font-medium">Withdrawn Amount</div>
                          <div className="font-mono text-sm font-bold text-[#f59e0b]">
                            {formatMON(BigInt(ev.args.amount || 0n))} MON
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Recipient Seller</div>
                          <div className="font-mono text-sm text-[#a39fb5]">
                            {ev.args.seller ? shortAddr(ev.args.seller) : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Type</div>
                          <div className="text-xs text-[#a39fb5] mt-0.5">Seller Earnings Pull</div>
                        </div>
                        <div>
                          <div className="text-[#a39fb5]">Balance Remaining</div>
                          <div className="font-mono text-sm text-[#a39fb5]">0 MON</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
