import { NextResponse } from 'next/server';
import { destroyStudentSession } from '@/lib/studentAuth';

export async function POST() {
  destroyStudentSession();
  return NextResponse.json({ ok: true });
}