import { formatEther, parseEther } from 'viem';

/**
 * Formats a wei balance into a MON string with up to maxDecimals decimal places.
 * Trims trailing zeroes while preserving integer part.
 */
export function formatMON(wei: bigint, maxDecimals = 6): string {
  if (wei === 0n) return '0';
  const etherStr = formatEther(wei);
  const [intPart, fracPart] = etherStr.split('.');
  if (!fracPart) return intPart;

  const trimmedFrac = fracPart.slice(0, maxDecimals);
  const cleanFrac = trimmedFrac.replace(/0+$/, '');
  if (!cleanFrac) return intPart;
  return `${intPart}.${cleanFrac}`;
}

/**
 * Parses a MON string into wei bigint using parseEther.
 */
export function parseMON(s: string): bigint {
  if (!s || s.trim() === '') return 0n;
  try {
    return parseEther(s.trim());
  } catch {
    return 0n;
  }
}

/**
 * Shortens an address for display (e.g. 0x1234…5678).
 */
export function shortAddr(a: string): string {
  if (!a) return '';
  if (a.length <= 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Shortens a hash for display (e.g. 0x123456…abcdef).
 */
export function shortHash(h: string): string {
  if (!h) return '';
  if (h.length <= 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

/**
 * Formats a price per 1,000 tokens label (e.g. "0.0010 MON / 1k tok").
 */
export function pricePer1kLabel(weiPer1k: bigint): string {
  const monValue = formatEther(weiPer1k);
  const num = Number(monValue);
  const formatted = num.toFixed(4);
  return `${formatted} MON / 1k tok`;
}
