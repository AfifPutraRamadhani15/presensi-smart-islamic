import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createStudentSession } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const b = await req.json();
    const nis = String(b.nis || '').trim();
    const password = String(b.password || '');
    const fail = () => NextResponse.json({ error: 'NIS atau password salah.' }, { status: 401 });
    if (!nis || !password) return fail();

    const sb = db();
    const { data: st, error: e1 } = await sb.from('students').select('id,nis,full_name,active').eq('nis', nis).maybeSingle();
    if (e1) throw e1;
    if (!st || st.active === false) return fail();

    const { data: acc, error: e2 } = await sb.from('student_accounts').select('password_hash').eq('student_id', st.id).maybeSingle();
    if (e2) throw e2;
    if (!acc || !verifyPassword(password, acc.password_hash)) return fail();

    await createStudentSession(st);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal login' }, { status: 500 });
  }
}