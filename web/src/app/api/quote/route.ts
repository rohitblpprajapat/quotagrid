import { NextRequest, NextResponse } from 'next/server';
import { decryptSellerKey } from '../../../lib/server/crypto';
import { countTokens } from '../../../lib/server/providers';
import { parsePayload, type Payload } from '../../../lib/server/payload-validate';
import { getListing, quoteTokens } from '../../../lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { listingId, payload, maxOutputTokens } = body || {};

    // Validate listingId
    if (listingId === undefined || listingId === null || listingId === '') {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }
    let parsedListingId: bigint;
    try {
      parsedListingId = BigInt(listingId);
      if (parsedListingId <= 0n) {
        return NextResponse.json({ error: 'listingId must be greater than 0' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid listingId format' }, { status: 400 });
    }

    // Validate payload (D-013 canonical JSON string)
    let parsedPayload: Payload;
    try {
      parsedPayload = parsePayload(payload);
    } catch (payloadErr: any) {
      return NextResponse.json(
        { error: `Invalid payload: ${payloadErr?.message || 'validation failed'}` },
        { status: 400 }
      );
    }

    // Validate maxOutputTokens (1..4096)
    if (
      typeof maxOutputTokens !== 'number' ||
      !Number.isInteger(maxOutputTokens) ||
      maxOutputTokens < 1 ||
      maxOutputTokens > 4096
    ) {
      return NextResponse.json(
        { error: 'maxOutputTokens must be an integer between 1 and 4096' },
        { status: 400 }
      );
    }

    // Fetch listing from on-chain contract
    let listing: any;
    try {
      listing = await getListing(parsedListingId);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to fetch listing: ${err?.message || 'unknown error'}` },
        { status: 404 }
      );
    }

    if (!listing || !listing.seller || listing.seller === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (!listing.active) {
      return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
    }

    // Decrypt seller's API key if available
    let apiKey = '';
    if (listing.encryptedKey && listing.encryptedKey !== '0x') {
      try {
        apiKey = decryptSellerKey(listing.encryptedKey);
      } catch {
        // If decryption fails, countTokens will fall back to estimation
      }
    }

    // Count input tokens for the conversation payload
    const { tokens: inputTokens, exact: inputTokensExact } = await countTokens(
      listing.provider,
      listing.model,
      apiKey,
      parsedPayload
    );

    // tMax = inputTokens + maxOutputTokens (+ thinking budget if provider requires, but thinking is disabled)
    const tMaxBigInt = BigInt(inputTokens + maxOutputTokens);

    // Get cost quote in wei from on-chain contract
    let costWeiBigInt: bigint;
    try {
      costWeiBigInt = await quoteTokens(parsedListingId, tMaxBigInt);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to compute quote on-chain: ${err?.message || 'unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inputTokens,
      inputTokensExact,
      tMax: tMaxBigInt.toString(),
      costWei: costWeiBigInt.toString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
