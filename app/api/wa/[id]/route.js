import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { deliver } from '@/lib/wa';
import { audit } from '@/lib/log';

// Kirim ulang
export const POST = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const log = must(await db().from('whatsapp_logs').select('*').eq('id', params.id).single());
  await deliver(log, null);
  await audit(admin, 'KIRIM_ULANG_WA', params.id, req);
  return must(await db().from('whatsapp_logs').select('*').eq('id', params.id).single());
});
