import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createStudentSession } from '@/lib/studentAuth';
import { verifyPassword } from '@/lib/crypto'; // sesuaikan jika verifyPassword ada di lib lain

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const usernameOrNis = String(body.nis ?? body.username ?? '').trim();
    const password = String(body.password ?? '');

    const unauthorized = () =>
      NextResponse.json(
        { error: 'NIS/Username atau kata sandi salah.' },
        { status: 401 }
      );

    if (!usernameOrNis || !password) {
      return unauthorized();
    }

    const sb = db();

    const { data: student, error: studentErr } = await sb
      .from('students')
      .select('id, nis, full_name, status')
      .eq('nis', usernameOrNis)
      .maybeSingle();

    if (studentErr) throw studentErr;
    if (!student || student.status === 'nonaktif') {
      return unauthorized();
    }

    const { data: account, error: accountErr } = await sb
      .from('student_accounts')
      .select('id, student_id, username, password_hash, must_change, is_active')
      .eq('student_id', student.id)
      .maybeSingle();

    if (accountErr) throw accountErr;
    if (!account || !account.password_hash || account.is_active === false) {
      return unauthorized();
    }

    const okPass = await Promise.resolve(
      verifyPassword(password, account.password_hash)
    );
    if (!okPass) {
      return unauthorized();
    }

    await createStudentSession(account);

    return NextResponse.json({
      ok: true,
      must_change: Boolean(account.must_change),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan saat login portal.' },
      { status: 500 }
    );
  }
}