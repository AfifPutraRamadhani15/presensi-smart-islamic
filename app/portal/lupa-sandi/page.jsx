'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { loadFaceApi, DETECT_OPTS, startCamera, stopCamera, brightness } from '@/lib/faceClient';

export default function LupaSandi() {
  const videoRef = useRef(null), streamRef = useRef(null), stop = useRef(true);
  const [f, setF] = useState({ nis: '', birth_date: '', password: '', password2: '' });
  const [cam, setCam] = useState('off'), [ok, setOk] = useState(false), [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false), [asked, setAsked] = useState(false), [show, setShow] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => { loadFaceApi().catch(() => {}); return () => { stop.current = true; stopCamera(streamRef.current); }; }, []);

  async function openCam() {
    setErr(''); setCam('loading');
    try {
      const fa = await loadFaceApi();
      streamRef.current = await startCamera(videoRef.current);
      stop.current = false; setCam('on');
      const tick = async () => {
        if (stop.current) return;
        try {
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            const dets = await fa.detectAllFaces(v, DETECT_OPTS(fa));
            let good = false, m = '';
            if (!dets.length) m = 'Wajah belum terdeteksi';
            else if (dets.length > 1) m = 'Hanya satu wajah yang boleh terlihat';
            else if (brightness(v) < 70) m = 'Pencahayaan kurang terang';
            else if (dets[0].box.width < v.videoWidth * 0.28) m = 'Dekatkan wajah ke kamera';
            else { good = true; m = 'Wajah siap diverifikasi ✔'; }
            setOk(good); setMsg(m);
          }
        } catch {}
        setTimeout(tick, 250);
      };
      tick();
    } catch (e) { setCam('off'); setErr(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi.' : e.message); }
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.nis.trim()) return setErr('Isi NIS.');
    if (!f.birth_date) return setErr('Isi tanggal lahir.');
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return setErr('Sandi baru minimal 8 karakter, kombinasi huruf dan angka.');
    if (f.password !== f.password2) return setErr('Konfirmasi sandi tidak sama.');
    if (cam !== 'on' || !ok) return setErr('Aktifkan kamera dan pastikan wajah siap (bingkai hijau).');
    setBusy(true);
    try {
      const fa = window.faceapi, v = videoRef.current;
      const r = await fa.detectSingleFace(v, DETECT_OPTS(fa)).withFaceLandmarks().withFaceDescriptor();
      if (!r) throw new Error('Wajah tidak terbaca, coba lagi.');
      await api('/api/portal/lupa', { method: 'POST', body: { mode: 'reset', nis: f.nis, birth_date: f.birth_date, password: f.password, descriptor: Array.from(r.descriptor) } });
      stop.current = true; stopCamera(streamRef.current); setDone(true);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  async function mintaAdmin() {
    setErr('');
    if (!f.nis.trim()) return setErr('Isi NIS dulu, lalu klik "Minta admin mereset".');
    try { await api('/api/portal/lupa', { method: 'POST', body: { mode: 'minta_admin', nis: f.nis } }); setAsked(true); } catch (x) { setErr(x.message); }
  }

  if (done) {
    return (
      <main className="min-h-screen gloss flex items-center justify-center p-5 text-center">
        <div className="relative z-10 card max-w-md w-full space-y-3 pop">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold text-dark">Sandi Berhasil Diganti</h1>
          <p className="text-sm">Silakan masuk dengan sandi barumu.</p>
          <Link href="/portal/login" className="btn btn-primary w-full !py-3">Masuk Sekarang</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen gloss p-4 flex items-center justify-center">
      <form onSubmit={submit} className="relative z-10 card w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-4xl">🔑</div>
          <h1 className="text-xl font-extrabold text-dark">Lupa Kata Sandi</h1>
          <p className="text-xs text-ink/60">Buktikan dirimu dengan NIS, tanggal lahir, dan Face ID, lalu buat sandi baru.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">NIS</label><input className="input !py-3" value={f.nis} onChange={(e) => set('nis', e.target.value)} autoComplete="username" /></div>
          <div><label className="label">Tanggal Lahir</label><input type="date" className="input !py-3" value={f.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></div>
        </div>

        <div className="space-y-2">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" playsInline muted />
            {cam === 'on' && <div className={`absolute inset-[14%] rounded-[40%] border-4 transition ${ok ? 'border-emerald' : 'border-white/70 border-dashed'}`} />}
            {cam === 'on' && <div className="absolute bottom-2 inset-x-2 text-center"><span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${ok ? 'bg-emerald text-white' : 'bg-black/60 text-white'}`}>{msg}</span></div>}
            {cam !== 'on' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark/90 text-white p-4 text-center">
                <div className="text-4xl">📷</div>
                <button type="button" onClick={openCam} disabled={cam === 'loading'} className="btn btn-gold">{cam === 'loading' ? 'Memuat kamera…' : 'Aktifkan Kamera'}</button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div><label className="label">Sandi Baru (min. 8, huruf + angka)</label>
            <div className="relative"><input className="input !py-3 !pr-24" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary px-2 py-1">{show ? 'Sembunyikan' : 'Tampilkan'}</button></div></div>
          <div><label className="label">Ulangi Sandi Baru</label><input className="input !py-3" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.password2} onChange={(e) => set('password2', e.target.value)} /></div>
        </div>

        {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
        {asked && <div className="text-sm text-dark bg-light rounded-xl p-3">✔ Permintaan terkirim ke admin. Temui guru/admin sekolah untuk mengambil sandi baru.</div>}

        <button className="btn btn-primary w-full !py-3" disabled={busy}>{busy ? 'Memverifikasi…' : 'Verifikasi Wajah & Simpan Sandi'}</button>
        <div className="text-xs text-center text-ink/60">Face ID tidak cocok / belum terdaftar? <button type="button" onClick={mintaAdmin} className="font-bold text-primary underline">Minta admin mereset</button></div>
        <Link href="/portal/login" className="block text-center text-sm text-primary font-semibold">← Kembali ke Login</Link>
      </form>
    </main>
  );
}