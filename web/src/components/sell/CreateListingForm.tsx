'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import { quotaGridAbi } from '@/lib/abi';
import { CONTRACT_ADDRESS, publicClient } from '@/lib/chain';
import { Provider } from '@/lib/types';
import { parseMON } from '@/lib/format';
import { getOperatorKey } from '@/lib/api';
import { encryptForOperator } from '@/lib/encrypt';
import { Card, Button, Input, Select, Field, Mono } from '@/components/ui';
import { TxLink } from '@/components/TxLink';

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai-compatible', label: 'OpenAI-Compatible (Groq, Together, etc.)' },
];

const MODEL_SUGGESTIONS: Record<Provider, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  anthropic: ['claude-haiku-4-5'],
  'openai-compatible': ['llama-3.3-70b-versatile'],
};

interface CreateListingFormProps {
  onListingCreated?: (listingId: bigint | null) => void;
}

export function CreateListingForm({ onListingCreated }: CreateListingFormProps) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [provider, setProvider] = useState<Provider>('gemini');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [price, setPrice] = useState<string>('0.001');
  const [quota, setQuota] = useState<string>('100000');
  const [apiKey, setApiKey] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    listingId: bigint | null;
    txHash: `0x${string}`;
  } | null>(null);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.target.value as Provider;
    setProvider(nextProvider);
    const suggestions = MODEL_SUGGESTIONS[nextProvider];
    if (suggestions && suggestions.length > 0) {
      setModel(suggestions[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);

    if (!isConnected) {
      setError('Please connect your wallet first.');
      return;
    }

    const keyToEncrypt = apiKey.trim();
    if (!keyToEncrypt) {
      setError('Please enter a valid API key.');
      return;
    }

    if (!model.trim()) {
      setError('Model ID cannot be empty.');
      return;
    }

    let parsedPriceWei: bigint;
    try {
      parsedPriceWei = parseMON(price);
      if (parsedPriceWei <= 0n) {
        throw new Error('Price must be greater than 0');
      }
    } catch {
      setError('Invalid price. Please enter a positive MON amount.');
      return;
    }

    let quotaBigInt: bigint;
    try {
      quotaBigInt = BigInt(quota.trim());
      if (quotaBigInt <= 0n) {
        throw new Error('Quota must be greater than 0');
      }
    } catch {
      setError('Invalid quota. Please enter a positive integer of tokens.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch operator's public key
      setStatusStep('Fetching operator public key...');
      const { publicKeyPem } = await getOperatorKey();

      // 2. Encrypt API key with RSA-OAEP
      setStatusStep('Encrypting API key in browser...');
      const encryptedHex = await encryptForOperator(publicKeyPem, keyToEncrypt);

      // 3. Clear plaintext key from state immediately after encrypting
      setApiKey('');

      // 4. Submit createListing transaction via wagmi
      setStatusStep('Waiting for wallet signature...');
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: quotaGridAbi,
        functionName: 'createListing',
        args: [
          provider,
          model.trim(),
          parsedPriceWei,
          quotaBigInt,
          encryptedHex,
        ],
      });

      // 5. Wait for transaction receipt
      setStatusStep('Waiting for on-chain confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // 6. Decode ListingCreated log to extract listingId
      let newListingId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: quotaGridAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'ListingCreated') {
            newListingId = (decoded.args as { listingId: bigint }).listingId;
            break;
          }
        } catch {
          // Skip unrelated logs
        }
      }

      setSuccessData({ listingId: newListingId, txHash });
      setStatusStep('');

      if (onListingCreated) {
        onListingCreated(newListingId);
      }
    } catch (err: unknown) {
      // Ensure plaintext key is purged even on error
      setApiKey('');
      const message = err instanceof Error ? err.message : 'Failed to create listing';
      setError(message);
    } finally {
      setIsSubmitting(false);
      setStatusStep('');
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setError(null);
    setApiKey('');
    setQuota('100000');
    setPrice('0.001');
  };

  return (
    <Card className="p-6 bg-[#15131d] border border-[#2a2638] rounded-xl text-[#f4f2fa]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-[#2a2638]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#f4f2fa]">List AI Quota</h2>
          <p className="text-sm text-[#a39fb5] mt-1">
            Deposit sealed API credentials and offer token capacity to buyers on Monad.
          </p>
        </div>
      </div>

      {successData ? (
        <div className="space-y-4 p-5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 text-center sm:text-left">
          <div className="flex items-center gap-2 text-[#22c55e] font-semibold text-lg">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Listing Created Successfully!</span>
          </div>

          <p className="text-sm text-[#f4f2fa]">
            Your quota listing is now active on the marketplace and available for prompt requests.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm pt-2">
            {successData.listingId !== null && (
              <div className="bg-[#15131d] px-3 py-1.5 rounded border border-[#2a2638]">
                <span className="text-[#a39fb5] mr-2">Listing ID:</span>
                <Mono className="font-bold text-[#8b5cf6]">#{successData.listingId.toString()}</Mono>
              </div>
            )}
            <div className="bg-[#15131d] px-3 py-1.5 rounded border border-[#2a2638] flex items-center gap-2">
              <span className="text-[#a39fb5]">Transaction:</span>
              <TxLink hash={successData.txHash} />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="secondary" onClick={handleReset}>
              Create Another Listing
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-sm text-[#ef4444]">
              <div className="font-semibold mb-1">Creation Error</div>
              <div className="break-all">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider */}
            <Field label="AI Provider" hint="Select the underlying model vendor">
              <Select
                value={provider}
                onChange={handleProviderChange}
                disabled={isSubmitting}
                className="w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] focus:border-[#8b5cf6] focus:outline-none"
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#15131d]">
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Model ID */}
            <Field label="Model ID" hint="Model identifier accepted by the provider API">
              <Input
                type="text"
                placeholder="e.g. gemini-2.5-flash"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
              />
              <div className="mt-2 space-y-1">
                <span className="text-xs text-[#a39fb5]">
                  suggestions, check your provider:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {MODEL_SUGGESTIONS[provider]?.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setModel(sug)}
                      disabled={isSubmitting}
                      className={`text-xs px-2.5 py-1 rounded border font-mono transition-colors ${
                        model === sug
                          ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#f4f2fa] font-medium'
                          : 'bg-[#0b0a10] border-[#2a2638] text-[#a39fb5] hover:border-[#8b5cf6]/50 hover:text-[#f4f2fa]'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Price per 1k tokens */}
            <Field
              label="Price per 1k Tokens (MON)"
              hint="Unit price in MON charged for every 1,000 tokens consumed"
            >
              <Input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.001"
                required
                disabled={isSubmitting}
                className="w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
              />
            </Field>

            {/* Quota Tokens */}
            <Field
              label="Quota Capacity (Tokens)"
              hint="Total token pool to allocate for this listing"
            >
              <Input
                type="number"
                min="1"
                step="1"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                placeholder="100000"
                required
                disabled={isSubmitting}
                className="w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
              />
            </Field>
          </div>

          {/* API Key */}
          <Field
            label="API Key (Encrypted in Browser)"
            hint="Encrypted in your browser to the operator's public key. Stored on-chain only as ciphertext."
          >
            <Input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              required
              disabled={isSubmitting}
              className="w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] font-mono focus:border-[#8b5cf6] focus:outline-none"
            />
            <p className="text-xs text-[#a39fb5] mt-1.5 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[#8b5cf6] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>
                Encrypted in your browser to the operator's public key. Stored on-chain only as ciphertext.
              </span>
            </p>
          </Field>

          {/* Submit button & Status */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[#a39fb5]">
              {statusStep && (
                <span className="flex items-center gap-2 text-[#8b5cf6] font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
                  {statusStep}
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || !isConnected}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Creating Listing...' : 'Create Listing'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
