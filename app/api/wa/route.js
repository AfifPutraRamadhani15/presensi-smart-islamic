import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req) => {
  await requireAdmin(req);
  const rows = must(await db().from('whatsapp_logs').select('*, students(full_name,nis)').order('created_at', { ascending: false }).limit(200));
  return { rows, live: !!(process.env.WA_TOKEN && process.env.WA_PHONE_NUMBER_ID) };
});
