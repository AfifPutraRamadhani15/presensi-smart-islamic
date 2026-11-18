'use client';
import { useEffect, useState } from 'react';
import { api, useApi, toast, today, STATUS_COLOR, STATUS_TEXT } from '@/lib/client';
import { Card, PageHead, Spinner, Table } from '@/components/ui';

export default function Rekap() {
  const [f, setF] = useState({ activity: 'zuhur', date: today(), class_id: '' });
  const cls = useApi('/api/crud/classes');
  const [data, setData] = useState(null), [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setData(await api(`/api/records?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`)); } catch (e) { toast(e.message, 'err'); } setBusy(false); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.activity, f.date, f.class_id]);

  async function setStatus(s, status) {
    if (!status) return;
    try {
      await api('/api/records', { method: 'POST', body: { student_id: s.id, activity: f.activity, date: f.date, status, notify: true } });
      toast('Status diperbarui'); load();
    } catch (e) { toast(e.message, 'err'); }
  }
  async function clear(s) {
    if (!window.confirm('Hapus catatan presensi siswa ini?')) return;
    try { await api(`/api/records?id=${s.record.id}`, { method: 'DELETE' }); load(); } catch (e) { toast(e.message, 'err'); }
  }
  const rows = data?.rows || [];
  const count = (st) => rows.filter((r) => r.record?.status === st).length;
  return (
    <>
      <PageHead title="Rekap & Verifikasi Manual" desc="Cadangan bila pengenalan wajah gagal, serta input izin/sakit" />
      <Card className="mb-4"><div className="grid sm:grid-cols-3 gap-2">
        <select className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}><option value="zuhur">Salat Zuhur</option><option value="wirid">Wirid Remaja</option></select>
        <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <select className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}><option value="">Semua kelas</option>{(cls.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="mt-3 text-sm flex flex-wrap gap-3">
        {['hadir', 'terlambat', 'izin', 'sakit', 'tidak_hadir'].map((k) => <span key={k} className={`badge ${STATUS_COLOR[k]}`}>{STATUS_TEXT[k]}: {count(k)}</span>)}
        <span className="badge bg-gray-200">Belum tercatat: {rows.filter((r) => !r.record).length}</span>
        {!data?.session && <span className="text-ink/60">Belum ada sesi pada tanggal ini (dibuat otomatis saat presensi pertama).</span>}
      </div></Card>
      <Card>
        {busy && !data ? <Spinner /> : (
          <Table heads={['Nama', 'NIS', 'Kelas', 'Status', 'Jam', 'Metode', 'Ubah Status']}>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="td font-semibold">{s.full_name}</td><td className="td">{s.nis}</td><td className="td">{s.kelas}</td>
                <td className="td">{s.record ? <span className={`badge ${STATUS_COLOR[s.record.status]}`}>{STATUS_TEXT[s.record.status]}</span> : <span className="badge bg-gray-200">Belum</span>}</td>
                <td className="td">{s.record ? new Date(s.record.checked_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.') : '-'}</td>
                <td className="td">{s.record ? (s.record.method === 'face' ? 'Wajah' : 'Manual') : '-'}</td>
                <td className="td whitespace-nowrap">
                  <select className="input !w-auto !py-1" value="" onChange={(e) => setStatus(s, e.target.value)}>
                    <option value="">Pilih…</option>{Object.entries(STATUS_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {s.record && <button className="ml-2 text-red-600 text-xs font-semibold" onClick={() => clear(s)}>Hapus</button>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
