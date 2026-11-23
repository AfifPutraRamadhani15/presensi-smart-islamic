 import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { HttpError } from './http';

// Sesi portal siswa — cookie & klaim TERPISAH dari sesi admin
const COOKIE = 'psi_student';
// Sesi diperpanjang lewat /api/portal/ping (tiap 30 detik) selama aplikasi terbuka di layar.
// Jika aplikasi ditutup / ditinggalkan, sesi habis sendiri: 5 menit + 30 detik cadangan
// (jarak denyut), sehingga siswa tidak pernah keluar sebelum 5 menit.
const SESSION_SECONDS = 5 * 60 + 30;

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
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(key());
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_SECONDS });
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