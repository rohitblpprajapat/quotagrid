import {
  createPublicClient,
  createWalletClient,
  http,
  decodeEventLog,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad, CONTRACT_ADDRESS } from '../chain';
import { quotaGridAbi } from '../abi';

/**
 * Public client for querying the Monad testnet and reading contract state.
 */
export const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

/**
 * Returns the operator account derived from OPERATOR_PRIVATE_KEY.
 */
export function getOperatorAccount() {
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  if (!pk) {
    throw new Error('OPERATOR_PRIVATE_KEY environment variable is not set');
  }
  const formatted = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
  return privateKeyToAccount(formatted);
}

/**
 * Creates a wallet client using the operator's account on Monad.
 */
export function getWalletClient() {
  const account = getOperatorAccount();
  return createWalletClient({
    account,
    chain: monad,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });
}

/**
 * Reads a listing from the QuotaGrid contract.
 */
export async function getListing(listingId: bigint) {
  return (await (publicClient as any).readContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'getListing',
    args: [listingId],
  })) as {
    seller: `0x${string}`;
    provider: string;
    model: string;
    pricePerKToken: bigint;
    quotaTotal: bigint;
    quotaUsed: bigint;
    quotaLocked: bigint;
    active: boolean;
    encryptedKey: `0x${string}`;
  };
}

/**
 * Reads a request from the QuotaGrid contract.
 */
export async function getRequest(requestId: bigint) {
  return (await (publicClient as any).readContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'getRequest',
    args: [requestId],
  })) as {
    listingId: bigint;
    buyer: `0x${string}`;
    tMax: bigint;
    deposit: bigint;
    promptHash: `0x${string}`;
    openedAt: bigint;
    status: number;
    tUsed: bigint;
  };
}

/**
 * Gets on-chain cost quote in wei for a given number of tokens on a listing.
 */
export async function quoteTokens(listingId: bigint, tokens: bigint): Promise<bigint> {
  return (await (publicClient as any).readContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'quote',
    args: [listingId, tokens],
  })) as bigint;
}

/**
 * Settles a request on-chain.
 * Monad charges gas based on the gas LIMIT, so we explicitly calculate
 * estimateGas * 1.2 instead of using a large default gas limit.
 */
export async function settleRequest(
  requestId: bigint,
  tUsed: bigint
): Promise<TransactionReceipt> {
  const account = getOperatorAccount();
  const wallet = getWalletClient();

  const estimatedGas = await (publicClient as any).estimateContractGas({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'settle',
    args: [requestId, tUsed],
    account,
  });

  const gas = (BigInt(estimatedGas) * 120n) / 100n;

  const hash = await (wallet as any).writeContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'settle',
    args: [requestId, tUsed],
    account,
    chain: monad,
    gas,
  });

  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Cancels a request on-chain when the provider fails, returning the deposit to the buyer.
 * Monad charges gas based on the gas LIMIT, so we explicitly calculate
 * estimateGas * 1.2 instead of using a large default gas limit.
 */
export async function cancelRequest(requestId: bigint): Promise<TransactionReceipt> {
  const account = getOperatorAccount();
  const wallet = getWalletClient();

  const estimatedGas = await (publicClient as any).estimateContractGas({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'cancel',
    args: [requestId],
    account,
  });

  const gas = (BigInt(estimatedGas) * 120n) / 100n;

  const hash = await (wallet as any).writeContract({
    address: CONTRACT_ADDRESS,
    abi: quotaGridAbi,
    functionName: 'cancel',
    args: [requestId],
    account,
    chain: monad,
    gas,
  });

  return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Decodes the RequestSettled event from transaction logs.
 */
export function decodeRequestSettledEvent(receipt: TransactionReceipt) {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: quotaGridAbi,
        data: log.data,
        topics: (log as any).topics,
      }) as any;

      if (decoded?.eventName === 'RequestSettled') {
        return decoded.args as {
          requestId: bigint;
          tUsed: bigint;
          sellerPayout: bigint;
          fee: bigint;
          refund: bigint;
        };
      }
    } catch {
      // Ignore logs that don't match RequestSettled
    }
  }
  return null;
}
