'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { keccak256, toBytes, parseEventLogs } from 'viem';
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';

import { quotaGridAbi } from '@/lib/abi';
import { monad, CONTRACT_ADDRESS, publicClient } from '@/lib/chain';
import type { QuoteResponse, ExecuteResponse } from '@/lib/types';
import { buildPayload } from '@/lib/payload';
import { formatMON, pricePer1kLabel, shortAddr } from '@/lib/format';
import { postQuote, postExecute } from '@/lib/api';
import { useListing } from '@/hooks/useListings';

import { Card, Button, Badge, Mono, Textarea, Input } from '@/components/ui';
import { TxLink } from '@/components/TxLink';
import { ReserveWarning } from '@/components/ReserveWarning';
import { ConnectButton } from '@/components/ConnectButton';
import { SettlementReceipt } from '@/components/SettlementReceipt';

import { useEnsureMonad } from '@/hooks/useEnsureMonad';

function formatTokens(t: bigint | number): string {
  return t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface LiveQuoteData extends QuoteResponse {
  payload: string;
}

export default function BuyListingPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  let listingId = 0n;
  let invalidId = false;
  try {
    listingId = BigInt(rawId);
  } catch {
    invalidId = true;
  }

  const { listing, isLoading: listingLoading, error: listingError, refetch: refetchListing } =
    useListing(listingId);

  // Wallet
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { ensureMonad } = useEnsureMonad();

  // Form State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [userPrompt, setUserPrompt] = useState(
    'Explain why Monad parallel EVM achieves high throughput in 3 bullet points.'
  );
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(512);

  // Quote State
  const [quote, setQuote] = useState<LiveQuoteData | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Execution & Step Tracker State
  // Steps: 0 (idle), 1 (Escrow T_max), 2 (Model running), 3 (Settled)
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [stepStatus, setStepStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [isExecuting, setIsExecuting] = useState(false);

  // Timing tracking (ms)
  const [step1Ms, setStep1Ms] = useState<number | null>(null);
  const [step2Ms, setStep2Ms] = useState<number | null>(null);
  const [step3Ms, setStep3Ms] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);

  // Tx Hashes & Results
  const [openTxHash, setOpenTxHash] = useState<string | undefined>(undefined);
  const [settleTxHash, setSettleTxHash] = useState<string | undefined>(undefined);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [cancelTxHash, setCancelTxHash] = useState<string | undefined>(undefined);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // Live timer tick during execution
  const executionStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isExecuting) {
      executionStartTimeRef.current = performance.now();
      interval = setInterval(() => {
        if (executionStartTimeRef.current) {
          setLiveElapsedMs(Math.round(performance.now() - executionStartTimeRef.current));
        }
      }, 50);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExecuting]);

  // Reset execution result when quote is invalidated
  const invalidateQuote = () => {
    setQuote(null);
    setQuoteError(null);
    setExecuteResult(null);
    setExecuteError(null);
    setCancelTxHash(undefined);
    setCurrentStep(0);
    setStepStatus('idle');
    setOpenTxHash(undefined);
    setSettleTxHash(undefined);
    setStep1Ms(null);
    setStep2Ms(null);
    setStep3Ms(null);
    setTotalMs(null);
  };

  // Get Quote
  const handleGetQuote = async () => {
    if (!userPrompt.trim() || isQuoting || isExecuting) return;

    setIsQuoting(true);
    setQuoteError(null);
    invalidateQuote();

    try {
      const canonicalPayload = buildPayload({
        system: systemPrompt.trim() || undefined,
        messages: [{ role: 'user', content: userPrompt.trim() }],
      });

      const res = await postQuote({
        listingId: rawId,
        payload: canonicalPayload,
        maxOutputTokens,
      });

      setQuote({
        ...res,
        payload: canonicalPayload,
      });
    } catch (err: any) {
      setQuoteError(err?.message || 'Failed to calculate quote');
    } finally {
      setIsQuoting(false);
    }
  };

  // Pay & Run
  const handlePayAndRun = async () => {
    if (!quote || isExecuting || isQuoting) return;

    setIsExecuting(true);
    setExecuteError(null);
    setCancelTxHash(undefined);
    setExecuteResult(null);
    setStep1Ms(null);
    setStep2Ms(null);
    setStep3Ms(null);
    setTotalMs(null);
    setCurrentStep(1);
    setStepStatus('running');

    const clickTime = performance.now();
    let step1EndTime = 0;

    try {
      // Step 1: Escrow T_max on-chain
      const promptHash = keccak256(toBytes(quote.payload));

      await ensureMonad();
      const hash = await writeContractAsync({
        chainId: monad.id,
        address: CONTRACT_ADDRESS,
        abi: quotaGridAbi,
        functionName: 'openRequest',
        args: [listingId, BigInt(quote.tMax), promptHash],
        value: BigInt(quote.costWei),
      });

      setOpenTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      step1EndTime = performance.now();
      const s1Duration = Math.round(step1EndTime - clickTime);
      setStep1Ms(s1Duration);

      // Parse RequestOpened event to extract requestId
      const logs = parseEventLogs({
        abi: quotaGridAbi,
        logs: receipt.logs,
        eventName: 'RequestOpened',
      });

      if (!logs || logs.length === 0 || !logs[0].args || logs[0].args.requestId === undefined) {
        throw new Error('Transaction confirmed but RequestOpened event could not be found.');
      }

      const requestId = logs[0].args.requestId;

      // Step 2: Model running (inference)
      setCurrentStep(2);
      const step2StartTime = performance.now();

      let execRes: ExecuteResponse;
      try {
        execRes = await postExecute({
          requestId: requestId.toString(),
          payload: quote.payload,
          maxOutputTokens,
        });
      } catch (err: any) {
        if (err?.cancelTx) {
          setCancelTxHash(err.cancelTx);
        }
        throw err;
      }

      const step2EndTime = performance.now();
      const s2Duration = Math.round(step2EndTime - step2StartTime);
      setStep2Ms(s2Duration);

      // Step 3: Settled
      setCurrentStep(3);
      setStepStatus('success');
      setSettleTxHash(execRes.settleTx);
      setStep3Ms(0); // Settle is verified by operator within postExecute

      const totalDuration = Math.round(performance.now() - clickTime);
      setTotalMs(totalDuration);
      setExecuteResult(execRes);
      refetchListing();
    } catch (err: any) {
      setStepStatus('error');
      setExecuteError(err?.message || 'Execution failed');
      if (err?.cancelTx) {
        setCancelTxHash(err.cancelTx);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const isWrongChain = isConnected && chain?.id !== monad.id;

  if (invalidId) {
    return (
      <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-rose-500/40 bg-[#15131d] p-8 text-center max-w-md">
          <h2 className="text-xl font-bold font-mono text-rose-400 mb-2">Invalid Listing ID</h2>
          <p className="text-sm text-[#a39fb5] mb-6">The listing identifier specified in the URL is invalid.</p>
          <Link href="/market">
            <Button variant="primary">Return to Market</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (listingLoading) {
    return (
      <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-[#15131d] rounded-lg animate-pulse" />
        <div className="h-40 bg-[#15131d] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#15131d] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-8 text-center max-w-md space-y-4">
          <h2 className="text-2xl font-bold font-mono text-[#f4f2fa]">Listing Not Found</h2>
          <p className="text-sm text-[#a39fb5]">
            Listing #{rawId} could not be found on the QuotaGrid smart contract.
          </p>
          <Link href="/market">
            <Button variant="primary">Back to Market</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0a10] text-[#f4f2fa] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Reserve Warning */}
        <div className="flex items-center justify-between">
          <Link
            href="/market"
            className="inline-flex items-center gap-2 text-sm text-[#a39fb5] hover:text-purple-400 transition-colors font-mono"
          >
            &larr; Back to Market
          </Link>
          <Badge className="bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono text-xs">
            Live On-Stage Demo
          </Badge>
        </div>

        <ReserveWarning />

        {/* Listing Header Card */}
        <Card className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#2a2638] pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold px-2.5 py-0.5">
                  {listing.provider}
                </Badge>
                {listing.active ? (
                  <Badge className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-0.5">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs px-2 py-0.5">
                    Inactive
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#f4f2fa] tracking-tight">
                {listing.model}
              </h1>
              <p className="text-xs text-[#a39fb5] font-mono">
                Seller: <Mono className="text-[#f4f2fa]">{shortAddr(listing.seller)}</Mono>
              </p>
            </div>

            <div className="text-left sm:text-right rounded-xl border border-[#2a2638] bg-[#0b0a10] p-4">
              <div className="text-xs uppercase tracking-wider text-[#a39fb5]">Price</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">
                {pricePer1kLabel(listing.pricePerKToken)}
              </div>
              <div className="text-xs text-[#a39fb5] mt-1 font-mono">
                Available: {formatTokens(listing.available)} tok
              </div>
            </div>
          </div>

          {/* Prompt Configuration Form */}
          <div className="space-y-5">
            {/* Optional System Prompt Collapsible */}
            <div className="border border-[#2a2638] rounded-xl overflow-hidden bg-[#0b0a10]">
              <button
                type="button"
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-mono text-[#a39fb5] hover:text-[#f4f2fa] transition-colors"
              >
                <span>
                  {showSystemPrompt ? '▼' : '►'} System Prompt (Optional)
                  {systemPrompt.trim() && ' [Configured]'}
                </span>
                <span className="text-[11px] text-purple-400">
                  {showSystemPrompt ? 'Collapse' : 'Expand'}
                </span>
              </button>

              {showSystemPrompt && (
                <div className="p-3.5 pt-0 border-t border-[#2a2638]">
                  <Textarea
                    placeholder="e.g. You are a senior distributed systems architect. Answer concisely."
                    value={systemPrompt}
                    onChange={(e) => {
                      setSystemPrompt(e.target.value);
                      invalidateQuote();
                    }}
                    rows={2}
                    className="w-full bg-[#15131d] border-[#2a2638] text-sm text-[#f4f2fa] placeholder-[#a39fb5] rounded-lg focus:border-purple-500"
                    disabled={isQuoting || isExecuting}
                  />
                </div>
              )}
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-[#a39fb5] font-semibold">
                  Prompt <span className="text-purple-400">*</span>
                </label>
                <span className="text-xs text-[#a39fb5] font-mono">
                  {userPrompt.length} chars
                </span>
              </div>
              <Textarea
                rows={4}
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  invalidateQuote();
                }}
                placeholder="Type your prompt here..."
                className="w-full bg-[#0b0a10] border-[#2a2638] text-sm sm:text-base text-[#f4f2fa] placeholder-[#a39fb5] rounded-xl focus:border-purple-500 leading-relaxed font-sans"
                disabled={isQuoting || isExecuting}
              />
            </div>

            {/* Max Output Tokens Config (1..4096, default 512) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="uppercase tracking-wider text-[#a39fb5] font-semibold">
                  Max Output Tokens (Cap)
                </label>
                <span className="font-mono text-purple-400 font-bold">
                  {maxOutputTokens} tokens
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={4096}
                  value={maxOutputTokens}
                  onChange={(e) => {
                    setMaxOutputTokens(parseInt(e.target.value, 10));
                    invalidateQuote();
                  }}
                  disabled={isQuoting || isExecuting}
                  className="w-full h-2 bg-[#0b0a10] rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <Input
                  type="number"
                  min={1}
                  max={4096}
                  value={maxOutputTokens}
                  onChange={(e) => {
                    const val = Math.min(4096, Math.max(1, parseInt(e.target.value, 10) || 1));
                    setMaxOutputTokens(val);
                    invalidateQuote();
                  }}
                  disabled={isQuoting || isExecuting}
                  className="w-24 text-center font-mono text-sm bg-[#0b0a10] border-[#2a2638] text-[#f4f2fa] rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                {[128, 256, 512, 1024, 2048].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setMaxOutputTokens(preset);
                      invalidateQuote();
                    }}
                    disabled={isQuoting || isExecuting}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                      maxOutputTokens === preset
                        ? 'bg-purple-950 border-purple-500 text-purple-300'
                        : 'bg-[#0b0a10] border-[#2a2638] text-[#a39fb5] hover:text-[#f4f2fa]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Get Quote */}
            <div className="pt-2">
              <Button
                variant={quote ? 'secondary' : 'primary'}
                onClick={handleGetQuote}
                loading={isQuoting}
                disabled={!userPrompt.trim() || isQuoting || isExecuting}
                className="w-full py-3 text-base font-semibold"
              >
                {isQuoting ? 'Calculating Quote...' : quote ? 'Re-Calculate Quote' : '1. Get Quote'}
              </Button>
            </div>

            {quoteError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-xs text-rose-300">
                {quoteError}
              </div>
            )}
          </div>

          {/* Quote Result Box (Big MON Cost Display) */}
          {quote && (
            <div className="rounded-xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-[#15131d] to-[#0b0a10] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2638] pb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#a39fb5]">
                    Worst-Case Escrow Deposit (T_max)
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-300 mt-1">
                    {formatMON(BigInt(quote.costWei))} MON
                  </div>
                </div>
                <div className="flex gap-4 font-mono text-xs">
                  <div className="rounded-lg bg-[#0b0a10] border border-[#2a2638] p-3">
                    <div className="text-[#a39fb5]">Input Tokens</div>
                    <div className="text-base font-bold text-[#f4f2fa]">
                      {quote.inputTokens}{' '}
                      <span className="text-[10px] text-purple-400 font-normal">
                        ({quote.inputTokensExact ? 'exact' : 'estimated'})
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0b0a10] border border-[#2a2638] p-3">
                    <div className="text-[#a39fb5]">T_max Reserved</div>
                    <div className="text-base font-bold text-[#f4f2fa]">{quote.tMax}</div>
                  </div>
                </div>
              </div>

              {/* Pay & Run Trigger Button */}
              <div className="pt-2">
                {!isConnected ? (
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-[#a39fb5]">Connect your Monad wallet to pay & run</p>
                    <ConnectButton />
                  </div>
                ) : isWrongChain ? (
                  <Button
                    variant="primary"
                    onClick={() => switchChain({ chainId: monad.id })}
                    className="w-full py-3.5 text-base font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    Switch Network to Monad Testnet
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handlePayAndRun}
                    loading={isExecuting}
                    disabled={isExecuting || !listing.active}
                    className="w-full py-4 text-lg font-bold bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-950/50"
                  >
                    {isExecuting
                      ? `Executing (${liveElapsedMs}ms)...`
                      : `2. Pay ${formatMON(BigInt(quote.costWei))} MON & Run`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Live Step Tracker */}
        {(currentStep > 0 || isExecuting || executeResult || executeError) && (
          <Card className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2638] pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#f4f2fa] font-mono">
                Execution Progress
              </h3>
              {totalMs !== null && (
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Total click &rarr; settled: {totalMs}ms
                </div>
              )}
              {isExecuting && (
                <div className="text-xs font-mono text-purple-400 animate-pulse">
                  Elapsed: {liveElapsedMs}ms
                </div>
              )}
            </div>

            {/* 3 Step Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1: Escrow T_max */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  currentStep === 1 && isExecuting
                    ? 'border-purple-500 bg-purple-950/30'
                    : currentStep > 1 || (currentStep === 1 && stepStatus === 'success')
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : currentStep === 1 && stepStatus === 'error'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-[#2a2638] bg-[#0b0a10] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        currentStep > 1
                          ? 'bg-emerald-500 text-black'
                          : currentStep === 1 && isExecuting
                          ? 'bg-purple-500 text-white animate-spin'
                          : 'bg-[#2a2638] text-[#a39fb5]'
                      }`}
                    >
                      {currentStep > 1 ? '✓' : '1'}
                    </span>
                    <span className="text-sm font-bold text-[#f4f2fa]">Escrow T_max</span>
                  </div>
                  {step1Ms !== null && (
                    <span className="text-xs font-mono text-emerald-400">{step1Ms}ms</span>
                  )}
                </div>
                <p className="text-xs text-[#a39fb5]">Deposit worst-case tokens on-chain</p>
                {openTxHash && (
                  <div className="mt-2 text-xs">
                    <TxLink hash={openTxHash} label="openRequest tx" />
                  </div>
                )}
              </div>

              {/* Step 2: Model Running */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  currentStep === 2 && isExecuting
                    ? 'border-purple-500 bg-purple-950/30'
                    : currentStep > 2 || (currentStep === 2 && stepStatus === 'success')
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : currentStep === 2 && stepStatus === 'error'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-[#2a2638] bg-[#0b0a10] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        currentStep > 2
                          ? 'bg-emerald-500 text-black'
                          : currentStep === 2 && isExecuting
                          ? 'bg-purple-500 text-white animate-spin'
                          : 'bg-[#2a2638] text-[#a39fb5]'
                      }`}
                    >
                      {currentStep > 2 ? '✓' : '2'}
                    </span>
                    <span className="text-sm font-bold text-[#f4f2fa]">Model Running</span>
                  </div>
                  {step2Ms !== null && (
                    <span className="text-xs font-mono text-emerald-400">{step2Ms}ms</span>
                  )}
                </div>
                <p className="text-xs text-[#a39fb5]">Inference via seller sealed key</p>
              </div>

              {/* Step 3: Settled */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  currentStep === 3 && stepStatus === 'success'
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : currentStep === 3 && isExecuting
                    ? 'border-purple-500 bg-purple-950/30'
                    : currentStep === 3 && stepStatus === 'error'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-[#2a2638] bg-[#0b0a10] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        stepStatus === 'success'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-[#2a2638] text-[#a39fb5]'
                      }`}
                    >
                      {stepStatus === 'success' ? '✓' : '3'}
                    </span>
                    <span className="text-sm font-bold text-[#f4f2fa]">Settled</span>
                  </div>
                  {stepStatus === 'success' && (
                    <span className="text-xs font-mono text-emerald-400">Settled</span>
                  )}
                </div>
                <p className="text-xs text-[#a39fb5]">Instant split: payout + fee + refund</p>
                {settleTxHash && (
                  <div className="mt-2 text-xs">
                    <TxLink hash={settleTxHash} label="settle tx" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Error Path Card */}
        {executeError && (
          <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-950/30 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-600/30 flex items-center justify-center text-rose-300 font-bold">
                !
              </div>
              <h4 className="text-lg font-bold font-mono text-rose-200">Execution Error</h4>
            </div>
            <p className="text-sm text-rose-300 font-mono whitespace-pre-wrap">{executeError}</p>

            {cancelTxHash && (
              <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-4 space-y-1">
                <div className="text-emerald-300 font-bold text-sm">
                  Cancelled &mdash; 100% Refunded
                </div>
                <p className="text-xs text-emerald-200/80">
                  The model provider reported an error. Your escrow deposit was automatically and completely refunded on Monad.
                </p>
                <div className="pt-2 text-xs">
                  <TxLink hash={cancelTxHash} label="View Cancellation Tx on Explorer" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answer Output (Whitespace Preserved) */}
        {executeResult && (
          <div className="space-y-6">
            <Card className="rounded-2xl border border-[#2a2638] bg-[#15131d] p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a2638] pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <h3 className="text-lg sm:text-xl font-bold font-mono text-[#f4f2fa]">
                    Model Completion
                  </h3>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(executeResult.output);
                    setCopiedOutput(true);
                    setTimeout(() => setCopiedOutput(false), 2000);
                  }}
                  className="text-xs px-3 py-1.5"
                >
                  {copiedOutput ? 'Copied!' : 'Copy Response'}
                </Button>
              </div>

              {/* Text content with preserved whitespace */}
              <div className="rounded-xl border border-[#2a2638] bg-[#0b0a10] p-5 font-mono text-sm sm:text-base text-[#f4f2fa] whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                {executeResult.output}
              </div>
            </Card>

            {/* Settlement Receipt with Stacked Bar & Refund Highlight */}
            {quote && (
              <SettlementReceipt
                depositWei={BigInt(quote.costWei)}
                tMax={BigInt(quote.tMax)}
                tUsed={BigInt(executeResult.tUsed)}
                sellerPayoutWei={BigInt(executeResult.sellerPayout)}
                feeWei={BigInt(executeResult.fee)}
                refundWei={BigInt(executeResult.refund)}
                openTx={openTxHash}
                settleTx={executeResult.settleTx || settleTxHash}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
