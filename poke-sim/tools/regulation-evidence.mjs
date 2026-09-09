import { createPublicKey, createPrivateKey, createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, randomBytes, constants } from 'node:crypto';
import { sha256 } from './regulation-watch-core.mjs';

// Raw source bodies are private evidence, never plaintext public artifacts.
export function evidencePublicKey(pem) {
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error('Evidence key must be RSA, at least 2048 bits');
  return key;
}
export function sealSource(bytes, publicKey) {
  const raw_sha256 = sha256(bytes);
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(raw_sha256));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  return { schema_version: 'regulation-source-sealed-v1', raw_sha256,
    key_sha256: sha256(publicKey.export({ type: 'spki', format: 'der' })),
    algorithm: 'RSA-OAEP-SHA256+A256GCM', wrapped_key: wrapped.toString('base64'), iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}
export function openSource(sealed, privatePem, expectedRawSha) {
  if (sealed.schema_version !== 'regulation-source-sealed-v1' || sealed.algorithm !== 'RSA-OAEP-SHA256+A256GCM' ||
      sealed.raw_sha256 !== expectedRawSha || !/^[a-f0-9]{64}$/.test(expectedRawSha || '')) throw new Error('Source evidence identity mismatch');
  const privateKey = createPrivateKey(privatePem), publicKey = createPublicKey(privateKey);
  if (sha256(publicKey.export({ type: 'spki', format: 'der' })) !== sealed.key_sha256) throw new Error('Wrong evidence decryption key');
  const key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(sealed.wrapped_key, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'));
  decipher.setAAD(Buffer.from(expectedRawSha));
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  const bytes = Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, 'base64')), decipher.final()]);
  if (sha256(bytes) !== expectedRawSha) throw new Error('Source evidence hash mismatch');
  return bytes;
}
