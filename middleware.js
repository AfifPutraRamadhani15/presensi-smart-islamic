import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const t = req.cookies.get('psi_session')?.value;
  let ok = false;
  if (t && process.env.SESSION_SECRET) {
    try { await jwtVerify(t, new TextEncoder().encode(process.env.SESSION_SECRET)); ok = true; } catch {}
  }
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
