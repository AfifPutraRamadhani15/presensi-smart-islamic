'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

const field = { color: '#172B24', WebkitTextFillColor: '#172B24', backgroundColor: '#FFFFFF', caretColor: '#087F5B', colorScheme: 'light' };

export default function PortalLogin() {
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await api('/api/portal/login', { method: 'POST', body: f });
      window.location.href = r.must_change ? '/portal/ganti-sandi' : '/portal';
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <main className="min-h-screen gloss flex items-center justify-center p-4">
      <form onSubmit={submit} className="relative z-10 card w-full max-w-sm space-y-4" style={{ color: '#172B24' }}>
        <div className="text-center">
          <img src="/icons/icon-192.png" alt="" className="w-16 h-16 mx-auto rounded-2xl shadow-soft" />
          <h1 className="mt-2 text-xl font-extrabold text-dark">Portal Siswa</h1>
          <p className="text-xs text-ink/60">Lihat riwayat presensi Salat Zuhur &amp; Wirid Remaja milikmu.</p>
        </div>
        <div>
          <label htmlFor="u" className="label">Username (NIS)</label>
          <input id="u" className="input !py-3" style={field} autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="p" className="label">Sandi</label>
          <div className="relative">
            <input id="p" className="input !py-3 !pr-24" style={field} type={show ? 'text' : 'password'} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary px-2 py-1">{show ? 'Sembunyikan' : 'Tampilkan'}</button>
          </div>
        </div>
        {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
        <button className="btn btn-primary w-full !py-3" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <p className="text-xs text-center text-ink/60">Lupa sandi? Minta admin/guru mereset sandimu.</p>
        <a href="/presensi" className="block text-center text-sm text-primary font-semibold">← Ke halaman presensi</a>
      </form>
    </main>
  );
}