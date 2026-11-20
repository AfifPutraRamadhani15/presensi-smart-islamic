import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { createStudentSession } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';
const fails = globalThis.__stuFails || (globalThis.__stuFails = new Map());
const DUMMY = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.8F9uJf3v9VxXk0l3x6b9s7Qz1QeK';

export const POST = handle(async (req) => {
  const { username, password } = await req.json();
  const u = String(username || '').trim().toLowerCase();
  const key = `${clientIp(req)}|${u}`;
  const f = fails.get(key);
  if (f && f.count >= 5 && Date.now() - f.at < 5 * 60_000) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi 5 menit lagi.');
  if (!u || !password) throw new HttpError(400, 'Username dan sandi wajib diisi');

  const { data: acc } = await db().from('student_accounts').select('*, students(status)').eq('username', u).maybeSingle();
  const match = await bcrypt.compare(String(password), acc?.password_hash || DUMMY);
  if (!acc || !match || !acc.is_active || acc.students?.status !== 'aktif') {
    fails.set(key, { count: (f && Date.now() - f.at < 5 * 60_000 ? f.count : 0) + 1, at: Date.now() });
    throw new HttpError(401, 'Username atau sandi salah, atau akun nonaktif. Hubungi admin sekolah.');
  }
  fails.delete(key);
  await db().from('student_accounts').update({ last_login_at: new Date().toISOString() }).eq('id', acc.id);
  await createStudentSession(acc);
  return { ok: true, must_change: acc.must_change };
});