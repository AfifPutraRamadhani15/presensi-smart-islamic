import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';
import { nowParts } from '@/lib/time';
import { notifyParent } from '@/lib/wa';

export const dynamic = 'force-dynamic';
const STATUSES = ['hadir', 'terlambat', 'izin', 'sakit', 'tidak_hadir'];

// Daftar siswa aktif + status pada sesi tanggal/kegiatan tertentu
export const GET = handle(async (req) => {
  await requireAdmin(req);
  const sp = new URL(req.url).searchParams;
  const activity = sp.get('activity') || 'zuhur', date = sp.get('date') || nowParts().date;
  const { data: session } = await db().from('attendance_sessions').select('*').eq('activity', activity).eq('session_date', date).maybeSingle();
  let q = db().from('students').select('id,nis,full_name,classes(name)').eq('status', 'aktif').order('full_name').limit(2000);
  if (sp.get('class_id')) q = q.eq('class_id', sp.get('class_id'));
  const students = must(await q);
  const recs = session ? must(await db().from('attendance_records').select('*').eq('session_id', session.id).limit(5000)) : [];
  const m = new Map(recs.map((r) => [r.student_id, r]));
  return { session, rows: students.map((s) => ({ ...s, kelas: s.classes?.name || '-', record: m.get(s.id) || null })) };
});

// Verifikasi / input manual oleh admin (cadangan bila face recognition gagal)
export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { student_id, activity, date, status, note, notify } = await req.json();
  if (!STATUSES.includes(status) || !['zuhur', 'wirid'].includes(activity) || !student_id || !date) throw new HttpError(400, 'Data tidak lengkap');
  let { data: session } = await db().from('attendance_sessions').select('*').eq('activity', activity).eq('session_date', date).maybeSingle();
  if (!session) {
    const sc = must(await db().from('attendance_settings').select('*').eq('activity', activity).single());
    session = must(await db().from('attendance_sessions').insert({ activity, session_date: date, start_time: sc.start_time, late_time: sc.late_time, end_time: sc.end_time }).select().single());
  }
  const rec = must(await db().from('attendance_records').upsert({
    session_id: session.id, student_id, status, method: 'manual', note: note || null, verified_by: admin.id, checked_at: new Date().toISOString(),
  }, { onConflict: 'session_id,student_id' }).select().single());
  await audit(admin, 'PRESENSI_MANUAL', `${student_id} ${activity} ${date} ${status}`, req);
  if (notify) {
    const st = must(await db().from('students').select('id,nis,full_name,classes(name)').eq('id', student_id).single());
    await notifyParent({ student: st, className: st.classes?.name, activity, session_date: date, checked_at: rec.checked_at, status, record_id: rec.id });
  }
  return rec;
});

export const DELETE = handle(async (req) => {
  const admin = await requireAdmin(req);
  const id = new URL(req.url).searchParams.get('id');
  must(await db().from('attendance_records').delete().eq('id', id).select());
  await audit(admin, 'HAPUS_PRESENSI', id, req);
  return { ok: true };
});
