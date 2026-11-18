'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

export default function Login() {
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); window.location.href = '/admin'; }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <main className="min-h-screen gloss flex items-center justify-center p-4">
      <form onSubmit={submit} className="relative card w-full max-w-sm space-y-4">
        <div className="text-center">
          <img src="/icons/icon-192.png" alt="" className="w-16 h-16 mx-auto rounded-2xl shadow-soft" />
          <h1 className="mt-2 text-xl font-extrabold text-dark">Login Admin</h1>
          <p className="text-xs text-ink/60">Hanya admin yang memiliki akun. Siswa presensi lewat wajah.</p>
        </div>
        <div><label className="label">Username</label><input className="input" autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></div>
        <div><label className="label">Password</label><input className="input" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        {err && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-2">{err}</div>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <a href="/presensi" className="block text-center text-sm text-primary font-semibold">← Ke halaman presensi</a>
      </form>
    </main>
  );
}
