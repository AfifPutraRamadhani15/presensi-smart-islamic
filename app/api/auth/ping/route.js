import { handle } from '@/lib/http';
import { requireStudent, createStudentSession } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

// Dipanggil browser selama siswa aktif, untuk memperpanjang sesi (batas keras 6 menit).
export const POST = handle(async (req) => {
  const s = await requireStudent(req);
  await createStudentSession({ id: s.account_id, student_id: s.student_id });
  return { ok: true };
});