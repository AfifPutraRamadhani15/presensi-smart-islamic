import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Body: { rows: [{nis,nisn,nama,jk,tempat_lahir,tanggal_lahir,kelas,alamat,orang_tua,whatsapp}] }
export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { rows } = await req.json();
  if (!Array.isArray(rows) || !rows.length) throw new HttpError(400, 'Tidak ada data');
  if (rows.length > 2000) throw new HttpError(400, 'Maksimal 2000 baris per impor');
  const classes = must(await db().from('classes').select('id,name,department_id,academic_year_id'));
  const byName = new Map(classes.map((c) => [c.name.toLowerCase(), c]));
  let ok = 0; const errors = [];
  for (const [i, r] of rows.entries()) {
    const nis = String(r.nis ?? '').trim(), nama = String(r.nama ?? '').trim();
    if (!nis || !nama) { errors.push(`Baris ${i + 2}: NIS/nama kosong`); continue; }
    const c = byName.get(String(r.kelas ?? '').trim().toLowerCase());
    if (r.kelas && !c) { errors.push(`Baris ${i + 2}: kelas "${r.kelas}" belum ada`); continue; }
    const jk = String(r.jk ?? '').trim().toUpperCase().charAt(0);
    const row = {
      nis, nisn: r.nisn ? String(r.nisn) : null, full_name: nama, gender: ['L', 'P'].includes(jk) ? jk : null,
      birth_place: r.tempat_lahir || null, birth_date: /^\d{4}-\d{2}-\d{2}$/.test(r.tanggal_lahir || '') ? r.tanggal_lahir : null,
      class_id: c?.id ?? null, department_id: c?.department_id ?? null, academic_year_id: c?.academic_year_id ?? null, address: r.alamat || null,
    };
    const { data, error } = await db().from('students').upsert(row, { onConflict: 'nis' }).select('id').single();
    if (error) { errors.push(`Baris ${i + 2}: ${error.message}`); continue; }
    if (r.orang_tua || r.whatsapp) await db().from('parent_contacts').upsert({ student_id: data.id, parent_name: r.orang_tua || null, whatsapp: r.whatsapp ? String(r.whatsapp) : null }, { onConflict: 'student_id' });
    ok++;
  }
  await audit(admin, 'IMPOR_SISWA', `${ok} berhasil, ${errors.length} gagal`, req);
  return { ok, errors };
});
