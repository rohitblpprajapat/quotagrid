export type Provider = 'gemini' | 'anthropic' | 'openai-compatible';

export interface Listing {
  id: bigint;
  seller: `0x${string}`;
  provider: string;
  model: string;
  pricePerKToken: bigint;
  quotaTotal: bigint;
  quotaUsed: bigint;
  quotaLocked: bigint;
  active: boolean;
  available: bigint;
}

export interface RequestInfo {
  id: bigint;
  listingId: bigint;
  buyer: `0x${string}`;
  tMax: bigint;
  deposit: bigint;
  promptHash: `0x${string}`;
  openedAt: bigint;
  status: number;
  tUsed: bigint;
}

export type Request = RequestInfo;

export const STATUS_LABEL: Record<number, string> = {
  0: 'None',
  1: 'Open',
  2: 'Settled',
  3: 'Cancelled',
  4: 'Reclaimed',
};

export interface QuoteResponse {
  inputTokens: number;
  inputTokensExact: boolean;
  tMax: string;
  costWei: string;
}

export interface ExecuteResponse {
  output: string;
  tUsed: string;
  settleTx: string;
  sellerPayout: string;
  fee: string;
  refund: string;
}

export interface ExecuteError {
  error: string;
  cancelTx?: string;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CanonicalPayload {
  v: 1;
  system?: string;
  messages: PromptMessage[];
}
