import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireStudent } from '@/lib/portalAuth';
import { buildReport } from '@/lib/report';
import { nowParts, addDays } from '@/lib/time';

export const dynamic = 'force-dynamic';

// Hanya data milik siswa yang sedang login (student_id diambil dari sesi, bukan dari permintaan)
export const GET = handle(async (req) => {
  const s = await requireStudent(req);
  const acc = must(await db().from('student_accounts').select('must_change,is_active,username,students(full_name,nis,status,classes(name),departments(name))').eq('id', s.account_id).single());
  if (!acc.is_active || acc.students?.status !== 'aktif') throw new HttpError(403, 'Akun nonaktif. Hubungi admin sekolah.');
  if (acc.must_change) return { must_change: true };

  const now = nowParts(), from = addDays(now.date, -29);
  const stat = async (activity) => {
    const r = await buildReport({ activity, from, to: now.date, student_id: s.student_id });
    return r.rows[0] || null;
  };
  const [all, zuhur, wirid] = await Promise.all([stat('all'), stat('zuhur'), stat('wirid')]);
  const history = must(await db().from('attendance_records')
    .select('status,method,checked_at,attendance_sessions!inner(activity,session_date)')
    .eq('student_id', s.student_id).order('checked_at', { ascending: false }).limit(60));
  const st = acc.students;
  return { must_change: false, username: acc.username, from, to: now.date,
    student: { nama: st.full_name, nis: st.nis, kelas: st.classes?.name || '-', jurusan: st.departments?.name || '-' },
    all, zuhur, wirid, history };
});