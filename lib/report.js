import { db, fetchAll, must } from './db';
import { getSettings } from './settings';

export function disciplineLabel(pct, late, s) {
  const hi = Number(s.disc_high || 90), mid = Number(s.disc_mid || 75);
  if (pct >= hi) return 'Sangat Disiplin';
  if (pct >= mid) return 'Disiplin';
  if (pct >= 60) return 'Kurang Disiplin';
  return 'Perlu Pembinaan';
}

// Semua angka dihitung dari database. activity: 'zuhur' | 'wirid' | 'all'
export async function buildReport({ activity = 'all', from, to, class_id, department_id, student_id }) {
  const s = await getSettings();
  let sq = db().from('attendance_sessions').select('id,activity,session_date').gte('session_date', from).lte('session_date', to);
  if (activity !== 'all') sq = sq.eq('activity', activity);
  const sessions = must(await sq);
  const sessionCount = sessions.length;

  const students = await fetchAll(() => {
    let q = db().from('students').select('id,nis,full_name,class_id,classes(name),departments(name)').eq('status', 'aktif').order('full_name');
    if (class_id) q = q.eq('class_id', class_id);
    if (department_id) q = q.eq('department_id', department_id);
    if (student_id) q = q.eq('id', student_id);
    return q;
  });

  const recs = await fetchAll(() => {
    let q = db().from('attendance_records').select('id,student_id,status,attendance_sessions!inner(activity,session_date)')
      .gte('attendance_sessions.session_date', from).lte('attendance_sessions.session_date', to).order('id');
    if (activity !== 'all') q = q.eq('attendance_sessions.activity', activity);
    return q;
  });

  const by = new Map();
  for (const r of recs) {
    const o = by.get(r.student_id) || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, tidak_hadir: 0 };
    o[r.status]++; by.set(r.student_id, o);
  }

  const rows = students.map((st) => {
    const c = by.get(st.id) || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, tidak_hadir: 0 };
    const accounted = c.hadir + c.terlambat + c.izin + c.sakit + c.tidak_hadir;
    const alpa = c.tidak_hadir + Math.max(0, sessionCount - accounted);
    const present = c.hadir + c.terlambat;
    const pct = sessionCount ? Math.round((present / sessionCount) * 1000) / 10 : 0;
    return {
      student_id: st.id, nis: st.nis, nama: st.full_name, kelas: st.classes?.name || '-', jurusan: st.departments?.name || '-',
      class_id: st.class_id, sesi: sessionCount, hadir: c.hadir, terlambat: c.terlambat, izin: c.izin, sakit: c.sakit,
      tidak_hadir: alpa, persen: pct, kedisiplinan: sessionCount ? disciplineLabel(pct, c.terlambat, s) : '-',
    };
  });
  return { rows, sessionCount, settings: s };
}
