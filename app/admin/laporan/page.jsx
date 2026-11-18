'use client';
import { useState } from 'react';
import { api, useApi, toast, today, downloadXlsx, ACT_TEXT } from '@/lib/client';
import { Btn, Card, Empty, PageHead, Table } from '@/components/ui';

function range(kind) {
  const t = today(); const d = new Date(t + 'T00:00:00Z');
  const iso = (x) => x.toISOString().slice(0, 10);
  if (kind === 'harian') return [t, t];
  if (kind === 'mingguan') { const s = new Date(d); s.setUTCDate(s.getUTCDate() - ((s.getUTCDay() + 6) % 7)); return [iso(s), t]; }
  if (kind === 'bulanan') return [t.slice(0, 8) + '01', t];
  if (kind === 'semester') { const m = d.getUTCMonth(); const y = d.getUTCFullYear(); return m >= 6 ? [`${y}-07-01`, t] : [`${y}-01-01`, t]; }
  if (kind === 'tahunan') return [`${d.getUTCFullYear()}-01-01`, t];
  return [t, t];
}

export default function Laporan() {
  const [f, setF] = useState({ activity: 'all', from: range('bulanan')[0], to: today(), class_id: '', department_id: '' });
  const [rep, setRep] = useState(null), [busy, setBusy] = useState(false);
  const cls = useApi('/api/crud/classes'), dep = useApi('/api/crud/departments');
  async function run() {
    setBusy(true);
    try { setRep(await api(`/api/laporan?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`)); } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  }
  const preset = (k) => { const [from, to] = range(k); setF({ ...f, from, to }); };
  async function xl() {
    await downloadXlsx(`laporan-${f.from}_${f.to}.xlsx`, rep.rows.map((r) => ({ NIS: r.nis, Nama: r.nama, Kelas: r.kelas, Jurusan: r.jurusan, 'Jumlah Sesi': r.sesi, Hadir: r.hadir, Terlambat: r.terlambat, Izin: r.izin, Sakit: r.sakit, 'Tidak Hadir': r.tidak_hadir, 'Persentase (%)': r.persen, Kedisiplinan: r.kedisiplinan })), 'Laporan');
  }
  const avg = rep && rep.rows.length ? Math.round(rep.rows.reduce((a, r) => a + r.persen, 0) / rep.rows.length * 10) / 10 : 0;
  return (
    <>
      <PageHead title="Laporan & Rekap Presensi" desc="Seluruh angka dihitung langsung dari database">
        {rep && <><Btn variant="ghost" onClick={xl}>⬇ Excel</Btn><Btn variant="ghost" onClick={() => window.print()}>🖨 PDF / Cetak</Btn></>}
      </PageHead>
      <Card className="mb-4 no-print">
        <div className="flex flex-wrap gap-2 mb-3">{['harian', 'mingguan', 'bulanan', 'semester', 'tahunan'].map((k) => <button key={k} className="btn btn-ghost !py-1" onClick={() => preset(k)}>{k}</button>)}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <select className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}><option value="all">Semua kegiatan</option><option value="zuhur">Salat Zuhur</option><option value="wirid">Wirid Remaja</option></select>
          <input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <select className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}><option value="">Semua kelas</option>{(cls.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}><option value="">Semua jurusan</option>{(dep.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <Btn className="mt-3" onClick={run} disabled={busy}>{busy ? 'Menghitung…' : 'Tampilkan Laporan'}</Btn>
      </Card>
      {rep && (
        <Card>
          <div className="mb-3"><h2 className="font-extrabold text-dark text-lg">Laporan Presensi {rep.activity === 'all' ? 'Salat Zuhur & Wirid Remaja' : ACT_TEXT[rep.activity]}</h2>
            <div className="text-sm text-ink/70">{rep.school} · Periode {rep.from} s.d. {rep.to} · {rep.sessionCount} sesi · {rep.rows.length} siswa · rata-rata kehadiran {avg}%</div></div>
          {!rep.rows.length ? <Empty /> : (
            <Table heads={['No', 'NIS', 'Nama', 'Kelas', 'Sesi', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Tdk Hadir', '%', 'Kedisiplinan']}>
              {rep.rows.map((r, i) => (
                <tr key={r.student_id}><td className="td">{i + 1}</td><td className="td">{r.nis}</td><td className="td font-semibold">{r.nama}</td><td className="td">{r.kelas}</td><td className="td">{r.sesi}</td>
                  <td className="td">{r.hadir}</td><td className="td">{r.terlambat}</td><td className="td">{r.izin}</td><td className="td">{r.sakit}</td><td className="td">{r.tidak_hadir}</td>
                  <td className="td font-bold">{r.persen}%</td><td className="td">{r.kedisiplinan}</td></tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
