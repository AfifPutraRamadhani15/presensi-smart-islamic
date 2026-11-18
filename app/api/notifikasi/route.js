import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';

export const PUT = handle(async (req) => {
  await requireAdmin(req);
  must(await db().from('notifications').update({ is_read: true }).eq('is_read', false).select());
  return { ok: true };
});
