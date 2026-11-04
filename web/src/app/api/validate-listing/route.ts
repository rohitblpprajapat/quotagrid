import { NextRequest, NextResponse } from 'next/server';
import { decryptSellerKey } from '../../../lib/server/crypto';
import { complete } from '../../../lib/server/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROVIDERS = ['gemini', 'anthropic', 'openai-compatible'];
const MIN_QUOTA = 1000n;
const MAX_QUOTA = 100_000_000n;

/** Turns a raw provider error into a reason a seller can act on. The key itself is already redacted by providers.ts. */
function reason(msg: string): string {
  if (/status (401|403)\b|API_KEY_INVALID|invalid.*(api|x-api)[ -]?key|authentication|permission/i.test(msg))
    return 'The provider rejected this API key (invalid, revoked, or no permission for this model).';
  if (/status 404\b|not.?found|does not exist|unknown model|model_not_found/i.test(msg))
    return 'This model id does not exist for this provider, or your key cannot use it.';
  if (/status 429\b|RESOURCE_EXHAUSTED|quota|rate.?limit|credit|billing|insufficient/i.test(msg))
    return 'The key works but has no usable quota right now (rate-limited, out of credits, or billing not set up).';
  if (/status 400\b/i.test(msg)) return 'The provider refused the test request (check the model id).';
  return 'The provider did not complete a test call. Try again in a minute.';
}

/**
 * Listing-time check (D-029): before a seller signs createListing, prove the encrypted key can actually serve a paid
 * call on the chosen model — one real 1-token generation. The key is decrypted only in RAM and never returned or logged.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON request body' }, { status: 400 });
  }
  const { provider, model, encryptedKey, quota } = body || {};
  if (!PROVIDERS.includes(provider)) return NextResponse.json({ ok: false, error: 'Unsupported provider' }, { status: 400 });
  if (typeof model !== 'string' || !model.trim()) return NextResponse.json({ ok: false, error: 'Model is required' }, { status: 400 });
  if (typeof encryptedKey !== 'string' || !/^0x[0-9a-fA-F]+$/.test(encryptedKey))
    return NextResponse.json({ ok: false, error: 'encryptedKey must be 0x hex' }, { status: 400 });
  try {
    const q = BigInt(quota);
    if (q < MIN_QUOTA || q > MAX_QUOTA)
      return NextResponse.json({ ok: false, error: `Quota must be between ${MIN_QUOTA} and ${MAX_QUOTA} tokens` }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Quota must be a whole number of tokens' }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decryptSellerKey(encryptedKey);
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not decrypt the key (operator key changed? reload the page)' }, { status: 400 });
  }

  const t = Date.now();
  try {
    const r = await complete(provider, model.trim(), apiKey, { v: 1, messages: [{ role: 'user', content: 'Reply with OK.' }] } as any, 8);
    return NextResponse.json({ ok: true, ms: Date.now() - t, testTokens: r.inputTokens + r.outputTokens + r.thinkingTokens });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ ok: false, error: reason(msg), detail: msg.slice(0, 300) }, { status: 422 });
  }
}
