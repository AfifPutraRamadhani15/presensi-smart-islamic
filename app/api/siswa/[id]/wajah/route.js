import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { encryptJSON } from '@/lib/crypto';
import { invalidateFaceCache } from '@/lib/face';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Simpan sampel wajah (embedding dienkripsi). Mengganti sampel lama.
export const POST = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { descriptors, photo, consent } = await req.json();
  if (!consent) throw new HttpError(400, 'Persetujuan penggunaan data biometrik wajib dicentang');
  if (!Array.isArray(descriptors) || descriptors.length < 3 || descriptors.length > 10) throw new HttpError(400, 'Dibutuhkan 3-10 sampel wajah');
  for (const d of descriptors) if (!Array.isArray(d) || d.length !== 128 || d.some((x) => typeof x !== 'number' || !isFinite(x))) throw new HttpError(400, 'Sampel wajah tidak valid');
  if (photo && (!/^data:image\/jpeg;base64,/.test(photo) || photo.length > 80_000)) throw new HttpError(400, 'Foto profil tidak valid / terlalu besar');

  const st = must(await db().from('students').select('id,nis').eq('id', params.id).single());
  must(await db().from('face_data').delete().eq('student_id', st.id).select());
  must(await db().from('face_data').insert(descriptors.map((d, i) => ({ student_id: st.id, embedding_enc: encryptJSON(d), sample_no: i + 1 }))));
  const upd = { consent_biometric: true, consent_at: new Date().toISOString() };
  if (photo) upd.photo = photo;
  must(await db().from('students').update(upd).eq('id', st.id).select());
  invalidateFaceCache();
  await audit(admin, 'DAFTAR_WAJAH', `${st.nis} (${descriptors.length} sampel)`, req);
  return { ok: true, samples: descriptors.length };
});

// Hak penghapusan data biometrik
export const DELETE = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  must(await db().from('face_data').delete().eq('student_id', params.id).select());
  must(await db().from('students').update({ consent_biometric: false, consent_at: null }).eq('id', params.id).select());
  invalidateFaceCache();
  await audit(admin, 'HAPUS_WAJAH', params.id, req);
  return { ok: true };
});
