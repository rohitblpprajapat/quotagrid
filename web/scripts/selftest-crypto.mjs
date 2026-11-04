import crypto from 'node:crypto';

// Self-test for RSA-OAEP SHA-256 encryption/decryption
// Simulates browser encryption using WebCrypto subtle and decrypts using Node.js crypto.
async function run() {
  try {
    // 1. Generate RSA-2048 keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const secretApiKey = 'sk-test-secret-key-quota-grid-1234567890abcdef';

    // 2. Browser encryption simulation (WebCrypto RSA-OAEP SHA-256)
    const cleanB64 = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '');
    const spkiBuffer = Buffer.from(cleanB64, 'base64');

    const cryptoSubtle = crypto.webcrypto.subtle;
    const importedPublicKey = await cryptoSubtle.importKey(
      'spki',
      spkiBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );

    const encoded = new TextEncoder().encode(secretApiKey);
    const encryptedArrayBuffer = await cryptoSubtle.encrypt(
      { name: 'RSA-OAEP' },
      importedPublicKey,
      encoded
    );

    const hex = '0x' + Buffer.from(encryptedArrayBuffer).toString('hex');

    // 3. Server decryption logic (matching web/src/lib/server/crypto.ts)
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const cipherBuffer = Buffer.from(cleanHex, 'hex');

    const privKeyObj = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
      type: 'pkcs8',
    });

    const decrypted = crypto.privateDecrypt(
      {
        key: privKeyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      cipherBuffer
    );

    const decryptedText = decrypted.toString('utf8');

    if (decryptedText === secretApiKey) {
      console.log('PASS');
      process.exit(0);
    } else {
      console.error(`FAIL: Decrypted text "${decryptedText}" does not match original "${secretApiKey}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error('FAIL with error:', err);
    process.exit(1);
  }
}

run();
