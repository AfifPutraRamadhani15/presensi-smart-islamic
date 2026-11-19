'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

// Warna dipaksa inline supaya teks selalu terlihat (autofill Chrome / mode gelap / ekstensi).
const field = { color: '#172B24', WebkitTextFillColor: '#172B24', backgroundColor: '#FFFFFF', caretColor: '#087F5B', colorScheme: 'light' };

export default function LoginForm({ school }) {
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); window.location.href = '/admin'; }
    catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-5" style={{ color: '#172B24' }}>
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-dark">Selamat Datang 👋</h2>
        <p className="text-sm text-ink/60 mt-1">Masuk sebagai admin untuk mengelola presensi Salat Zuhur &amp; Wirid Remaja.</p>
      </div>

      <div>
        <label htmlFor="username" className="label">Username</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg" aria-hidden>👤</span>
          <input id="username" name="username" className="input !pl-10 !py-3" style={field} autoComplete="username" placeholder="Masukkan username"
            value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">Password</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg" aria-hidden>🔒</span>
          <input id="password" name="password" className="input !pl-10 !pr-24 !py-3" style={field} type={show ? 'text' : 'password'}
            autoComplete="current-password" placeholder="Masukkan password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary px-2 py-1 rounded-lg hover:bg-light">
            {show ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
      </div>

      {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}

      <button className="btn btn-primary w-full !py-3 text-base" disabled={busy}>{busy ? 'Memproses…' : 'Masuk ke Dashboard'}</button>

      <div className="flex items-center gap-3 text-xs text-ink/40"><span className="flex-1 h-px bg-emerald/20" />atau<span className="flex-1 h-px bg-emerald/20" /></div>

      <a href="/presensi" className="btn btn-gold w-full !py-3 text-base">📷 Mulai Presensi Wajah</a>

      <p className="text-center text-[11px] text-ink/40 pt-2">{school} · © {new Date().getFullYear()}</p>
    </form>
  );
}