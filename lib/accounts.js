import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { HttpError } from './http';

// Tanpa karakter membingungkan (0/O, 1/l/I)
const CH = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

// Sandi sementara acak: 8 karakter, dijamin ada huruf & angka
export function genPassword(n = 8) {
  for (;;) {
    let s = '';
    for (let i = 0; i < n; i++) s += CH[crypto.randomInt(CH.length)];
    if (/[A-Za-z]/.test(s) && /\d/.test(s)) return s;
  }
}

export function cleanUsername(u) {
  const x = String(u || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{4,30}$/.test(x)) throw new HttpError(400, 'Username 4–30 karakter: huruf kecil, angka, titik, strip, atau garis bawah');
  return x;
}

export function checkPassword(p) {
  if (String(p || '').length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) throw new HttpError(400, 'Sandi minimal 8 karakter, kombinasi huruf dan angka');
}

export const hashPassword = (p) => bcrypt.hash(p, 10);