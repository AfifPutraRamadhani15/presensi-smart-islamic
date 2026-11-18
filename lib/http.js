import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function handle(fn) {
  return async (req, ctx) => {
    try {
      const res = await fn(req, ctx);
      return res instanceof Response ? res : NextResponse.json(res ?? { ok: true });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('[API ERROR]', e);
      return NextResponse.json({ error: status === 500 ? (e.message || 'Kesalahan server') : e.message }, { status });
    }
  };
}

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}
