import { NextResponse } from 'next/server';
import { getPublicKeyPem } from '../../../lib/server/crypto';
import { getOperatorAccount } from '../../../lib/server/chain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const publicKeyPem = getPublicKeyPem();
    const account = getOperatorAccount();

    return NextResponse.json({
      publicKeyPem,
      operator: account.address,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve operator key' },
      { status: 500 }
    );
  }
}
