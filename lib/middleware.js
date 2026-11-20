import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// /admin/* butuh sesi admin, /portal/* (kecuali /portal/login) butuh sesi siswa
export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const portal = path.startsWith('/portal');
  if (portal && path === '/portal/login') return NextResponse.next();

  const t = req.cookies.get(portal ? 'psi_student' : 'psi_session')?.value;
  let ok = false;
  if (t && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(t, new TextEncoder().encode(process.env.SESSION_SECRET));
      ok = portal ? payload.role === 'student' : true;
    } catch {}
  }
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = portal ? '/portal/login' : '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/portal/:path*'] };