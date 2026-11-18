'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { loadFaceApi, DETECT_OPTS, startCamera, stopCamera, eyeAspect, getVoicePrefs, setVoicePrefs, speak, unlockSpeech } from '@/lib/faceClient';

const EAR_CLOSED = 0.21, EAR_OPEN = 0.26;
const COOLDOWN_MS = 5000;

export default function Presensi() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cfg, setCfg] = useState(null);
  const [activity, setActivity] = useState('zuhur');
  const [phase, setPhase] = useState('init'); // init | loading | ready | error
  const [msg, setMsg] = useState('');
  const [hint, setHint] = useState('Memuat…');
  const [result, setResult] = useState(null);
  const [voice, setVoice] = useState({ on: true, volume: 1, rate: 1 });
  const [showSet, setShowSet] = useState(false);
  const [clock, setClock] = useState('');
  const st = useRef({ activity: 'zuhur', busy: false, blink: 0, closed: false, blinkAt: 0, lastSent: new Map(), pauseUntil: 0, stable: 0 });

  useEffect(() => { setVoice(getVoicePrefs()); api('/api/presensi/config').then(setCfg).catch((e) => setMsg(e.message)); }, []);
  useEffect(() => { st.current.activity = activity; }, [activity]);
  useEffect(() => { const t = setInterval(() => setClock(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/:/g, '.')), 1000); return () => clearInterval(t); }, []);

  const start = useCallback(async () => {
    setPhase('loading'); setMsg('');
    unlockSpeech();
    try {
      const f = await loadFaceApi();
      streamRef.current = await startCamera(videoRef.current);
      setPhase('ready');
      loop(f);
    } catch (e) {
      setPhase('error');
      setMsg(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser lalu muat ulang.' : e.message);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => () => { st.current.stop = true; stopCamera(streamRef.current); }, []);

  async function loop(f) {
    const S = st.current; S.stop = false;
    const v = videoRef.current;
    const tick = async () => {
      if (S.stop) return;
      const now = Date.now();
      if (S.busy || now < S.pauseUntil || v.readyState < 2) return setTimeout(tick, 200);
      try {
        const dets = await f.detectAllFaces(v, DETECT_OPTS(f)).withFaceLandmarks();
        if (dets.length === 0) { S.blink = 0; S.closed = false; S.stable = 0; setHint('Posisikan wajah di dalam bingkai'); }
        else if (dets.length > 1) { S.blink = 0; setHint('Hanya satu wajah yang boleh terlihat'); }
        else {
          const d = dets[0]; const box = d.detection.box;
          if (box.width < v.videoWidth * 0.22) { setHint('Dekatkan wajah ke kamera'); S.stable = 0; }
          else {
            const e = eyeAspect(d.landmarks);
            if (e < EAR_CLOSED) S.closed = true;
            else if (e > EAR_OPEN && S.closed) { S.closed = false; S.blink++; S.blinkAt = now; }
            if (S.blink > 0 && now - S.blinkAt > 6000) S.blink = 0;
            if (S.blink === 0) { setHint('Lihat kamera lalu KEDIPKAN MATA'); }
            else if (e > EAR_OPEN) {
              setHint('Memverifikasi wajah…');
              S.busy = true;
              const full = await f.detectSingleFace(v, DETECT_OPTS(f)).withFaceLandmarks().withFaceDescriptor();
              if (full) await submit(Array.from(full.descriptor));
              S.busy = false; S.blink = 0; S.closed = false;
            }
          }
        }
      } catch (err) { S.busy = false; }
      setTimeout(tick, 180);
    };
    tick();
  }

  async function submit(descriptor) {
    const S = st.current;
    try {
      const r = await api('/api/presensi/recognize', { method: 'POST', body: { descriptor, activity: S.activity, liveness: true } });
      const key = r.student?.nis || r.result;
      const last = S.lastSent.get(key) || 0;
      S.pauseUntil = Date.now() + COOLDOWN_MS;
      setResult(r);
      // anti suara berulang: wajah yang sama tidak diucapkan lagi dalam 30 detik
      if (Date.now() - last > 30_000) {
        if (r.result === 'ok') speak(r.speech || `Selamat datang, ${r.student.nama}. Presensi berhasil.`, voice);
        else if (r.result === 'duplicate') speak(`${r.student.nama}, Anda sudah melakukan presensi.`, voice);
        else if (r.result === 'unknown') speak('Wajah tidak dikenali. Silakan coba kembali.', voice);
        S.lastSent.set(key, Date.now());
      }
      setTimeout(() => setResult(null), COOLDOWN_MS - 200);
    } catch (e) {
      S.pauseUntil = Date.now() + 3000;
      setResult({ result: 'error', message: e.message });
      setTimeout(() => setResult(null), 2800);
    }
  }

  const act = cfg?.schedule?.find((x) => x.activity === activity);
  const color = result?.result === 'ok' ? 'from-emerald to-primary' : result?.result === 'duplicate' ? 'from-gold to-amber-600' : 'from-red-500 to-red-800';

  return (
    <main className="min-h-screen gloss p-3 md:p-6 flex flex-col">
      <header className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-extrabold text-lg md:text-2xl truncate">{cfg?.settings?.app_name || 'PRESENSI SMART ISLAMIC'}</div>
          <div className="text-xs opacity-80 truncate">{cfg?.settings?.school_name}</div>
        </div>
        <div className="text-right"><div className="text-2xl md:text-4xl font-extrabold tabular-nums">{clock}</div><div className="text-[11px] opacity-80">WIB</div></div>
      </header>

      <div className="relative mt-3 flex gap-2 justify-center">
        {['zuhur', 'wirid'].map((a) => (
          <button key={a} onClick={() => setActivity(a)} className={`btn !px-5 ${activity === a ? 'bg-white text-dark' : 'bg-white/20 text-white'}`}>{a === 'zuhur' ? '🕌 Salat Zuhur' : '📖 Wirid Remaja'}</button>
        ))}
      </div>
      {act && <div className="relative text-center text-xs mt-1 opacity-90">Jadwal: {act.start_time.slice(0, 5)} – {act.end_time.slice(0, 5)} WIB (terlambat setelah {act.late_time.slice(0, 5)})</div>}

      <section className="relative flex-1 mt-3 flex flex-col lg:flex-row gap-4 items-center justify-center">
        <div className="relative w-full max-w-3xl aspect-[4/3] rounded-3xl overflow-hidden bg-black shadow-2xl border-4 border-white/40">
          <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" playsInline muted />
          {phase === 'ready' && <><div className="absolute inset-[12%] rounded-[40%] border-4 border-dashed border-white/70 pointer-events-none" /><div className="scanline" /></>}
          {phase === 'ready' && <div className="absolute bottom-3 inset-x-3 text-center"><span className="inline-block bg-black/60 text-white text-sm font-semibold px-4 py-2 rounded-full">{hint}</span></div>}
          {phase !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark/90 p-6 text-center">
              {phase === 'loading' ? <div className="animate-pulse">Memuat model wajah & kamera…</div> : (
                <>
                  <div className="text-5xl">📷</div>
                  <button onClick={start} className="btn btn-gold !py-3 !px-8 text-base">{phase === 'error' ? 'Coba Lagi' : 'Aktifkan Kamera & Mulai'}</button>
                  {msg && <div className="text-sm bg-red-500/30 rounded-xl p-2 max-w-sm">{msg}</div>}
                  <div className="text-xs opacity-70 max-w-xs">Tombol ini juga mengaktifkan suara (aturan browser membutuhkan sentuhan pengguna).</div>
                </>
              )}
            </div>
          )}
          {result && (
            <div className={`absolute inset-0 bg-gradient-to-br ${color} text-white flex flex-col items-center justify-center p-4 text-center pop overflow-y-auto`}>
              {result.result === 'ok' || result.result === 'duplicate' ? (
                <>
                  {result.student.photo ? <img src={result.student.photo} alt="" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-xl" /> : <div className="text-6xl">{result.result === 'ok' ? '✅' : 'ℹ️'}</div>}
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold">{result.result === 'ok' ? 'SELAMAT DATANG!' : 'SUDAH PRESENSI'}</div>
                  {result.result === 'duplicate' && <div className="text-sm font-semibold">{result.message}</div>}
                  <div className="mt-2 text-left bg-white/20 rounded-2xl p-3 text-sm md:text-base space-y-0.5">
                    <div><b>Nama:</b> {result.student.nama}</div><div><b>NIS:</b> {result.student.nis}</div>
                    <div><b>Kelas:</b> {result.student.kelas} · {result.student.jurusan}</div>
                    <div><b>Kegiatan:</b> {result.student.kegiatan}</div><div><b>Tanggal:</b> {result.student.tanggal}</div>
                    <div><b>Waktu:</b> {result.waktu}</div><div><b>Status:</b> {(result.status_label || result.status || '').toUpperCase()}</div>
                  </div>
                </>
              ) : (
                <><div className="text-6xl">{result.result === 'closed' ? '⏰' : '⚠️'}</div><div className="mt-2 text-xl md:text-2xl font-extrabold">{result.message}</div></>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="relative mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
        <button className="btn bg-white/20" onClick={() => setShowSet(!showSet)}>🔊 Suara</button>
        <Link href="/admin" className="btn bg-white/20">Dashboard Admin</Link>
        <span className="text-xs opacity-80 w-full text-center">Data wajah diproses untuk presensi sekolah. Waktu presensi dicatat oleh server.</span>
      </footer>

      {showSet && (
        <div className="relative card mx-auto mt-2 max-w-md w-full text-ink space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={voice.on} onChange={(e) => { const v = { ...voice, on: e.target.checked }; setVoice(v); setVoicePrefs(v); }} /> Suara aktif</label>
          <div><label className="label">Volume ({Math.round(voice.volume * 100)}%)</label><input type="range" min="0" max="1" step="0.1" className="w-full" value={voice.volume} onChange={(e) => { const v = { ...voice, volume: +e.target.value }; setVoice(v); setVoicePrefs(v); }} /></div>
          <div><label className="label">Kecepatan ({voice.rate}x)</label><input type="range" min="0.6" max="1.4" step="0.1" className="w-full" value={voice.rate} onChange={(e) => { const v = { ...voice, rate: +e.target.value }; setVoice(v); setVoicePrefs(v); }} /></div>
          <button className="btn btn-primary" onClick={() => { unlockSpeech(); speak('Selamat datang, Muhammad Rizki. Presensi Salat Zuhur berhasil. Anda dinyatakan hadir.', { ...voice, on: true }); }}>Tes Suara</button>
        </div>
      )}
    </main>
  );
}
