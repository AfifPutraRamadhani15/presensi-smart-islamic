'use client';
import { useEffect, useRef, useState } from 'react';
import { api, toast } from '@/lib/client';
import { loadFaceApi, DETECT_OPTS, startCamera, stopCamera, snapshot, brightness } from '@/lib/faceClient';

const STEPS = ['Hadap lurus ke kamera', 'Tengok sedikit ke kiri', 'Tengok sedikit ke kanan', 'Angkat dagu sedikit', 'Tundukkan kepala sedikit'];

export default function FaceRegister({ student, onDone }) {
  const vref = useRef(null), stream = useRef(null), live = useRef({ ok: false, box: null });
  const [consent, setConsent] = useState(!!student.consent_biometric);
  const [phase, setPhase] = useState('idle');
  const [info, setInfo] = useState('');
  const [ok, setOk] = useState(false);
  const [samples, setSamples] = useState([]); // {desc, thumb}
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);

  useEffect(() => () => { stop.current = true; stopCamera(stream.current); }, []);

  async function start() {
    setPhase('loading'); setInfo('');
    try {
      const f = await loadFaceApi();
      stream.current = await startCamera(vref.current);
      setPhase('cam'); stop.current = false;
      const tick = async () => {
        if (stop.current) return;
        try {
          const dets = await f.detectAllFaces(vref.current, DETECT_OPTS(f));
          const v = vref.current; const br = brightness(v);
          let good = false, m = '';
          if (dets.length === 0) m = 'Wajah belum terdeteksi';
          else if (dets.length > 1) m = 'Terdeteksi lebih dari satu wajah';
          else if (br < 70) m = 'Pencahayaan kurang terang';
          else if (dets[0].box.width < v.videoWidth * 0.28) m = 'Dekatkan wajah ke kamera';
          else {
            const b = dets[0].box, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            if (Math.abs(cx - v.videoWidth / 2) > v.videoWidth * 0.2 || Math.abs(cy - v.videoHeight / 2) > v.videoHeight * 0.25) m = 'Pindahkan wajah ke tengah bingkai';
            else { good = true; m = 'Wajah siap diambil ✔'; live.current.box = b; }
          }
          live.current.ok = good; setOk(good); setInfo(m);
        } catch {}
        setTimeout(tick, 250);
      };
      tick();
    } catch (e) { setPhase('idle'); setInfo(e.name === 'NotAllowedError' ? 'Izin kamera ditolak.' : e.message); }
  }

  async function capture() {
    if (!live.current.ok || busy) return;
    setBusy(true);
    try {
      const f = window.faceapi, v = vref.current;
      const r = await f.detectSingleFace(v, DETECT_OPTS(f)).withFaceLandmarks().withFaceDescriptor();
      if (!r) { toast('Wajah tidak terbaca, ulangi', 'err'); return; }
      const thumb = snapshot(v, r.detection.box, 240);
      setSamples((s) => [...s, { desc: Array.from(r.descriptor), thumb }]);
    } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/api/siswa/${student.id}/wajah`, { method: 'POST', body: { descriptors: samples.map((s) => s.desc), photo: samples[0].thumb, consent } });
      toast('Wajah berhasil didaftarkan ✔'); stop.current = true; stopCamera(stream.current); onDone();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  }

  const n = samples.length;
  return (
    <div className="space-y-3">
      <div className="text-sm"><b>{student.full_name}</b> · NIS {student.nis} · Sampel tersimpan: <b>{student.face_samples}</b></div>
      <label className="flex gap-2 text-sm bg-gold/20 rounded-xl p-3"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Siswa/orang tua/wali telah <b>menyetujui</b> penggunaan data wajah (biometrik) untuk presensi, mengetahui tujuan, masa simpan, dan haknya meminta penghapusan. (<a className="underline" href="/persetujuan" target="_blank">Lihat formulir</a>)</span></label>
      <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
        <video ref={vref} className="w-full h-full object-cover [transform:scaleX(-1)]" playsInline muted />
        {phase === 'cam' && <div className={`absolute inset-[14%] rounded-[40%] border-4 ${ok ? 'border-emerald' : 'border-white/70 border-dashed'}`} />}
        {phase !== 'cam' && <div className="absolute inset-0 flex items-center justify-center bg-dark/80"><button className="btn btn-gold" disabled={!consent || phase === 'loading'} onClick={start}>{phase === 'loading' ? 'Memuat…' : '📷 Buka Kamera'}</button></div>}
        {phase === 'cam' && <div className="absolute bottom-2 inset-x-2 text-center"><span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${ok ? 'bg-emerald text-white' : 'bg-black/60 text-white'}`}>{info}</span></div>}
      </div>
      {phase === 'idle' && info && <div className="text-sm text-red-600">{info}</div>}
      {phase === 'cam' && (
        <>
          <div className="text-sm font-semibold text-dark">Sampel {Math.min(n + 1, 5)}/5 — {STEPS[Math.min(n, 4)]}</div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-primary" disabled={!ok || busy || n >= 8} onClick={capture}>📸 Ambil Sampel</button>
            {n > 0 && <button className="btn btn-ghost" onClick={() => setSamples([])}>↺ Ulangi Semua</button>}
          </div>
          <div className="flex gap-2 flex-wrap">{samples.map((s, i) => <img key={i} src={s.thumb} alt="" className="w-14 h-14 rounded-lg object-cover border-2 border-emerald" />)}</div>
          <button className="btn btn-primary w-full" disabled={n < 3 || busy} onClick={save}>{n < 3 ? `Minimal 3 sampel (baru ${n})` : `✅ Simpan ${n} Sampel`}</button>
          <p className="text-xs text-ink/60">Disarankan 5 sampel dengan sudut sedikit berbeda untuk akurasi terbaik. Embedding disimpan terenkripsi.</p>
        </>
      )}
    </div>
  );
}
