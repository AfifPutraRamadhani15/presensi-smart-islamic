'use client';
import { useApi, api, STATUS_COLOR, STATUS_TEXT, ACT_TEXT } from '@/lib/client';
import { Card, PageHead, Spinner, Stat, Table } from '@/components/ui';
import { TwoBar, TwoLine, Compare, ClassBar, PctLine } from '@/components/Charts';

const EMPTY_ACT = { hadir: 0, terlambat: 0, tidak_hadir: 0, has_session: false };

export default function Dashboard() {
  const { data: d, error, loading, reload } = useApi('/api/dashboard');
  if (loading) return <Spinner />;
  if (error) return <div className="card text-red-600">Gagal memuat: {error}</div>;
  if (!d) return <div className="card text-red-600">Data dashboard kosong. Coba muat ulang.</div>;

  const t = d.today || {};
  const zuhur = { ...EMPTY_ACT, ...(t.zuhur || {}) };
  const wirid = { ...EMPTY_ACT, ...(t.wirid || {}) };
  const totals = d.totals || { students: 0, classes: 0, active: 0 };
  const notifs = d.notifs || [];
  const recent = d.recent || [];
  const perClass = d.perClass || [];
  const box = 'h-64';

  return (
    <>
      <PageHead title="Dashboard" desc="Data real-time dari database"><button className="btn btn-ghost" onClick={reload}>↻ Muat ulang</button></PageHead>

      {notifs.length > 0 && (
        <Card className="mb-4 !bg-gold/20">
          <div className="flex justify-between"><b className="text-sm">🔔 Notifikasi</b><button className="text-xs underline" onClick={async () => { await api('/api/notifikasi', { method: 'PUT' }); reload(); }}>Tandai dibaca</button></div>
          {notifs.map((n) => <div key={n.id} className="text-sm mt-1">• <b>{n.title}</b> {n.body}</div>)}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Siswa" value={totals.students ?? 0} sub={`${totals.active ?? 0} aktif`} />
        <Stat label="Total Kelas" value={totals.classes ?? 0} tone="light" />
        <Stat label="Persentase Hadir Hari Ini" value={`${d.pctToday ?? 0}%`} tone="gold" />
        <Stat label="Terlambat Hari Ini" value={d.late_today ?? 0} tone="light" />
        <Stat label="Hadir Salat Zuhur" value={zuhur.hadir + zuhur.terlambat} sub={zuhur.has_session ? `Tidak hadir: ${zuhur.tidak_hadir}` : 'Belum ada sesi'} />
        <Stat label="Hadir Wirid Remaja" value={wirid.hadir + wirid.terlambat} sub={wirid.has_session ? `Tidak hadir: ${wirid.tidak_hadir}` : 'Belum ada sesi'} />
        <Stat label="Tidak Hadir Zuhur" value={zuhur.tidak_hadir} tone="light" />
        <Stat label="Tidak Hadir Wirid" value={wirid.tidak_hadir} tone="light" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card><h3 className="font-bold text-dark mb-2">Kehadiran Harian (14 hari)</h3><div className={box}><TwoBar data={d.daily || []} /></div></Card>
        <Card><h3 className="font-bold text-dark mb-2">Kehadiran Mingguan (8 minggu)</h3><div className={box}><TwoLine data={d.weekly || []} /></div></Card>
        <Card><h3 className="font-bold text-dark mb-2">Kehadiran Bulanan (6 bulan)</h3><div className={box}><TwoBar data={d.monthly || []} /></div></Card>
        <Card><h3 className="font-bold text-dark mb-2">Perbandingan Bulan Ini</h3><div className={box}><Compare data={d.compare || []} /></div></Card>
        <Card><h3 className="font-bold text-dark mb-2">% Kehadiran per Kelas (bulan ini)</h3><div className={box}><ClassBar rows={perClass.slice(0, 12)} /></div></Card>
        <Card><h3 className="font-bold text-dark mb-2">Perkembangan Kedisiplinan</h3><div className={box}><PctLine data={d.discipline || []} /></div></Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-bold text-dark mb-2">Aktivitas Terbaru</h3>
        <Table heads={['Nama', 'NIS', 'Kelas', 'Kegiatan', 'Jam', 'Status', 'Metode']}>
          {recent.map((r) => (
            <tr key={r.id}>
              <td className="td font-semibold">{r.students?.full_name}</td><td className="td">{r.students?.nis}</td><td className="td">{r.students?.classes?.name || '-'}</td>
              <td className="td">{ACT_TEXT[r.attendance_sessions?.activity]}</td>
              <td className="td">{new Date(r.checked_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')}</td>
              <td className="td"><span className={`badge ${STATUS_COLOR[r.status]}`}>{STATUS_TEXT[r.status]}</span></td><td className="td">{r.method === 'face' ? 'Wajah' : 'Manual'}</td>
            </tr>
          ))}
          {!recent.length && <tr><td className="td text-center text-ink/50" colSpan={7}>Belum ada presensi.</td></tr>}
        </Table>
      </Card>
    </>
  );
}