import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { createStudentSession } from '@/lib/portalAuth';
import { hashPassword } from '@/lib/accounts';
import { verifyPassword } from '@/lib/studentAuth'; // format sandi akun LAMA (sistem sebelumnya)

export const dynamic = 'force-dynamic';
const fails = globalThis.__stuFails || (globalThis.__stuFails = new Map());
const DUMMY = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.8F9uJf3v9VxXk0l3x6b9s7Qz1QeK';

async function checkPw(pw, hash) {
  if (!hash) return false;
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(pw, hash);
  try { return !!verifyPassword(pw, hash); } catch { return false; }
}

// Login memakai NIS/username. Akun lama (tanpa username) ditemukan lewat NIS.
export const POST = handle(async (req) => {
  const { username, password } = await req.json();
  const raw = String(username || '').trim();
  const u = raw.toLowerCase();
  const key = `${clientIp(req)}|${u}`;
  const f = fails.get(key);
  if (f && f.count >= 5 && Date.now() - f.at < 5 * 60_000) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi 5 menit lagi atau gunakan "Lupa kata sandi".');
  if (!u || !password) throw new HttpError(400, 'NIS dan sandi wajib diisi');

  const sel = '*, students(status,nis)';
  let { data: acc } = await db().from('student_accounts').select(sel).eq('username', u).maybeSingle();
  if (!acc) {
    const { data: st } = await db().from('students').select('id').eq('nis', raw).maybeSingle();
    if (st) ({ data: acc } = await db().from('student_accounts').select(sel).eq('student_id', st.id).maybeSingle());
  }
  const match = acc ? await checkPw(String(password), acc.password_hash) : (await bcrypt.compare(String(password), DUMMY), false);
  if (!acc || !match || acc.is_active === false || acc.students?.status !== 'aktif') {
    fails.set(key, { count: (f && Date.now() - f.at < 5 * 60_000 ? f.count : 0) + 1, at: Date.now() });
    throw new HttpError(401, 'NIS atau sandi salah, atau akun nonaktif. Lupa sandi? Pilih "Lupa kata sandi".');
  }
  fails.delete(key);
  const upd = { last_login_at: new Date().toISOString() };
  if (!/^\$2[aby]\$/.test(acc.password_hash)) upd.password_hash = await hashPassword(String(password)); // naikkan hash lama ke bcrypt
  await db().from('student_accounts').update(upd).eq('id', acc.id);
  await createStudentSession(acc);
  return { ok: true, must_change: !!acc.must_change };
});