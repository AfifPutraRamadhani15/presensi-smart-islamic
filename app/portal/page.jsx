'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const ST = {
  hadir: { t: 'Hadir', c: 'bg-emerald/20 text-dark', i: '✅' },
  terlambat: { t: 'Terlambat', c: 'bg-gold/30 text-ink', i: '⏰' },
  izin: { t: 'Izin', c: 'bg-blue-100 text-blue-800', i: '📝' },
  sakit: { t: 'Sakit', c: 'bg-purple-100 text-purple-800', i: '🤒' },
  alfa: { t: 'Alfa', c: 'bg-red-100 text-red-700', i: '❌' },
  belum: { t: 'Belum', c: 'bg-gray-200 text-gray-600', i: '⏳' },
};
const TABS = [['ringkasan', '🏠', 'Ringkasan'], ['zuhur', '🕌', 'Zuhur'], ['wirid', '📖', 'Wirid'], ['peringkat', '🏆', 'Peringkat']];

const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const tgl = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayNum = (d) => new Date(d + 'T00:00:00Z').getUTCDate();
const monShort = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });
const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
const sign = (p) => (p > 0 ? `+${p}` : `${p}`);
const pcolor = (p) => (p > 0 ? 'text-emerald' : p < 0 ? 'text-red-600' : 'text-ink/40');

function Badge({ s }) { const x = ST[s]; return <span className={`badge ${x.c} whitespace-nowrap`}>{x.i} {x.t}</span>; }

function Row({ r, label }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="w-11 shrink-0 text-center rounded-xl bg-light/70 py-1">
        <div className="text-lg font-extrabold leading-none text-dark">{dayNum(r.tanggal)}</div>
        <div className="text-[10px] uppercase font-semibold text-ink/60">{monShort(r.tanggal)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Badge s={r.status} />{label && <span className="text-xs font-semibold text-ink/60">{label}</span>}</div>
        <div className="text-[11px] text-ink/50 mt-0.5 truncate">
          {tgl(r.tanggal)}{r.jam ? ` · absen ${r.jam}${r.metode === 'manual' ? ' (manual)' : ''}` : r.status === 'alfa' ? ' · tidak absen' : ''} · jadwal {r.jadwal}
        </div>
      </div>
      <div className={`shrink-0 text-right text-base font-extrabold ${pcolor(r.poin)}`}>{r.status === 'belum' ? '–' : sign(r.poin)}<div className="text-[9px] font-semibold text-ink/40 -mt-0.5">POIN</div></div>
    </li>
  );
}

function Stat({ label, value, tone = '' }) {
  return <div className={`rounded-2xl p-3 text-center bg-white shadow-soft border border-emerald/10 ${tone}`}><div className="text-xl sm:text-2xl font-extrabold text-dark">{value}</div><div className="text-[11px] font-semibold text-ink/60">{label}</div></div>;
}

function Activity({ d, k }) {
  const s = d.stat[k], list = d.riwayat[k];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Stat label="Kehadiran" value={`${s.persen}%`} tone="!bg-gold/25" />
        <Stat label="Hadir" value={s.hadir} /><Stat label="Terlambat" value={s.terlambat} />
        <Stat label="Izin/Sakit" value={s.izin + s.sakit} /><Stat label="Alfa" value={s.alfa} /><Stat label="Poin" value={sign(s.poin)} />
      </div>
      <div className="card !p-3 sm:!p-4">
        <h3 className="font-bold text-dark px-1">Riwayat {k === 'zuhur' ? 'Salat Zuhur' : 'Wirid Remaja'}</h3>
        {!list.length ? <div className="text-sm text-ink/50 py-8 text-center">Belum ada sesi {k === 'zuhur' ? 'Salat Zuhur' : 'Wirid Remaja'} semester ini.</div>
          : <ul className="divide-y divide-emerald/10">{list.map((r, i) => <Row key={i} r={r} />)}</ul>}
      </div>
    </div>
  );
}

