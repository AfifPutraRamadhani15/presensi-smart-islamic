import { db, must } from './db';
import { HttpError } from './http';

const COLS = ['nis','nisn','full_name','gender','birth_place','birth_date','class_id','address','status'];

export async function saveStudent(b, id) {
  if (!b.nis?.toString().trim() || !b.full_name?.toString().trim()) throw new HttpError(400, 'NIS dan nama lengkap wajib diisi');
  const row = {};
  for (const k of COLS) if (k in b) row[k] = b[k] === '' ? null : b[k];
  row.nis = String(row.nis).trim();
  if (row.gender && !['L', 'P'].includes(row.gender)) throw new HttpError(400, 'Jenis kelamin harus L atau P');
  if (row.class_id) {
    const c = must(await db().from('classes').select('department_id,academic_year_id').eq('id', row.class_id).single());
    row.department_id = c.department_id; row.academic_year_id = c.academic_year_id;
  } else { row.department_id = null; row.academic_year_id = null; }

  const q = id ? db().from('students').update(row).eq('id', id) : db().from('students').insert(row);
  const { data, error } = await q.select().single();
  if (error) throw new HttpError(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'NIS sudah terdaftar' : error.message);

  if ('parent_name' in b || 'whatsapp' in b || 'consent_wa' in b) {
    must(await db().from('parent_contacts').upsert({
      student_id: data.id, parent_name: b.parent_name || null, whatsapp: b.whatsapp || null, consent_wa: !!b.consent_wa,
    }, { onConflict: 'student_id' }));
  }
  return data;
}
