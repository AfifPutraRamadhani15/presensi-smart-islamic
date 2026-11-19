'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function SiswaLogin() {
  const [f, setF] = useState({ nis: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/siswa/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal login');
      window.location.href = '/siswa';
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  const field = { color: '#172B24', WebkitTextFillColor: '#172B24', backgroundColor: '#FFFFFF', colorScheme: 'light' };

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <header className="gloss p-6 text-center">
        <div className="relative text-5xl">🎓</div>
        <h1 className="relative mt-2 text-2xl font-extrabold">Login Siswa</h1>
        <p className="relative text-xs opacity-80">Lihat kehadiran dan poinmu</p>
      </header>
      <div className="flex-1 flex items-start justify-center px-6 py-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4" style={{ color: '#172B24' }}>
          <div>
            <label htmlFor="nis" className="label">NIS</label>
            <input id="nis" className="input !py-3" style={field} inputMode="numeric" autoComplete="username" placeholder="Masukkan NIS" value={f.nis} onChange={(e) => setF({ ...f, nis: e.target.value })} required />
          </div>
          <div>
            <label htmlFor="pw" className="label">Password</label>
            <div className="relative">
              <input id="pw" className="input !py-3 !pr-24" style={field} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary px-2 py-1 rounded-lg hover:bg-light">{show ? 'Sembunyikan' : 'Tampilkan'}</button>
            </div>
          </div>
          {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
          <button className="btn btn-primary w-full !py-3 text-base" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
          <Link href="/daftar" className="block text-center text-sm text-primary font-semibold">Belum punya akun? Daftar di sini</Link>
          <Link href="/" className="block text-center text-xs text-ink/50">← Pilih peran</Link>
        </form>
      </div>
    </main>
  );
}