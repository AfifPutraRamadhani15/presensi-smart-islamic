import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createStudentSession } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const nis = String(body.nis ?? body.username ?? '').trim();
    const password = String(body.password ?? '');

    const unauthorized = () =>
      NextResponse.json(
        { error: 'NIS atau kata sandi salah.' },
        { status: 401 }
      );

    if (!nis || !password) {
      return unauthorized();
    }

    const sb = db();

    const { data: student, error: studentErr } = await sb
      .from('students')
      .select('id, nis, full_name, class_name, active')
      .eq('nis', nis)
      .maybeSingle();

    if (studentErr) {
      throw studentErr;
    }

    if (!student || student.active === false) {
      return unauthorized();
    }

    const { data: account, error: accountErr } = await sb
      .from('student_accounts')
      .select('password_hash, must_change')
      .eq('student_id', student.id)
      .maybeSingle();

    if (accountErr) {
      throw accountErr;
    }

    if (!account || !account.password_hash) {
      return unauthorized();
    }

    const isValid = await Promise.resolve(
      verifyPassword(password, account.password_hash)
    );

    if (!isValid) {
      return unauthorized();
    }

    await Promise.resolve(createStudentSession(student));

    return NextResponse.json({
      ok: true,
      must_change: Boolean(account.must_change),
      student: {
        id: student.id,
        nis: student.nis,
        full_name: student.full_name,
        class_name: student.class_name ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan saat memproses login.' },
      { status: 500 }
    );
  }
}