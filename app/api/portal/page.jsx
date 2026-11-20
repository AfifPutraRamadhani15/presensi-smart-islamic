'use client';
import { useEffect, useState } from 'react';
import { api, STATUS_COLOR, STATUS_TEXT, ACT_TEXT } from '@/lib/client';

function Stat({ label, value, sub, gold }) {
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${gold ? 'bg-gold text-ink' : 'gloss'}`}>
      <div className="relative text-xs font-semibold opacity-80">{label}</div>
      <div className="relative text-2xl font-extrabold">{value}</div>
      {sub && <div className="relative text-[11px] opacity-80">{sub}</div>}
    </div>
  );
}

export default function Portal() {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    api('/api/portal/me').then((r) => { if (r.must_change) window.location.href = '/portal/ganti-sandi'; else setD(r); })
      .catch((e) => { if (/Sesi/.test(e.message)) window.location.href = '/portal/login'; else setErr(e.message); });
  }, []);
  async function logout() { await api('/api/portal/logout', { method: 'POST' }); window.location.href = '/portal/login'; }

  if (err) return <main className="p-6"><div className="card text-red-600">{err}</div><button className="btn btn-ghost mt-3" onClick={logout}>Keluar</button></main>;
  if (!d) return <main className="p-8 text-center text-sm text-ink/60 animate-pulse">Memuat…</main>;
  const a = d.all, pct = (x) => (x ? `${x.persen}%` : '–');
  return (
    <main className="max-w-3xl mx-auto p-4 pb-10">
      <header className="gloss rounded-3xl p-5 mb-4">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-80">Portal Siswa</div>
            <h1 className="text-xl font-extrabold">{d.student.nama}</h1>
            <div className="text-sm opacity-90">NIS {d.student.nis} · {d.student.kelas}</div>
            <div className="text-xs opacity-80">{d.student.jurusan}</div>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/portal/ganti-sandi" className="btn bg-white/20 !py-1 text-xs">Ganti Sandi</a>
            <button onClick={logout} className="btn bg-white/20 !py-1 text-xs">Keluar</button>
          </div>
        </div>
      </header>

      <p className="text-xs text-ink/60 mb-2">Rekap 30 hari terakhir ({d.from} s.d. {d.to})</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Kehadiran Keseluruhan" value={pct(a)} sub={a ? a.kedisiplinan : 'Belum ada sesi'} gold />
        <Stat label="Hadir / Terlambat" value={a ? `${a.hadir} / ${a.terlambat}` : '–'} sub={a ? `dari ${a.sesi} sesi` : ''} />
        <Stat label="Salat Zuhur" value={pct(d.zuhur)} sub={d.zuhur ? `${d.zuhur.hadir + d.zuhur.terlambat} dari ${d.zuhur.sesi} sesi` : ''} />
        <Stat label="Wirid Remaja" value={pct(d.wirid)} sub={d.wirid ? `${d.wirid.hadir + d.wirid.terlambat} dari ${d.wirid.sesi} sesi` : ''} />
      </div>

      <div className="card mt-4">
        <h2 className="font-bold text-dark mb-2">Riwayat Presensi</h2>
        {!d.history.length ? <div className="text-sm text-ink/50 py-6 text-center">Belum ada riwayat presensi.</div> : (
          <div className="overflow-x-auto rounded-xl border border-emerald/10">
            <table className="w-full min-w-max"><thead><tr>{['Tanggal', 'Kegiatan', 'Jam', 'Status', 'Metode'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{d.history.map((r, i) => (
                <tr key={i}><td className="td">{r.attendance_sessions.session_date}</td><td className="td">{ACT_TEXT[r.attendance_sessions.activity]}</td>
                  <td className="td">{new Date(r.checked_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')}</td>
                  <td className="td"><span className={`badge ${STATUS_COLOR[r.status]}`}>{STATUS_TEXT[r.status]}</span></td><td className="td">{r.method === 'face' ? 'Wajah' : 'Manual'}</td></tr>
              ))}</tbody></table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink/40 text-center mt-4">Data presensi hanya bisa diubah oleh admin sekolah.</p>
    </main>
  );
}