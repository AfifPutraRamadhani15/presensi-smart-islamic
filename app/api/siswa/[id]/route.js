import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';
import { saveStudent } from '@/lib/students';
import { invalidateFaceCache } from '@/lib/face';

export const PUT = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const s = await saveStudent(await req.json(), params.id);
  invalidateFaceCache();
  await audit(admin, 'UBAH_SISWA', s.nis, req);
  return s;
});

export const DELETE = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const s = must(await db().from('students').select('nis').eq('id', params.id).single());
  must(await db().from('students').delete().eq('id', params.id).select());
  invalidateFaceCache();
  await audit(admin, 'HAPUS_SISWA', `${s.nis} (termasuk data wajah & riwayat)`, req);
  return { ok: true };
});
