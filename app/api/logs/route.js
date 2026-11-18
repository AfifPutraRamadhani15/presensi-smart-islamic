import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req) => {
  await requireAdmin(req);
  const type = new URL(req.url).searchParams.get('type');
  if (type === 'face') return must(await db().from('recognition_logs').select('*, students(full_name,nis)').order('created_at', { ascending: false }).limit(300));
  return must(await db().from('activity_logs').select('*').order('created_at', { ascending: false }).limit(300));
});
