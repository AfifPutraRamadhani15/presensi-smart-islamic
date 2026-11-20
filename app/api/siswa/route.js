import { db, fetchAll, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';
import { saveStudent } from '@/lib/students';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const sp = new URL(req.url).searchParams;
  const rows = await fetchAll(() => {
    let q = db().from('students')
      .select('id,nis,nisn,full_name,gender,birth_place,birth_date,class_id,department_id,academic_year_id,address,status,consent_biometric,updated_at,classes(name),departments(name),academic_years(name),parent_contacts(parent_name,whatsapp,consent_wa),student_accounts(username,is_active,must_change,last_login_at)')
      .order('full_name');
    if (sp.get('class_id')) q = q.eq('class_id', sp.get('class_id'));
    if (sp.get('department_id')) q = q.eq('department_id', sp.get('department_id'));
    if (sp.get('status')) q = q.eq('status', sp.get('status'));
    if (sp.get('q')) { const t = sp.get('q').replace(/[%,()]/g, ''); q = q.or(`full_name.ilike.%${t}%,nis.ilike.%${t}%`); }
    return q;
  });
  const faces = await fetchAll(() => db().from('face_data').select('student_id').order('id'));
  const cnt = {};
  faces.forEach((f) => { cnt[f.student_id] = (cnt[f.student_id] || 0) + 1; });
  return rows.map((r) => ({ ...r, parent: r.parent_contacts?.[0] || r.parent_contacts || null,
    account: (Array.isArray(r.student_accounts) ? r.student_accounts[0] : r.student_accounts) || null, face_samples: cnt[r.id] || 0 }));
});

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const s = await saveStudent(await req.json());
  await audit(admin, 'TAMBAH_SISWA', s.nis, req);
  return s;
});