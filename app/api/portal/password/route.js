import bcrypt from 'bcryptjs';
import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireStudent } from '@/lib/portalAuth';
import { checkPassword, hashPassword } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const s = await requireStudent(req);
  const { current, next } = await req.json();
  const acc = must(await db().from('student_accounts').select('*').eq('id', s.account_id).single());
  if (!(await bcrypt.compare(String(current || ''), acc.password_hash))) throw new HttpError(400, 'Sandi saat ini salah');
  checkPassword(next);
  if (next === current) throw new HttpError(400, 'Sandi baru harus berbeda dari sandi lama');
  must(await db().from('student_accounts').update({ password_hash: await hashPassword(next), must_change: false }).eq('id', acc.id).select());
  return { ok: true };
});