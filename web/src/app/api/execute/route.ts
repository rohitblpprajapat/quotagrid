import { NextRequest, NextResponse } from 'next/server';
import { keccak256, toBytes } from 'viem';
import { decryptSellerKey } from '../../../lib/server/crypto';
import { complete, countTokens } from '../../../lib/server/providers';
import { parsePayload, type Payload } from '../../../lib/server/payload-validate';
import {
  getRequest,
  getListing,
  settleRequest,
  cancelRequest,
  decodeRequestSettledEvent,
} from '../../../lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory per-requestId lock to prevent concurrent executions of the same request
const activeLocks = new Set<string>();

export async function POST(req: NextRequest) {
  let parsedRequestId: bigint;
  let requestIdStr = '';

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { requestId, payload, maxOutputTokens } = body || {};

    // Validate requestId
    if (requestId === undefined || requestId === null || requestId === '') {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    try {
      parsedRequestId = BigInt(requestId);
      if (parsedRequestId <= 0n) {
        return NextResponse.json({ error: 'requestId must be greater than 0' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid requestId format' }, { status: 400 });
    }

    requestIdStr = parsedRequestId.toString();

    // Validate payload (D-013 canonical JSON string)
    if (typeof payload !== 'string' || payload.length === 0) {
      return NextResponse.json({ error: 'payload is required and must be a non-empty string' }, { status: 400 });
    }

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

    // Acquire lock for this requestId
    if (activeLocks.has(requestIdStr)) {
      return NextResponse.json(
        { error: 'This request is currently being processed' },
        { status: 409 }
      );
    }
    activeLocks.add(requestIdStr);

    try {
      // 1. Fetch Request on-chain
      let requestData: any;
      try {
        requestData = await getRequest(parsedRequestId);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to query request: ${err?.message || 'unknown error'}` },
          { status: 404 }
        );
      }

      // Check request existence (buyer address non-zero)
      if (
        !requestData ||
        !requestData.buyer ||
        requestData.buyer === '0x0000000000000000000000000000000000000000'
      ) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // Status enum: 0 None, 1 Open, 2 Settled, 3 Cancelled, 4 Reclaimed
      if (requestData.status !== 1) {
        return NextResponse.json(
          { error: `Request is not open (current status: ${requestData.status})` },
          { status: 409 }
        );
      }

      // 2. Check prompt hash: keccak256(toBytes(payload)) === promptHash
      // Hashes the raw canonical payload string exactly as received
      const computedPromptHash = keccak256(toBytes(payload));
      if (computedPromptHash.toLowerCase() !== requestData.promptHash.toLowerCase()) {
        return NextResponse.json(
          {
            error: 'Prompt hash mismatch. The provided payload does not match the promptHash locked on-chain.',
          },
          { status: 400 }
        );
      }

      // 3. Fetch Listing to retrieve provider, model, and encryptedKey
      let listingData: any;
      try {
        listingData = await getListing(requestData.listingId);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to query listing: ${err?.message || 'unknown error'}` },
          { status: 404 }
        );
      }

      // 4. Decrypt seller's API key
      let apiKey = '';
      try {
        apiKey = decryptSellerKey(listingData.encryptedKey);
      } catch (decryptErr: any) {
        // Cannot decrypt key -> provider failure -> cancel request on-chain
        try {
          const cancelReceipt = await cancelRequest(parsedRequestId);
          return NextResponse.json(
            {
              error: `Failed to decrypt seller key: ${decryptErr?.message || 'decryption failed'}`,
              cancelTx: cancelReceipt.transactionHash,
            },
            { status: 500 }
          );
        } catch (cancelErr: any) {
          return NextResponse.json(
            {
              error: `Failed to decrypt seller key (${decryptErr?.message}) and cancel failed: ${cancelErr?.message}`,
            },
            { status: 500 }
          );
        }
      }

      // 5. Calculate provider token cap: use maxOutputTokens from body but never exceed tMax - inputTokens (min 1)
      const { tokens: inputTokens } = await countTokens(
        listingData.provider,
        listingData.model,
        apiKey,
        parsedPayload
      );

      const maxAllowed = Number(requestData.tMax) - inputTokens;
      let effectiveMaxOutput = Math.min(maxOutputTokens, maxAllowed);
      if (effectiveMaxOutput < 1) {
        effectiveMaxOutput = 1;
      }

      // 6. Call provider to generate completion
      let completion: any;
      try {
        completion = await complete(
          listingData.provider,
          listingData.model,
          apiKey,
          parsedPayload,
          effectiveMaxOutput
        );
      } catch (providerErr: any) {
        // Provider failure -> cancel on-chain -> respond with error + cancelTx
        try {
          const cancelReceipt = await cancelRequest(parsedRequestId);
          return NextResponse.json(
            {
              error: `Provider call failed: ${providerErr?.message || 'unknown error'}`,
              cancelTx: cancelReceipt.transactionHash,
            },
            { status: 500 }
          );
        } catch (cancelErr: any) {
          return NextResponse.json(
            {
              error: `Provider call failed (${providerErr?.message}) and on-chain cancel failed: ${cancelErr?.message}`,
            },
            { status: 500 }
          );
        }
      }

      // 7. Calculate tUsed = input + output + thinking clamped to tMax
      const rawUsed = BigInt(
        (completion.inputTokens || 0) +
        (completion.outputTokens || 0) +
        (completion.thinkingTokens || 0)
      );
      const tUsed = rawUsed > requestData.tMax ? requestData.tMax : rawUsed;

      // 8. Settle on-chain
      let settleReceipt: any;
      try {
        settleReceipt = await settleRequest(parsedRequestId, tUsed);
      } catch (settleErr: any) {
        return NextResponse.json(
          {
            error: `Failed to settle request on-chain: ${settleErr?.message || 'settle failed'}`,
          },
          { status: 500 }
        );
      }

      // 9. Decode RequestSettled event
      const settledEvent = decodeRequestSettledEvent(settleReceipt);
      if (!settledEvent) {
        return NextResponse.json({
          output: completion.text,
          tUsed: tUsed.toString(),
          settleTx: settleReceipt.transactionHash,
          sellerPayout: '0',
          fee: '0',
          refund: '0',
        });
      }

      return NextResponse.json({
        output: completion.text,
        tUsed: settledEvent.tUsed.toString(),
        settleTx: settleReceipt.transactionHash,
        sellerPayout: settledEvent.sellerPayout.toString(),
        fee: settledEvent.fee.toString(),
        refund: settledEvent.refund.toString(),
      });
    } finally {
      activeLocks.delete(requestIdStr);
    }
  } catch (err: any) {
    if (requestIdStr) {
      activeLocks.delete(requestIdStr);
    }
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
