import { handle } from '@/lib/http';
import { requireAdmin, createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Dipanggil browser selama aplikasi terbuka, untuk memperpanjang sesi admin.
export const POST = handle(async (req) => {
  const a = await requireAdmin(req);
  await createSession({ id: a.id, full_name: a.name, username: a.username });
  return { ok: true };
});