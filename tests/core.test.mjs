process.env.FACE_ENC_KEY = 'a'.repeat(64);
import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptJSON, decryptJSON } from '../lib/crypto.js';
import { bestMatch, euclid } from '../lib/pure.js';
import { render, normalizePhone } from '../lib/pure.js';


const vec = (v) => Array.from({ length: 128 }, (_, i) => (i === 0 ? v : 0));

test('enkripsi embedding bolak-balik', () => {
  const v = vec(0.123);
  assert.deepEqual(decryptJSON(encryptJSON(v)), v);
});
test('enkripsi gagal jika data dirusak', () => {
  const e = encryptJSON(vec(1)).split('.'); e[2] = Buffer.from('xxxxxxxx').toString('base64');
  assert.throws(() => decryptJSON(e.join('.')));
});
test('matching: cocok, terlalu jauh, dan ambigu', () => {
  const items = [{ student_id: 'A', vec: vec(0) }, { student_id: 'B', vec: vec(0.6) }];
  assert.equal(bestMatch(items, vec(0.05), 0.5, 0.04).student_id, 'A');
  assert.equal(bestMatch(items, vec(2), 0.5, 0.04).matched, false);
  const amb = [{ student_id: 'A', vec: vec(0) }, { student_id: 'B', vec: vec(0.02) }];
  assert.equal(bestMatch(amb, vec(0.01), 0.5, 0.04).reason, 'ambiguous');
});
test('euclid', () => assert.equal(euclid(vec(3), vec(0)), 3));
test('template WA & normalisasi nomor', () => {
  assert.equal(render('Halo {nama}', { nama: 'Rizki' }), 'Halo Rizki');
  assert.equal(normalizePhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('123'), null);
});
