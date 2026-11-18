import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { createSession } from '@/lib/auth';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';
const fails = globalThis.__loginFails || (globalThis.__loginFails = new Map());

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  const f = fails.get(ip);
  if (f && f.count >= 5 && Date.now() - f.at < 5 * 60_000) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi 5 menit lagi.');
  const { username, password } = await req.json();
  if (!username || !password) throw new HttpError(400, 'Username dan password wajib diisi');
  const { data: admin } = await db().from('admins').select('*').eq('username', String(username).trim().toLowerCase()).maybeSingle();
  const ok = admin && admin.is_active && (await bcrypt.compare(password, admin.password_hash));
  if (!ok) {
    fails.set(ip, { count: (f && Date.now() - f.at < 5 * 60_000 ? f.count : 0) + 1, at: Date.now() });
    await audit(null, 'LOGIN_GAGAL', `username=${username}`, req);
    throw new HttpError(401, 'Username atau password salah');
  }
  fails.delete(ip);
  await db().from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);
  await createSession(admin);
  await audit(admin, 'LOGIN', null, req);
  return { ok: true };
});
