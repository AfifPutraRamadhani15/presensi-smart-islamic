'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

const field = { color: '#172B24', WebkitTextFillColor: '#172B24', backgroundColor: '#FFFFFF', colorScheme: 'light' };

export default function GantiSandi() {
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (f.next !== f.again) return setErr('Konfirmasi sandi baru tidak sama');
    setBusy(true);
    try { await api('/api/portal/password', { method: 'POST', body: { current: f.current, next: f.next } }); window.location.href = '/portal'; }
    catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <main className="min-h-screen gloss flex items-center justify-center p-4">
      <form onSubmit={submit} className="relative z-10 card w-full max-w-sm space-y-4" style={{ color: '#172B24' }}>
        <div className="text-center">
          <div className="text-4xl">🔑</div>
          <h1 className="mt-1 text-xl font-extrabold text-dark">Buat Sandi Baru</h1>
          <p className="text-xs text-ink/60">Demi keamanan, ganti sandi sementara dari admin dengan sandi milikmu sendiri.</p>
        </div>
        {[['current', 'Sandi saat ini (dari admin)', 'current-password'], ['next', 'Sandi baru (min. 8, huruf + angka)', 'new-password'], ['again', 'Ulangi sandi baru', 'new-password']].map(([k, l, ac]) => (
          <div key={k}><label className="label">{l}</label><input type="password" className="input !py-3" style={field} autoComplete={ac} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>
        ))}
        {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
        <button className="btn btn-primary w-full !py-3" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Sandi Baru'}</button>
      </form>
    </main>
  );
}