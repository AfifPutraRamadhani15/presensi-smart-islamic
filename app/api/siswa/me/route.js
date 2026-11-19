import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStudent } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';

// >>> SESUAIKAN dengan sql/schema.sql <<<
const T = { sessions: 'attendance_sessions', records: 'attendance_records' };
const REC = { student: 'student_id', session: 'session_id' };

const PTS = { hadir: 10, terlambat: 5, izin: 2, alfa: 0 };
const LEVELS = [
  { name: 'Pemula', icon: '🌱', min: 0 },
  { name: 'Rajin', icon: '⭐', min: 100 },
  { name: 'Bintang', icon: '🌟', min: 300 },
  { name: 'Juara', icon: '🏆', min: 600 },
  { name: 'Legenda', icon: '👑', min: 1000 },
];

export async function GET() {
  try {
    const me = await getStudent();
    if (!me) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const sb = db();

    const { data: st, error: e0 } = await sb.from('students').select('id,nis,full_name,classes(name)').eq('id', me.id).maybeSingle();
    if (e0) throw e0;
    if (!st) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 401 });

    const { data: sess, error: e1 } = await sb.from(T.sessions).select('id,activity,session_date')
      .lte('session_date', today).order('session_date', { ascending: false }).limit(120);
    if (e1) throw e1;

    const ids = (sess || []).map((s) => s.id);
    let recs = [];
    if (ids.length) {
      const { data, error } = await sb.from(T.records).select(`${REC.session},status`).eq(REC.student, st.id).in(REC.session, ids);
      if (error) throw error;
      recs = data || [];
    }
    const byS = new Map(recs.map((r) => [r[REC.session], r.status]));

    const counts = { hadir: 0, terlambat: 0, izin: 0, alfa: 0 };
    let points = 0, streak = 0, best = 0;
    const history = [];

    for (const s of [...(sess || [])].reverse()) {
      let status = byS.get(s.id);
      if (!status) { if (s.session_date >= today) continue; status = 'alfa'; }
      if (status === 'tidak_hadir') status = 'alfa';
      if (status === 'sakit') status = 'izin';
      if (!(status in PTS)) continue;

      counts[status]++;
      let pts = PTS[status];
      if (status === 'hadir' || status === 'terlambat') {
        streak++;
        if (streak % 5 === 0) pts += 10;
        best = Math.max(best, streak);
      } else if (status === 'alfa') {
        streak = 0;
      }
      points += pts;
      history.push({ date: s.session_date, activity: s.activity, status, pts });
    }

    const total = counts.hadir + counts.terlambat + counts.izin + counts.alfa;
    const pct = total ? Math.round(((counts.hadir + counts.terlambat) / total) * 100) : 0;

    let li = 0;
    LEVELS.forEach((l, i) => { if (points >= l.min) li = i; });
    const level = LEVELS[li];
    const next = LEVELS[li + 1] || null;
    const progress = next ? Math.round(((points - level.min) / (next.min - level.min)) * 100) : 100;

    let message = 'Mulai kumpulkan poinmu dengan hadir tepat waktu!';
    if (streak >= 5) message = `Luar biasa! ${streak} kali hadir beruntun. Pertahankan!`;
    else if (pct >= 90 && total >= 5) message = 'Kehadiranmu sangat baik. Terus semangat!';
    else if (counts.alfa > 0 && streak === 0) message = 'Ayo bangkit! Hadir hari ini untuk mulai streak barumu.';
    else if (total > 0) message = 'Bagus! Hadir tepat waktu menambah poin lebih banyak.';

    const kelas = Array.isArray(st.classes) ? st.classes[0]?.name : st.classes?.name;

    return NextResponse.json({
      student: { nama: st.full_name, nis: st.nis, kelas: kelas || '-' },
      points, level, next, progress, counts, total, pct, streak, best, message,
      history: history.slice(-10).reverse(),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal memuat data' }, { status: 500 });
  }
}