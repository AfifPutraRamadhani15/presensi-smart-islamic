import crypto from 'node:crypto';

function key() {
  const hex = process.env.FACE_ENC_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('FACE_ENC_KEY harus 64 karakter hex (jalankan: npm run gen-keys)');
  return Buffer.from(hex, 'hex');
}

// AES-256-GCM. Format: iv.tag.cipher (base64)
export function encryptJSON(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decryptJSON(str) {
  const [iv, tag, enc] = str.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}
