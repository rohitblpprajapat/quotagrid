import crypto from 'node:crypto';

// Generates an RSA-2048 keypair and prints only the base64 PKCS#8 PEM value
// to put in .env.local as OPERATOR_RSA_PRIVATE_KEY.
const { privateKey } = crypto.generateKeyPairSync('rsa', {
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

const base64 = Buffer.from(privateKey, 'utf8').toString('base64');
process.stdout.write(base64 + '\n');
