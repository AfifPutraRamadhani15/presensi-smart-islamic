import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE = 'psi_student';

// Kunci dibedakan dari admin, jadi token siswa TIDAK valid sebagai sesi admin
const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET belum diisi / kurang dari 32 karakter');
  return new TextEncoder().encode(s + ':student');
};

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(h, 'hex');
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createStudentSession(student) {
  const token = await new SignJWT({ name: student.full_name, nis: student.nis, role: 'student' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(student.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroyStudentSession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getStudent() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    if (payload.role !== 'student') return null;
    return { id: payload.sub, name: payload.name, nis: payload.nis };
  } catch {
    return null;
  }
}