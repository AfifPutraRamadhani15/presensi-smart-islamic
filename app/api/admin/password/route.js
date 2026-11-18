import bcrypt from 'bcryptjs';
import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { current, next, full_name } = await req.json();
  const row = must(await db().from('admins').select('*').eq('id', admin.id).single());
  if (full_name?.trim()) must(await db().from('admins').update({ full_name: full_name.trim() }).eq('id', admin.id).select());
  if (next) {
    if (!(await bcrypt.compare(current || '', row.password_hash))) throw new HttpError(400, 'Password saat ini salah');
    if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) throw new HttpError(400, 'Password baru minimal 10 karakter, kombinasi huruf dan angka');
    must(await db().from('admins').update({ password_hash: await bcrypt.hash(next, 12) }).eq('id', admin.id).select());
    await audit(admin, 'GANTI_PASSWORD', null, req);
  }
  return { ok: true };
});
