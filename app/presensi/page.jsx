'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { loadFaceApi, DETECT_OPTS, DETECT_FAST, startCamera, stopCamera, eyeAspect, getVoicePrefs, setVoicePrefs, speak, unlockSpeech, unlockAudio, beep } from '@/lib/faceClient';

const COOLDOWN_MS = 5000;
const REPEAT_VOICE_MS = 10_000;

// Pengaturan deteksi kedip (relatif terhadap tinggi mata saat terbuka)
const BLINK_WINDOW_MS = 1500; // jendela waktu untuk mengukur "mata terbuka"
const CLOSE_RATIO = 0.82;     // dianggap tertutup bila EAR < 82% dari EAR terbuka
const OPEN_RATIO = 0.90;      // dianggap terbuka lagi bila EAR > 90% dari EAR terbuka
const MAX_CLOSED_MS = 2500;   // mata tertutup lebih lama dari ini bukan kedipan
const NO_BLINK_TIP_MS = 10_000;

export default function Presensi() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cfg, setCfg] = useState(null);
  const [activity, setActivity] = useState('zuhur');
  const [phase, setPhase] = useState('init'); // init | loading | ready | error
  const [step, setStep] = useState('Memuat model wajah…');
  const [msg, setMsg] = useState('');
  const [hint, setHint] = useState('Memuat…');
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [debug, setDebug] = useState(false);
  const [earInfo, setEarInfo] = useState('');
  const [voice, setVoice] = useState({ on: true, volume: 1, rate: 1 });
  const [showSet, setShowSet] = useState(false);
  const [clock, setClock] = useState('');
  const st = useRef({
    activity: 'zuhur', busy: false, blink: 0, closed: false, closedAt: 0, blinkAt: 0,
    hist: [], frames: 0, faceSince: 0, lastSent: new Map(), pauseUntil: 0, debug: false, stop: false,
  });

  useEffect(() => {
    loadFaceApi().catch(() => {});
    setVoice(getVoicePrefs());
    const dbg = new URLSearchParams(window.location.search).get('debug') === '1';
    st.current.debug = dbg; setDebug(dbg);
    api('/api/presensi/config').then(setCfg).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { st.current.activity = activity; }, [activity]);
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/:/g, '.')), 1000);
    return () => clearInterval(t);
  }, []);

  const start = useCallback(async () => {
    setPhase('loading'); setMsg(''); setStep('Memuat model wajah…');
    unlockSpeech(); unlockAudio();
    try {
      const f = await loadFaceApi();
      setStep('Membuka kamera…');
      streamRef.current = await startCamera(videoRef.current);
      setPhase('ready');
      loop(f);
    } catch (e) {
      stopCamera(streamRef.current); streamRef.current = null;
      setPhase('error');
      setMsg(
        e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser lalu muat ulang.'
        : e.name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini.'
        : e.name === 'NotReadableError' ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu tekan "Coba Lagi".'
        : (e.message || 'Gagal memulai kamera.')
      );
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => () => { st.current.stop = true; stopCamera(streamRef.current); }, []);

  function resetBlink(S) {
    S.blink = 0; S.closed = false; S.closedAt = 0; S.hist = [];
  }

  async function loop(f) {
    const S = st.current; S.stop = false; S.frames = 0; S.faceSince = 0; resetBlink(S);
    const v = videoRef.current;

    const tick = async () => {
      if (S.stop) return;
      const now = Date.now();
      if (S.busy || now < S.pauseUntil || v.readyState < 2) return setTimeout(tick, 100);
      let delay = 0;
      try {
        const dets = await f.detectAllFaces(v, DETECT_FAST(f)).withFaceLandmarks();

        if (dets.length === 0) {
          resetBlink(S); S.frames = 0; S.faceSince = 0;
          setHint('Posisikan wajah di dalam bingkai');
        } else if (dets.length > 1) {
          resetBlink(S);
          setHint('Hanya satu wajah yang boleh terlihat');
        } else {
          const d = dets[0];
          const box = d.detection.box;
          if (box.width < v.videoWidth * 0.22) {
            resetBlink(S); S.frames = 0; S.faceSince = 0;
            setHint('Dekatkan wajah ke kamera');
          } else {
            if (!S.faceSince) S.faceSince = now;
            S.frames++;

            const e = eyeAspect(d.landmarks);
            if (Number.isFinite(e) && e > 0) {
              // simpan riwayat EAR pada jendela waktu terakhir
              S.hist.push({ t: now, e });
              while (S.hist.length && now - S.hist[0].t > BLINK_WINDOW_MS) S.hist.shift();

              // "mata terbuka" = persentil ke-70 dari riwayat (tahan terhadap noise & FPS rendah)
              const sorted = S.hist.map((h) => h.e).sort((a, b) => b - a);
              const open = sorted[Math.floor(sorted.length * 0.3)] || e;
              const closeThr = open * CLOSE_RATIO;
              const openThr = open * OPEN_RATIO;

              if (S.frames > 4 && S.hist.length >= 3) {
                if (e < closeThr) {
                  if (!S.closed) { S.closed = true; S.closedAt = now; }
                } else if (S.closed && e > openThr) {
                  const dur = now - S.closedAt;
                  S.closed = false;
                  if (dur <= MAX_CLOSED_MS) { S.blink++; S.blinkAt = now; }
                }
                // mata tertutup terlalu lama: bukan kedipan, ulangi
                if (S.closed && now - S.closedAt > MAX_CLOSED_MS) { S.closed = false; S.hist = []; }
              }

              if (S.debug) setEarInfo(`EAR ${e.toFixed(3)} | terbuka ${open.toFixed(3)} | batas tutup ${closeThr.toFixed(3)} | tertutup ${S.closed ? 'YA' : 'tidak'} | kedip ${S.blink}`);
            }

            if (S.blink > 0 && now - S.blinkAt > 6000) S.blink = 0;

            if (S.blink === 0) {
              if (S.closed) setHint('Buka mata…');
              else if (now - S.faceSince > NO_BLINK_TIP_MS) setHint('Kedipkan mata lebih jelas. Pastikan wajah terang & tidak membelakangi jendela');
              else setHint('Lihat kamera, lalu KEDIPKAN MATA pelan-pelan');
            } else {
              setHint('✔ Kedip terdeteksi — memverifikasi wajah…');
              S.busy = true;
              try {
                const full = await f.detectSingleFace(v, DETECT_OPTS(f)).withFaceLandmarks().withFaceDescriptor();
                if (full) await submit(Array.from(full.descriptor));
                else { setHint('Wajah tidak terbaca, coba kedip lagi'); beep('warn'); }
              } finally {
                S.busy = false; resetBlink(S); S.faceSince = Date.now();
              }
            }
          }
        }
      } catch (err) {
        console.error('Deteksi wajah gagal:', err);
        S.busy = false;
        setHint('Kesalahan deteksi: ' + (err?.message || err));
        delay = 300; // hindari loop error yang terlalu rapat
      }
      setTimeout(tick, delay);
    };
    tick();
  }

  async function submit(descriptor) {
    const S = st.current;
    try {
      const r = await api('/api/presensi/recognize', { method: 'POST', body: { descriptor, activity: S.activity, liveness: true } });
      const key = (r.student?.nis || '') + r.result;
      const last = S.lastSent.get(key) || 0;
      S.pauseUntil = Date.now() + COOLDOWN_MS;

      // pesan cadangan supaya layar tidak pernah kosong
      const fallbackMsg =
        r.result === 'unknown' ? 'Wajah tidak dikenali. Silakan coba kembali.'
        : r.result === 'closed' ? 'Presensi sedang ditutup (di luar jadwal).'
        : 'Presensi tidak dapat diproses.';
      const finalMsg = r.message || fallbackMsg;
      setResult({ ...r, message: finalMsg });

      const nama = r.student?.nama;
      if (nama && (r.result === 'ok' || r.result === 'duplicate')) {
        const label = r.result === 'ok' ? (r.status_label || r.status || 'hadir') : 'sudah presensi';
        setRecent((p) => [{ nama, kelas: r.student.kelas, waktu: r.waktu, label, ok: r.result === 'ok' }, ...p.filter((x) => x.nama !== nama)].slice(0, 5));
      }

      const isSuccessType = r.result === 'ok' || r.result === 'duplicate';
      // anti suara berulang hanya untuk hasil sukses/duplikat; pesan gagal SELALU diucapkan
      if (!isSuccessType || Date.now() - last > REPEAT_VOICE_MS) {
        if (r.result === 'ok') {
          const st2 = (r.status_label || r.status || 'hadir').toLowerCase();
          beep('ok');
          speak(r.speech || `${nama}, presensi ${r.student?.kegiatan || ''} berhasil. Anda dinyatakan ${st2}.`);
        } else if (r.result === 'duplicate') {
          beep('warn'); speak(`${nama}, Anda sudah melakukan presensi hari ini.`);
        } else {
          beep('err'); speak(finalMsg);
        }
        S.lastSent.set(key, Date.now());
      }
      setTimeout(() => setResult(null), COOLDOWN_MS - 200);
    } catch (e) {
      S.pauseUntil = Date.now() + 3000;
      const m = e?.message || 'Terjadi kesalahan saat menghubungi server.';
      beep('err');
      speak(m);
      setResult({ result: 'error', message: m });
      setTimeout(() => setResult(null), 2800);
    }
  }

  const act = cfg?.schedule?.find((x) => x.activity === activity);
  const isLate = (result?.status || '').toLowerCase() === 'terlambat';
  const color =
    result?.result === 'ok' ? (isLate ? 'from-gold to-amber-600' : 'from-emerald to-primary')
    : result?.result === 'duplicate' ? 'from-blue-500 to-blue-800'
    : 'from-red-500 to-red-800';

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
          {phase === 'ready' && debug && <div className="absolute top-2 inset-x-2 text-center"><span className="inline-block bg-black/70 text-yellow-300 text-xs font-mono px-3 py-1 rounded">{earInfo || 'debug aktif…'}</span></div>}
          {phase !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark/90 p-6 text-center">
              {phase === 'loading' ? <div className="animate-pulse">{step}</div> : (
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
              {(result.result === 'ok' || result.result === 'duplicate') && result.student ? (
                <>
                  {result.student.photo ? <img src={result.student.photo} alt="" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-xl" /> : <div className="text-6xl">{result.result === 'ok' ? '✅' : 'ℹ️'}</div>}
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold">{result.result === 'ok' ? (isLate ? 'HADIR (TERLAMBAT)' : 'PRESENSI BERHASIL!') : 'SUDAH PRESENSI SEBELUMNYA'}</div>
                  <div className="text-xl md:text-2xl font-bold mt-1">{result.student.nama}</div>
                  {result.result === 'duplicate' && <div className="text-sm font-semibold mt-1">{result.message}</div>}
                  <div className="mt-2 text-left bg-white/20 rounded-2xl p-3 text-sm md:text-base space-y-0.5">
                    <div><b>NIS:</b> {result.student.nis}</div>
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

      {recent.length > 0 && (
        <section className="relative mt-3 mx-auto w-full max-w-3xl bg-white/15 rounded-2xl p-3">
          <div className="text-xs font-bold opacity-90 mb-1">Presensi terakhir di layar ini</div>
          <div className="space-y-1">
            {recent.map((x) => (
              <div key={x.nama} className="flex items-center justify-between gap-2 text-sm bg-white/10 rounded-xl px-3 py-1.5">
                <span className="font-semibold truncate">{x.nama} <span className="opacity-70 font-normal">· {x.kelas}</span></span>
                <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${x.ok ? 'bg-emerald-500/80' : 'bg-blue-500/80'}`}>{String(x.label).toUpperCase()} {x.waktu}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
          <button className="btn btn-primary" onClick={() => { unlockSpeech(); unlockAudio(); beep('ok', { ...voice, on: true }); speak('Muhammad Rizki, presensi Salat Zuhur berhasil. Anda dinyatakan hadir.', { ...voice, on: true }); }}>Tes Suara</button>
        </div>
      )}
    </main>
  );
}