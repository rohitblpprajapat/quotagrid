import type { QuoteResponse, ExecuteResponse } from './types';

/**
 * Fetches the operator's RSA public key (SPKI PEM) and operator wallet address.
 */
export async function getOperatorKey(): Promise<{
  publicKeyPem: string;
  operator: string;
}> {
  const res = await fetch('/api/operator-key');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch operator key: ${res.statusText}`);
  }
  return data as { publicKeyPem: string; operator: string };
}

/**
 * Requests an on-chain token count and cost quote from /api/quote.
 */
export async function postQuote(body: {
  listingId: string;
  payload: string;
  maxOutputTokens: number;
}): Promise<QuoteResponse> {
  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch quote: ${res.statusText}`);
  }
  return data as QuoteResponse;
}

/**
 * Dispatches a prompt execution to /api/execute.
 * Throws an Error with the server's error message, attaching cancelTx if present.
 */
export async function postExecute(body: {
  requestId: string;
  payload: string;
  maxOutputTokens: number;
}): Promise<ExecuteResponse> {
  const res = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorObj = new Error(
      data.error || `Failed to execute request: ${res.statusText}`
    ) as Error & { cancelTx?: string };

    if (data.cancelTx) {
      errorObj.cancelTx = data.cancelTx;
    }
    throw errorObj;
  }
  return data as ExecuteResponse;
}
