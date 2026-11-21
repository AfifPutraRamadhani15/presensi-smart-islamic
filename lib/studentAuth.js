import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { HttpError } from './http';

// Sesi portal siswa — cookie & klaim TERPISAH dari sesi admin
const COOKIE = 'psi_student';
const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET belum diisi / kurang dari 32 karakter');
  return new TextEncoder().encode(s);
};

export async function createStudentSession(account) {
  const token = await new SignJWT({ role: 'student', sid: account.student_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(account.id)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key());
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 2 });
}

export function destroyStudentSession() { cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 }); }

export async function requireStudent(req) {
  const t = cookies().get(COOKIE)?.value;
  let payload;
  try { ({ payload } = await jwtVerify(t || '', key())); } catch { throw new HttpError(401, 'Sesi berakhir. Silakan login kembali.'); }
  if (payload.role !== 'student') throw new HttpError(401, 'Sesi tidak valid');
  if (req && req.method !== 'GET') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== req.headers.get('host')) throw new HttpError(403, 'Origin tidak diizinkan');
  }
  return { account_id: payload.sub, student_id: payload.sid };
}

// ---- Ditambahkan: dipakai oleh /api/daftar, /api/siswa/login, /api/siswa/me ----

// Sandi di-hash dengan bcrypt (sama seperti akun admin). ASYNC: selalu pakai await.
export const hashPassword = (p) => bcrypt.hash(String(p), 10);
export const verifyPassword = (p, hash) => bcrypt.compare(String(p), String(hash || ''));

// Sesi siswa saat ini, atau null bila belum login / sesi tidak valid (tidak melempar error).
export async function getStudent() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    if (payload.role !== 'student') return null;
    return { account_id: payload.sub, student_id: payload.sid };
  } catch { return null; }
}