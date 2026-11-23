import { db, must, fetchAll } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireStudent } from '@/lib/portalAuth';
import { nowParts } from '@/lib/time';
import { semesterRange, pointsFor, EARLY_MIN } from '@/lib/points';

export const dynamic = 'force-dynamic';
const hm = (t) => String(t).slice(0, 5).replace(':', '.');

// Hanya data milik siswa yang sedang login (student_id diambil dari sesi, bukan dari permintaan)
export const GET = handle(async (req) => {
  const s = await requireStudent(req);
  const acc = must(await db().from('student_accounts').select('must_change,is_active,approval_status,username,,students(full_name,nis,status,created_at,class_id,classes(name),departments(name))').eq('id', s.account_id).single());
  if (acc.is_active === false || acc.students?.status !== 'aktif') throw new HttpError(403, 'Akun nonaktif. Hubungi admin sekolah.');
  if (acc.approval_status && acc.approval_status !== 'disetujui') throw new HttpError(403, 'Akun belum dikonfirmasi admin.');
  if (acc.must_change) return { must_change: true };

  const st = acc.students, now = nowParts(), sem = semesterRange(now.date);
  const createdDate = nowParts(new Date(st.created_at)).date;
  const from = createdDate > sem.from ? createdDate : sem.from;

  // ===== Riwayat per sesi (khusus siswa ini) =====
  const sessions = must(await db().from('attendance_sessions').select('id,activity,session_date,start_time,late_time,end_time,is_open')
    .gte('session_date', from).lte('session_date', sem.to).eq('is_open', true).order('session_date', { ascending: false }).order('start_time', { ascending: false }));
  const recs = must(await db().from('attendance_records').select('session_id,status,method,checked_at,attendance_sessions!inner(session_date)')
    .eq('student_id', s.student_id).gte('attendance_sessions.session_date', from));
  const byS = new Map(recs.map((r) => [r.session_id, r]));
  const finished = (x) => x.session_date < now.date || (x.session_date === now.date && x.end_time < now.time);

  const riwayat = { zuhur: [], wirid: [] };
  const stat = { zuhur: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alfa: 0, total: 0, poin: 0 }, wirid: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alfa: 0, total: 0, poin: 0 } };
  for (const x of sessions) {
    const r = byS.get(x.id);
    let status, poin = 0;
    if (r) {
      status = r.status === 'tidak_hadir' ? 'alfa' : r.status;
      poin = pointsFor({ status: r.status, method: r.method, checked_at: r.checked_at, start_time: x.start_time });
    } else if (finished(x)) { status = 'alfa'; poin = -1; }
    else status = 'belum';
    riwayat[x.activity].push({ tanggal: x.session_date, status, jam: r ? hm(nowParts(new Date(r.checked_at)).time) : null, metode: r?.method || null, poin, jadwal: `${hm(x.start_time)}–${hm(x.end_time)}`, batas: hm(x.late_time) });
    if (status !== 'belum') { const c = stat[x.activity]; c.total++; c[status]++; c.poin += poin; }
  }
  for (const k of ['zuhur', 'wirid']) { const c = stat[k]; c.persen = c.total ? Math.round(((c.hadir + c.terlambat) / c.total) * 100) : 0; }

  // Beruntun: sesi berturut-turut yang dihadiri (izin/sakit tidak memutus, alfa memutus)
  const all = [...riwayat.zuhur.map((r) => ({ ...r, k: 'zuhur' })), ...riwayat.wirid.map((r) => ({ ...r, k: 'wirid' }))]
    .filter((r) => r.status !== 'belum').sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  let streak = 0;
  for (const r of all) { if (r.status === 'hadir' || r.status === 'terlambat') streak++; else if (r.status === 'alfa') break; }
  const terbaru = all.slice(0, 8);
  const poinSaya = stat.zuhur.poin + stat.wirid.poin;

  // ===== Peringkat (dihitung di database) =====
  let peringkat = { aktif: false };
  const rpc = await db().rpc('semester_points', { p_from: sem.from, p_to: sem.to, p_early: EARLY_MIN });
  if (!rpc.error) {
    const people = await fetchAll(() => db().from('students').select('id,full_name,class_id,classes(name)').eq('status', 'aktif').order('id'));
    const info = new Map(people.map((p) => [p.id, p]));
    const rows = (rpc.data || []).filter((r) => info.has(r.student_id));
    rows.sort((a, b) => b.points - a.points || b.hadir - a.hadir || info.get(a.student_id).full_name.localeCompare(info.get(b.student_id).full_name));
    const rank = (list) => { let rk = 0, prev = null; list.forEach((r, i) => { if (r.points !== prev) { rk = i + 1; prev = r.points; } r.rank = rk; }); return list; };
    rank(rows);
    const me = rows.find((r) => r.student_id === s.student_id);
    const myPoints = me ? me.points : 0;
    const myRank = me ? me.rank : 1 + rows.filter((r) => r.points > myPoints).length;
    const cls = rank(rows.filter((r) => info.get(r.student_id).class_id === st.class_id).map((r) => ({ ...r })));
    const myClass = cls.find((r) => r.student_id === s.student_id);
    const fmt = (r) => ({ rank: r.rank, nama: info.get(r.student_id).full_name, kelas: info.get(r.student_id).classes?.name || '-', poin: r.points, saya: r.student_id === s.student_id });
    peringkat = {
      aktif: true, poin: myPoints, rank: myRank, dari: Math.max(rows.length, 1),
      rank_kelas: myClass ? myClass.rank : 1 + cls.filter((r) => r.points > myPoints).length, dari_kelas: Math.max(cls.length, 1),
      top: rows.slice(0, 10).map(fmt), top_kelas: cls.slice(0, 10).map(fmt),
    };
  }

  return {
    must_change: false, username: acc.username, semester: sem.label, sejak: from, sampai: sem.to,
    siswa: { nama: st.full_name, nis: st.nis, kelas: st.classes?.name || '-', jurusan: st.departments?.name || '-' },
    poin: peringkat.aktif ? peringkat.poin : poinSaya, stat, riwayat, streak, terbaru, peringkat,
    aturan: { early: EARLY_MIN },
  };
});