function Board({ d }) {
  const [mode, setMode] = useState('sekolah');
  const p = d.peringkat;
  if (!p.aktif) return <div className="card text-sm text-ink/60 text-center py-8">Peringkat belum aktif. Minta admin menjalankan pembaruan database (<code>patch-poin.sql</code>).</div>;
  const list = mode === 'sekolah' ? p.top : p.top_kelas;
  const rank = mode === 'sekolah' ? p.rank : p.rank_kelas, total = mode === 'sekolah' ? p.dari : p.dari_kelas;
  const inTop = list.some((x) => x.saya);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white shadow-soft">
        {[['sekolah', '🏫 Satu Sekolah'], ['kelas', `👥 Kelasku`]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-xl py-2 text-sm font-bold transition ${mode === k ? 'gloss' : 'text-dark'}`}><span className="relative">{l}</span></button>
        ))}
      </div>
      <div className="card !p-3 sm:!p-4">
        <div className="flex items-baseline justify-between px-1 mb-1"><h3 className="font-bold text-dark">🏆 Top 10 Poin</h3><span className="text-[11px] text-ink/50">{d.semester}</span></div>
        {!list.length ? <div className="text-sm text-ink/50 py-8 text-center">Belum ada poin tercatat semester ini.</div> : (
          <ol className="divide-y divide-emerald/10">
            {list.map((x, i) => (
              <li key={i} className={`flex items-center gap-3 py-2.5 px-1 ${x.saya ? 'bg-gold/20 rounded-xl px-2 -mx-1' : ''}`}>
                <div className="w-8 text-center text-lg font-extrabold text-dark shrink-0">{medal(x.rank)}</div>
                <div className="w-9 h-9 rounded-full gloss flex items-center justify-center text-xs font-extrabold shrink-0"><span className="relative">{initials(x.nama)}</span></div>
                <div className="min-w-0 flex-1"><div className="font-bold text-sm text-ink truncate">{x.nama}{x.saya && <span className="ml-1 text-[10px] font-extrabold text-primary">(KAMU)</span>}</div><div className="text-[11px] text-ink/50 truncate">{x.kelas}</div></div>
                <div className={`text-right font-extrabold text-lg ${pcolor(x.poin)} shrink-0`}>{x.poin}<div className="text-[9px] font-semibold text-ink/40 -mt-0.5">POIN</div></div>
              </li>
            ))}
          </ol>
        )}
        {!inTop && <div className="mt-2 rounded-xl bg-gold/20 p-3 flex items-center gap-3"><div className="font-extrabold text-dark text-lg w-8 text-center">#{rank}</div><div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{d.siswa.nama} (kamu)</div><div className="text-[11px] text-ink/60">Peringkat {rank} dari {total}</div></div><div className={`font-extrabold text-lg ${pcolor(p.poin)}`}>{p.poin}</div></div>}
      </div>
    </div>
  );
}

export default function Portal() {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [tab, setTab] = useState('ringkasan');
  useEffect(() => {
    api('/api/portal/me').then((r) => { if (r.must_change) window.location.href = '/portal/ganti-sandi'; else setD(r); }).catch((e) => setErr(e.message));
  }, []);
  async function logout() { await api('/api/portal/logout', { method: 'POST' }); window.location.href = '/portal/login'; }

  if (err) return <main className="p-6 max-w-md mx-auto"><div className="card text-red-600 text-sm">{err}</div><button className="btn btn-ghost mt-3" onClick={logout}>Keluar</button></main>;
  if (!d) return <main className="min-h-screen flex items-center justify-center text-sm text-ink/60 animate-pulse">Memuat dashboard…</main>;

  const p = d.peringkat, a = d.stat;
  const hadirTotal = a.zuhur.hadir + a.zuhur.terlambat + a.wirid.hadir + a.wirid.terlambat;
  const sesiTotal = a.zuhur.total + a.wirid.total;
  const persen = sesiTotal ? Math.round((hadirTotal / sesiTotal) * 100) : 0;

  return (
    <main className="min-h-screen bg-surface pb-10">
      {/* HEADER */}
      <header className="gloss rounded-b-[2rem] pt-[max(1rem,env(safe-area-inset-top))] pb-16 px-4">
        <div className="relative mx-auto max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-lg font-extrabold shrink-0">{initials(d.siswa.nama)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] opacity-80">Portal Siswa</div>
              <h1 className="text-lg sm:text-xl font-extrabold leading-tight break-words">{d.siswa.nama}</h1>
              <div className="text-xs sm:text-sm opacity-90">NIS {d.siswa.nis} · {d.siswa.kelas}</div>
              <div className="text-[11px] opacity-75 truncate">{d.siswa.jurusan}</div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <a href="/portal/ganti-sandi" className="btn bg-white/20 !py-1 !px-3 text-xs">🔑 Sandi</a>
              <button onClick={logout} className="btn bg-white/20 !py-1 !px-3 text-xs">Keluar</button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-3 sm:px-4 -mt-12 space-y-3">
        {/* KARTU POIN */}
        <section className="card !p-4 sm:!p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink/60">⭐ Poin {d.semester}</div>
              <div className={`text-5xl sm:text-6xl font-extrabold leading-none mt-1 ${pcolor(d.poin)}`}>{d.poin}</div>
              <div className="text-[11px] text-ink/50 mt-1">{sesiTotal} sesi dihitung · kehadiran {persen}%</div>
            </div>
            <div className="text-right shrink-0 space-y-1.5">
              {p.aktif && <div className="rounded-2xl bg-gold/25 px-3 py-2"><div className="text-[10px] font-bold text-ink/60">PERINGKAT</div><div className="text-2xl font-extrabold text-dark leading-none">#{p.rank}<span className="text-xs font-semibold text-ink/50"> /{p.dari}</span></div></div>}
              <div className="rounded-2xl bg-light px-3 py-1.5 text-xs font-bold text-dark">🔥 Beruntun {d.streak}</div>
            </div>
          </div>
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold text-primary">Cara mendapat poin</summary>
            <ul className="mt-2 space-y-1 text-ink/70">
              <li><b className="text-emerald">+3</b> hadir tepat waktu (dalam {d.aturan.early} menit pertama sejak dibuka)</li>
              <li><b className="text-emerald">+2</b> hadir sebelum batas terlambat</li>
              <li><b className="text-emerald">+1</b> hadir terlambat</li>
              <li><b>0</b> izin / sakit</li>
              <li><b className="text-red-600">−1</b> tidak hadir (alfa)</li>
              <li className="text-ink/50">Poin direset setiap semester baru (1 Juli &amp; 1 Januari).</li>
            </ul>
          </details>
        </section>

        {/* TAB */}
        <nav className="sticky top-0 z-20 -mx-1 px-1 py-1 bg-surface/90 backdrop-blur">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white shadow-soft">
            {TABS.map(([k, ic, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-xl py-2 text-[11px] sm:text-sm font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${tab === k ? 'gloss' : 'text-dark'}`}>
                <span className="relative text-base leading-none">{ic}</span><span className="relative">{l}</span>
              </button>
            ))}
          </div>
        </nav>

        {tab === 'ringkasan' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Zuhur" value={`${a.zuhur.persen}%`} /><Stat label="Wirid" value={`${a.wirid.persen}%`} />
              <Stat label="Total Hadir" value={hadirTotal} /><Stat label="Alfa" value={a.zuhur.alfa + a.wirid.alfa} />
            </div>
            <div className="card !p-3 sm:!p-4">
              <h3 className="font-bold text-dark px-1">Aktivitas Terbaru</h3>
              {!d.terbaru.length ? <div className="text-sm text-ink/50 py-8 text-center">Belum ada riwayat presensi semester ini.</div>
                : <ul className="divide-y divide-emerald/10">{d.terbaru.map((r, i) => <Row key={i} r={r} label={r.k === 'zuhur' ? 'Salat Zuhur' : 'Wirid Remaja'} />)}</ul>}
            </div>
            {p.aktif && p.top.length > 0 && (
              <button onClick={() => setTab('peringkat')} className="card !p-3 w-full text-left flex items-center gap-3">
                <div className="text-3xl">🏆</div>
                <div className="flex-1 min-w-0"><div className="font-bold text-dark text-sm">Juara saat ini: {p.top[0].nama}</div><div className="text-[11px] text-ink/60">{p.top[0].kelas} · {p.top[0].poin} poin — lihat peringkat lengkap →</div></div>
              </button>
            )}
          </div>
        )}
        {tab === 'zuhur' && <Activity d={d} k="zuhur" />}
        {tab === 'wirid' && <Activity d={d} k="wirid" />}
        {tab === 'peringkat' && <Board d={d} />}

        <p className="text-[11px] text-ink/40 text-center pt-2">Data presensi hanya bisa diubah oleh admin sekolah.</p>
      </div>
    </main>
  );
}