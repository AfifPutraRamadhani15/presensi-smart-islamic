import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try { await requireAdmin(req); } catch { return new Response('Unauthorized', { status: 401 }); }
  const { data } = await db().from('students').select('photo').eq('id', params.id).maybeSingle();
  const m = /^data:(image\/jpeg|image\/png);base64,(.+)$/.exec(data?.photo || '');
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), { headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=300' } });
}
