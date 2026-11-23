import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { HttpError } from './http';

const COOKIE = 'psi_session';
// Sesi diperpanjang lewat /api/auth/ping (tiap 30 detik) selama aplikasi terbuka di layar.
// Jika aplikasi ditutup / ditinggalkan, sesi habis sendiri: 5 menit + 30 detik cadangan
// (jarak denyut), sehingga pengguna tidak pernah keluar sebelum 5 menit.
const SESSION_SECONDS = 5 * 60 + 30;

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET belum diisi / kurang dari 32 karakter');
  return new TextEncoder().encode(s);
};

export async function createSession(admin) {
  const token = await new SignJWT({ name: admin.full_name, u: admin.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(key());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export function destroySession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getAdmin() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return { id: payload.sub, name: payload.name, username: payload.u };
  } catch {
    return null;
  }
}

// Dipakai di semua API admin. Untuk method non-GET dilakukan cek Origin (proteksi CSRF tambahan).
export async function requireAdmin(req) {
  const admin = await getAdmin();
  if (!admin) throw new HttpError(401, 'Sesi berakhir. Silakan login kembali.');
  if (req && req.method !== 'GET') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== req.headers.get('host')) throw new HttpError(403, 'Origin tidak diizinkan');
  }
  return admin;
}