import { db, fetchAll, must } from './db';
import { nowParts, addDays } from './time';

function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // Senin=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export async function dashboardData() {
  const now = nowParts();
  const monthStart = now.date.slice(0, 8) + '01';
  const [y, m] = now.date.split('-').map(Number);
  const sixAgo = new Date(Date.UTC(y, m - 1 - 5, 1)).toISOString().slice(0, 10);

  const students = must(await db().from('students').select('id,status,class_id'));
  const active = students.filter((s) => s.status === 'aktif');
  const classes = must(await db().from('classes').select('id,name'));

  const sessions = must(await db().from('attendance_sessions').select('id,activity,session_date').gte('session_date', sixAgo).lte('session_date', now.date));
  const recs = await fetchAll(() =>
    db().from('attendance_records').select('student_id,status,attendance_sessions!inner(activity,session_date)').gte('attendance_sessions.session_date', sixAgo).order('id'));
  const classOf = new Map(students.map((s) => [s.id, s.class_id]));
  const isPresent = (r) => r.status === 'hadir' || r.status === 'terlambat';

  // Hari ini
  const today = {};
  for (const act of ['zuhur', 'wirid']) {
    const has = sessions.some((s) => s.activity === act && s.session_date === now.date);
    const rs = recs.filter((r) => r.attendance_sessions.activity === act && r.attendance_sessions.session_date === now.date);
    const hadir = rs.filter((r) => r.status === 'hadir').length;
    const terlambat = rs.filter((r) => r.status === 'terlambat').length;
    const izin = rs.filter((r) => r.status === 'izin' || r.status === 'sakit').length;
    today[act] = { has_session: has, hadir, terlambat, izin, tidak_hadir: has ? Math.max(0, active.length - hadir - terlambat - izin) : 0 };
  }
  const todaySessions = sessions.filter((s) => s.session_date === now.date).length;
  const todayPresent = ['zuhur', 'wirid'].reduce((a, k) => a + today[k].hadir + today[k].terlambat, 0);
  const pctToday = todaySessions && active.length ? Math.round((todayPresent / (todaySessions * active.length)) * 1000) / 10 : 0;

  // Harian 14 hari
  const dailyLabels = Array.from({ length: 14 }, (_, i) => addDays(now.date, i - 13));
  const countBy = (keyFn, act) => {
    const o = {};
    for (const r of recs) if (isPresent(r) && (!act || r.attendance_sessions.activity === act)) { const k = keyFn(r.attendance_sessions.session_date); o[k] = (o[k] || 0) + 1; }
    return o;
  };
  const dz = countBy((d) => d, 'zuhur'), dw = countBy((d) => d, 'wirid');
  const daily = { labels: dailyLabels.map((d) => d.slice(5)), zuhur: dailyLabels.map((d) => dz[d] || 0), wirid: dailyLabels.map((d) => dw[d] || 0) };

  // Mingguan 8 minggu
  const w0 = weekStart(now.date);
  const weekLabels = Array.from({ length: 8 }, (_, i) => addDays(w0, (i - 7) * 7));
  const wz = countBy(weekStart, 'zuhur'), ww = countBy(weekStart, 'wirid');
  const weekly = { labels: weekLabels.map((d) => d.slice(5)), zuhur: weekLabels.map((d) => wz[d] || 0), wirid: weekLabels.map((d) => ww[d] || 0) };

  // Bulanan 6 bulan + perkembangan kedisiplinan
  const monthLabels = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(y, m - 1 - (5 - i), 1)).toISOString().slice(0, 7));
  const mz = countBy((d) => d.slice(0, 7), 'zuhur'), mw = countBy((d) => d.slice(0, 7), 'wirid');
  const monthly = { labels: monthLabels, zuhur: monthLabels.map((k) => mz[k] || 0), wirid: monthLabels.map((k) => mw[k] || 0) };
  const sessPerMonth = {};
  for (const s of sessions) { const k = s.session_date.slice(0, 7); sessPerMonth[k] = (sessPerMonth[k] || 0) + 1; }
  const discipline = {
    labels: monthLabels,
    values: monthLabels.map((k) => {
      const exp = (sessPerMonth[k] || 0) * active.length;
      return exp ? Math.round(((mz[k] || 0) + (mw[k] || 0)) / exp * 1000) / 10 : 0;
    }),
  };

  // Persentase per kelas bulan ini
  const sessThisMonth = sessions.filter((s) => s.session_date >= monthStart).length;
  const perClass = classes.map((c) => {
    const size = active.filter((s) => s.class_id === c.id).length;
    const present = recs.filter((r) => isPresent(r) && r.attendance_sessions.session_date >= monthStart && classOf.get(r.student_id) === c.id).length;
    const exp = size * sessThisMonth;
    return { name: c.name, pct: exp ? Math.round(present / exp * 1000) / 10 : 0, size };
  }).sort((a, b) => b.pct - a.pct);

  const recent = must(await db().from('attendance_records')
    .select('id,status,method,checked_at,students(nis,full_name,classes(name)),attendance_sessions(activity,session_date)')
    .order('checked_at', { ascending: false }).limit(10));
  const notifs = must(await db().from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(5));

  return {
    totals: { students: students.length, active: active.length, classes: classes.length },
    today, pctToday, daily, weekly, monthly, discipline, perClass,
    compare: { zuhur: mz[monthLabels[5]] || 0, wirid: mw[monthLabels[5]] || 0 },
    late_today: today.zuhur.terlambat + today.wirid.terlambat, recent, notifs,
  };
}
