import * as crypto from 'node:crypto';

let cachedPrivateKey: crypto.KeyObject | null = null;
let cachedPublicKeyPem: string | null = null;

/**
 * Loads and caches the operator's RSA private key from the environment.
 * The environment variable OPERATOR_RSA_PRIVATE_KEY is expected to be
 * a base64-encoded PKCS#8 PEM private key.
 */
function getPrivateKey(): crypto.KeyObject {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const rawBase64 = process.env.OPERATOR_RSA_PRIVATE_KEY;
  if (!rawBase64) {
    throw new Error('OPERATOR_RSA_PRIVATE_KEY environment variable is not set');
  }

  const pem = Buffer.from(rawBase64, 'base64').toString('utf8');
  cachedPrivateKey = crypto.createPrivateKey({
    key: pem,
    format: 'pem',
    type: 'pkcs8',
  });

  return cachedPrivateKey;
}

/**
 * Exports the operator's RSA public key in SPKI PEM format.
 * This public key is served to sellers to encrypt their API keys in browser.
 */
export function getPublicKeyPem(): string {
  if (cachedPublicKeyPem) {
    return cachedPublicKeyPem;
  }

  const privKey = getPrivateKey();
  const pubKey = crypto.createPublicKey(privKey);

  cachedPublicKeyPem = pubKey.export({
    type: 'spki',
    format: 'pem',
  }) as string;

  return cachedPublicKeyPem;
}

/**
 * Decrypts a seller's API key that was encrypted in the browser with RSA-OAEP SHA-256.
 * @param hex The encrypted ciphertext hex string (with or without '0x' prefix).
 * @returns The decrypted UTF-8 plaintext API key.
 */
export function decryptSellerKey(hex: string): string {
  if (!hex || hex === '0x') {
    throw new Error('Empty encrypted key hex');
  }

  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const cipherBuffer = Buffer.from(cleanHex, 'hex');

  const privateKey = getPrivateKey();

  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    cipherBuffer
  );

  return decrypted.toString('utf8');
}
