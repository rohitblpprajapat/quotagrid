/**
 * Converts an SPKI PEM string into an ArrayBuffer.
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleanB64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(cleanB64, 'base64').buffer;
  }

  const binaryString = atob(cleanB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a 0x-prefixed hex string.
 */
function arrayBufferToHex(buffer: ArrayBuffer): `0x${string}` {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `0x${hex}`;
}

/**
 * Encrypts a seller API key using WebCrypto RSA-OAEP SHA-256.
 * The output is returned as a 0x-prefixed hex string for QuotaGrid.createListing.
 */
export async function encryptForOperator(
  publicKeyPem: string,
  plaintext: string
): Promise<`0x${string}`> {
  const spkiBuffer = pemToArrayBuffer(publicKeyPem);

  const subtle =
    globalThis.crypto?.subtle ||
    (globalThis as unknown as { crypto?: { webcrypto?: { subtle: SubtleCrypto } } })
      ?.crypto?.webcrypto?.subtle;

  if (!subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const importedPublicKey = await subtle.importKey(
    'spki',
    spkiBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );

  const encoded = new TextEncoder().encode(plaintext);
  const encryptedArrayBuffer = await subtle.encrypt(
    { name: 'RSA-OAEP' },
    importedPublicKey,
    encoded
  );

  return arrayBufferToHex(encryptedArrayBuffer);
}
