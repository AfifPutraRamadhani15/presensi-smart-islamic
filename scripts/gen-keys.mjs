import crypto from 'node:crypto';
console.log('SESSION_SECRET=' + crypto.randomBytes(48).toString('base64url'));
console.log('FACE_ENC_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('\nSalin kedua baris di atas ke .env.local. JANGAN ganti FACE_ENC_KEY setelah ada data wajah (data lama tidak bisa dibuka).');
