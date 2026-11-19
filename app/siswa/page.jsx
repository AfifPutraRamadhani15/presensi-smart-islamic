'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { loadFaceApi, DETECT_OPTS, startCamera, stopCamera, snapshot } from '@/lib/faceClient';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Daftar() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cfg, setCfg] = useState(null);
  const [classes, setClasses] = useState([]);
  const [needCode, setNeedCode] = useState(false);
  const [f, setF] = useState({ nis: '', nama: '', class_id: '', kode: '', password: '' });
  const [cam, setCam] = useState('off'); // off | loading | on
  const [face, setFace] = useState(null); // { descriptor, photo }
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api('/api/presensi/config').then(setCfg).catch(() => {});
    fetch('/api/daftar').then((r) => r.json()).then((d) => { setClasses(d.classes || []); setNeedCode(!!d.needCode); if (d.error) setErr(d.error); }).catch((e) => setErr(e.message));
    loadFaceApi().catch(() => {});
    return () => stopCamera(streamRef.current);
  }, []);

  async function openCam() {
    setErr(''); setCam('loading');
    try {
      await loadFaceApi();
      streamRef.current = await startCamera(videoRef.current);
      setCam('on');
    } catch (e) {
      setCam('off');
      setErr(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di browser lalu coba lagi.' : e.message);
    }
  }

  async function scanFace() {
    setErr(''); setInfo(''); setFace(null); setScanning(true);
    try {
      const fa = await loadFaceApi();
      const v = videoRef.current;
      const descs = [];
      let box = null;
      for (let i = 0; i < 40 && descs.length < 5; i++) {
        const dets = await fa.detectAllFaces(v, DETECT_OPTS(fa)).withFaceLandmarks().withFaceDescriptors();
        if (dets.length > 1) setInfo('Hanya satu wajah yang boleh terlihat');
        else if (dets.length === 1 && dets[0].detection.box.width >= v.videoWidth * 0.22) {
          descs.push(Array.from(dets[0].descriptor));
          box = dets[0].detection.box;
          setInfo(`Merekam wajah… ${descs.length}/5 (tetap lihat kamera)`);
        } else setInfo('Posisikan wajah di tengah dan dekatkan ke kamera');
        await sleep(300);
      }
      if (descs.length < 5) throw new Error('Wajah belum terbaca jelas. Pastikan cahaya cukup lalu coba lagi.');
      const avg = descs[0].map((_, k) => descs.reduce((s, d) => s + d[k], 0) / descs.length);
      setFace({ descriptor: avg, photo: snapshot(v, box) });
      setInfo('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setScanning(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!face) return setErr('Ambil data wajah terlebih dahulu.');
    setBusy(true);
    try {
      const r = await fetch('/api/daftar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, descriptor: face.descriptor, photo: face.photo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal mendaftar');
      stopCamera(streamRef.current);
      setDone(true);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  const school = cfg?.settings?.school_name || '';
  const appName = cfg?.settings?.app_name || 'PRESENSI SMART ISLAMIC';

  if (done) {
    return (
      <main className="min-h-screen gloss flex items-center justify-center p-6 text-center">
        <div className="relative card text-ink max-w-md w-full space-y-3">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold text-dark">Pendaftaran Berhasil</h1>
          <p className="text-sm">Data dan wajah <b>{f.nama}</b> sudah tersimpan. Sekarang kamu bisa presensi langsung dengan Face ID.</p>
          <Link href="/siswa/login" className="btn btn-gold w-full !py-3">🎓 Masuk ke Dashboard Siswa</Link>
          <Link href="/login" className="btn btn-ghost w-full">Kembali ke Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="gloss p-5 md:p-8">
        <div className="relative max-w-3xl mx-auto">
          <div className="font-extrabold text-lg md:text-2xl">{appName}</div>
          <div className="text-xs opacity-80">{school}</div>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold">Pendaftaran Siswa & Face ID</h1>
        </div>
      </header>

      <form onSubmit={submit} className="max-w-3xl mx-auto p-4 md:p-6 grid md:grid-cols-2 gap-5">
        <div className="card space-y-4">
          <h2 className="font-bold text-dark">1. Data Siswa</h2>
          <div>
            <label className="label" htmlFor="nis">NIS</label>
            <input id="nis" className="input" inputMode="numeric" value={f.nis} onChange={(e) => setF({ ...f, nis: e.target.value })} placeholder="Nomor Induk Siswa" required />
          </div>
          <div>
            <label className="label" htmlFor="nama">Nama Lengkap</label>
            <input id="nama" className="input" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Sesuai data sekolah" required />
          </div>
          <div>
            <label className="label" htmlFor="kelas">Kelas</label>
            <select id="kelas" className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })} required>
              <option value="">— Pilih kelas —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pw">Password Akun</label>
            <input id="pw" type="password" className="input" autoComplete="new-password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Minimal 6 karakter" required />
            <p className="text-[11px] text-ink/60 mt-1">Dipakai untuk login ke dashboard siswa bersama NIS.</p>
          </div>
          {needCode && (
            <div>
              <label className="label" htmlFor="kode">Kode Pendaftaran</label>
              <input id="kode" className="input" value={f.kode} onChange={(e) => setF({ ...f, kode: e.target.value })} placeholder="Diberikan oleh guru/admin" required />
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="font-bold text-dark">2. Rekam Wajah</h2>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" playsInline muted />
            {cam === 'on' && <div className="absolute inset-[12%] rounded-[40%] border-4 border-dashed border-white/70 pointer-events-none" />}
            {cam !== 'on' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark/90 text-white p-4 text-center">
                <div className="text-5xl">📷</div>
                <button type="button" onClick={openCam} disabled={cam === 'loading'} className="btn btn-gold">{cam === 'loading' ? 'Memuat…' : 'Aktifkan Kamera'}</button>
              </div>
            )}
            {face && (
              <div className="absolute inset-0 bg-emerald-600/80 text-white flex flex-col items-center justify-center gap-2 pop">
                <img src={face.photo} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white" />
                <div className="font-extrabold">Wajah berhasil direkam ✔</div>
              </div>
            )}
          </div>
          {info && <div className="text-xs text-center text-dark font-semibold">{info}</div>}
          <button type="button" onClick={scanWrapper(face, setFace, scanFace)} disabled={cam !== 'on' || scanning} className="btn btn-primary w-full">
            {scanning ? 'Merekam…' : face ? '↻ Ambil Ulang Wajah' : 'Ambil Wajah'}
          </button>
          <p className="text-[11px] text-ink/60">Lepas masker/topi, hadap lurus ke kamera, dan pastikan cahaya cukup. Data wajah dipakai hanya untuk presensi sekolah.</p>
        </div>

        <div className="md:col-span-2 space-y-3">
          {err && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
          <button className="btn btn-primary w-full !py-3 text-base" disabled={busy || !face}>{busy ? 'Menyimpan…' : 'Daftar Sekarang'}</button>
          <Link href="/login" className="block text-center text-sm text-primary font-semibold">← Kembali ke Login</Link>
        </div>
      </form>
    </main>
  );
}

// ambil ulang: kosongkan hasil lama dulu supaya video terlihat lagi
function scanWrapper(face, setFace, scanFace) {
  return () => { if (face) setFace(null); scanFace(); };
}