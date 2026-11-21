'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LoginArt from '@/components/LoginArt';
import { loadFaceApi, DETECT_OPTS, startCamera, stopCamera, snapshot, brightness } from '@/lib/faceClient';

const STEPS = ['Data Diri', 'Orang Tua & Akun', 'Rekam Wajah'];
const POSES = ['Hadap lurus ke kamera', 'Tengok sedikit ke kiri', 'Tengok sedikit ke kanan', 'Angkat dagu sedikit', 'Tundukkan kepala sedikit'];
const NEED = 5;

const normPhone = (p) => {
  let n = String(p || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1); else if (n.startsWith('8')) n = '62' + n;
  return /^62\d{8,13}$/.test(n) ? n : null;
};

function Field({ label, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink/50 mt-1">{hint}</p>}
    </div>
  );
}

export default function Daftar() {
  const videoRef = useRef(null), streamRef = useRef(null), stop = useRef(true);
  const [cfg, setCfg] = useState(null), [classes, setClasses] = useState([]), [needCode, setNeedCode] = useState(false);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ nis: '', nama: '', gender: '', birth_place: '', birth_date: '', class_id: '', address: '', parent_name: '', whatsapp: '', consent_wa: true, password: '', password2: '', kode: '', consent_bio: false });
  const [cam, setCam] = useState('off'), [ok, setOk] = useState(false), [msg, setMsg] = useState('');
  const [samples, setSamples] = useState([]), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false), [showPw, setShowPw] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    fetch('/api/presensi/config').then((r) => r.json()).then(setCfg).catch(() => {});
    fetch('/api/daftar').then((r) => r.json()).then((d) => { setClasses(d.classes || []); setNeedCode(!!d.needCode); }).catch(() => setErr('Gagal memuat daftar kelas. Muat ulang halaman.'));
    loadFaceApi().catch(() => {});
    return () => { stop.current = true; stopCamera(streamRef.current); };
  }, []);
  useEffect(() => { if (step !== 2) closeCam(); }, [step]);

  function closeCam() { stop.current = true; stopCamera(streamRef.current); streamRef.current = null; setCam('off'); setOk(false); }

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
            const br = brightness(v);
            let good = false, m = '';
            if (!dets.length) m = 'Wajah belum terdeteksi';
            else if (dets.length > 1) m = 'Terdeteksi lebih dari satu wajah';
            else if (br < 70) m = 'Pencahayaan kurang terang';
            else if (dets[0].box.width < v.videoWidth * 0.28) m = 'Dekatkan wajah ke kamera';
            else {
              const b = dets[0].box, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
              if (Math.abs(cx - v.videoWidth / 2) > v.videoWidth * 0.2 || Math.abs(cy - v.videoHeight / 2) > v.videoHeight * 0.25) m = 'Pindahkan wajah ke tengah bingkai';
              else { good = true; m = 'Wajah siap diambil ✔'; }
            }
            setOk(good); setMsg(m);
          }
        } catch {}
        setTimeout(tick, 250);
      };
      tick();
    } catch (e) {
      setCam('off');
      setErr(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di browser lalu coba lagi.' : e.message);
    }
  }

  async function capture() {
    if (!ok || busy || samples.length >= NEED) return;
    setBusy(true); setErr('');
    try {
      const fa = window.faceapi, v = videoRef.current;
      const r = await fa.detectSingleFace(v, DETECT_OPTS(fa)).withFaceLandmarks().withFaceDescriptor();
      if (!r) { setErr('Wajah tidak terbaca, coba lagi.'); return; }
      setSamples((s) => [...s, { desc: Array.from(r.descriptor), thumb: snapshot(v, r.detection.box, 240) }]);
    } finally { setBusy(false); }
  }

  function validate(s) {
    if (s === 0) {
      if (!/^[0-9A-Za-z.\-]{4,20}$/.test(f.nis.trim())) return 'NIS tidak valid (4–20 karakter, huruf/angka).';
      if (f.nama.trim().length < 3) return 'Nama lengkap minimal 3 huruf.';
      if (!f.gender) return 'Pilih jenis kelamin.';
      if (f.birth_place.trim().length < 2) return 'Isi tempat lahir.';
      if (!f.birth_date) return 'Isi tanggal lahir.';
      if (!f.class_id) return 'Pilih kelas.';
      if (f.address.trim().length < 5) return 'Isi alamat dengan lengkap.';
    }
    if (s === 1) {
      if (f.parent_name.trim().length < 3) return 'Isi nama orang tua/wali.';
      if (!normPhone(f.whatsapp)) return 'Nomor HP/WhatsApp orang tua tidak valid (contoh: 081234567890).';
      if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return 'Sandi minimal 8 karakter, kombinasi huruf dan angka.';
      if (f.password !== f.password2) return 'Konfirmasi sandi tidak sama.';
      if (needCode && !f.kode.trim()) return 'Isi kode pendaftaran dari guru/admin.';
    }
    if (s === 2) {
      if (!f.consent_bio) return 'Centang persetujuan penggunaan data wajah.';
      if (samples.length < NEED) return `Ambil ${NEED} sampel wajah (baru ${samples.length}).`;
    }
    return '';
  }

  function next() {
    const e = validate(step);
    if (e) return setErr(e);
    setErr(''); setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function back() { setErr(''); setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function submit() {
    const e = validate(2);
    if (e) return setErr(e);
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/daftar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: f.nis, nama: f.nama, gender: f.gender, birth_place: f.birth_place, birth_date: f.birth_date, class_id: f.class_id, address: f.address,
          parent_name: f.parent_name, whatsapp: f.whatsapp, consent_wa: f.consent_wa, consent_biometric: f.consent_bio, password: f.password, kode: f.kode,
          descriptors: samples.map((s) => s.desc), photo: samples[0].thumb,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal mendaftar');
      closeCam(); setDone(true);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  const appName = cfg?.settings?.app_name || 'PRESENSI SMART ISLAMIC';
  const school = cfg?.settings?.school_name || '';

  if (done) {
    return (
      <main className="min-h-screen gloss flex items-center justify-center p-5 text-center">
        <div className="relative z-10 card text-ink max-w-md w-full space-y-3 pop">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold text-dark">Pendaftaran Berhasil</h1>
          <p className="text-sm">Data dan wajah <b>{f.nama}</b> sudah tersimpan. Kamu sudah bisa presensi dengan Face ID.</p>
          <div className="rounded-2xl bg-light p-3 text-sm text-left">
            <div>Username portal: <b>{f.nis.trim().toLowerCase()}</b></div>
            <div>Sandi: yang kamu buat tadi</div>
          </div>
          <Link href="/portal/login" className="btn btn-gold w-full !py-3">🎓 Masuk ke Portal Siswa</Link>
          <Link href="/presensi" className="btn btn-ghost w-full">📷 Ke Halaman Presensi</Link>
        </div>
      </main>
    );
  }

  const input = { className: 'input !py-3' };
  return (
    <main className="min-h-screen bg-surface">
      <header className="relative gloss overflow-hidden h-44 sm:h-52">
        <div className="relative z-10 p-5 max-w-2xl mx-auto safe-top">
          <div className="font-extrabold text-base sm:text-lg">{appName}</div>
          <div className="text-xs opacity-80">{school}</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">Pendaftaran Siswa</h1>
          <p className="text-xs sm:text-sm opacity-90">Isi data lengkap &amp; daftarkan wajahmu sekali saja.</p>
        </div>
        <LoginArt className="absolute bottom-0 inset-x-0 w-full h-[55%] opacity-90 pointer-events-none" />
      </header>

      <div className="relative z-10 -mt-5 mx-auto max-w-2xl px-3 sm:px-4 pb-32">
        {/* Stepper */}
        <div className="card !p-3 mb-3">
          <div className="flex items-center">
            {STEPS.map((t, i) => (
              <div key={t} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition ${i < step ? 'bg-emerald text-white' : i === step ? 'gloss' : 'bg-light text-dark'}`}><span className="relative">{i < step ? '✓' : i + 1}</span></div>
                  <div className={`mt-1 text-[10px] sm:text-xs font-semibold text-center leading-tight ${i === step ? 'text-dark' : 'text-ink/50'}`}>{t}</div>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${i < step ? 'bg-emerald' : 'bg-light'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1 — DATA DIRI */}
        {step === 0 && (
          <div className="card space-y-4">
            <h2 className="font-extrabold text-dark text-lg">Data Diri Siswa</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="NIS *" hint="Dipakai sebagai username login portal."><input {...input} value={f.nis} onChange={(e) => set('nis', e.target.value)} placeholder="Nomor Induk Siswa" autoComplete="off" /></Field>
              <Field label="Nama Lengkap *"><input {...input} value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Sesuai data sekolah" autoComplete="name" /></Field>
              <Field label="Jenis Kelamin *">
                <div className="grid grid-cols-2 gap-2">
                  {[['L', '👦 Laki-laki'], ['P', '👧 Perempuan']].map(([v, l]) => (
                    <button type="button" key={v} onClick={() => set('gender', v)} className={`btn !py-3 ${f.gender === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="Kelas *">
                <select {...input} value={f.class_id} onChange={(e) => set('class_id', e.target.value)}>
                  <option value="">— Pilih kelas —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.jurusan ? ` · ${c.jurusan}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Tempat Lahir *"><input {...input} value={f.birth_place} onChange={(e) => set('birth_place', e.target.value)} placeholder="Kota/kabupaten" /></Field>
              <Field label="Tanggal Lahir *"><input type="date" {...input} value={f.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></Field>
              <Field label="Alamat *" className="sm:col-span-2"><textarea className="input" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Alamat lengkap tempat tinggal" /></Field>
            </div>
          </div>
        )}

        {/* STEP 2 — ORANG TUA & AKUN */}
        {step === 1 && (
          <div className="card space-y-4">
            <h2 className="font-extrabold text-dark text-lg">Orang Tua / Wali &amp; Akun</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nama Orang Tua/Wali *"><input {...input} value={f.parent_name} onChange={(e) => set('parent_name', e.target.value)} placeholder="Nama ayah/ibu/wali" /></Field>
              <Field label="No. HP / WhatsApp Orang Tua *" hint="Untuk pemberitahuan kehadiran. Contoh: 081234567890"><input {...input} inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" /></Field>
            </div>
            <label className="flex gap-2 text-sm bg-light/70 rounded-xl p-3"><input type="checkbox" className="mt-1" checked={f.consent_wa} onChange={(e) => set('consent_wa', e.target.checked)} /><span>Orang tua/wali <b>menyetujui</b> menerima pemberitahuan presensi lewat WhatsApp.</span></label>

            <div className="rounded-2xl border border-emerald/25 p-3 space-y-3">
              <div className="text-sm font-bold text-dark">🔑 Akun Portal Siswa</div>
              <p className="text-xs text-ink/60">Username kamu adalah <b>NIS</b> ({f.nis.trim() || '—'}). Buat sandi untuk melihat riwayat presensimu.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Sandi *" hint="Min. 8 karakter, huruf + angka.">
                  <div className="relative"><input {...input} className="input !py-3 !pr-24" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary px-2 py-1">{showPw ? 'Sembunyikan' : 'Tampilkan'}</button></div>
                </Field>
                <Field label="Ulangi Sandi *"><input {...input} type={showPw ? 'text' : 'password'} autoComplete="new-password" value={f.password2} onChange={(e) => set('password2', e.target.value)} /></Field>
              </div>
              {needCode && <Field label="Kode Pendaftaran *" hint="Diberikan oleh guru/admin."><input {...input} value={f.kode} onChange={(e) => set('kode', e.target.value)} /></Field>}
            </div>
          </div>
        )}

        {/* STEP 3 — WAJAH */}
        {step === 2 && (
          <div className="card space-y-4">
            <div>
              <h2 className="font-extrabold text-dark text-lg">Rekam Wajah</h2>
              <p className="text-xs text-ink/60">Ambil {NEED} foto dengan sudut sedikit berbeda agar pengenalan akurat.</p>
            </div>
            <div className="grid md:grid-cols-[1.25fr_1fr] gap-4">
              <div className="space-y-2">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black shadow-soft">
                  <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" playsInline muted />
                  {cam === 'on' && <div className={`absolute inset-[14%] rounded-[40%] border-4 transition ${ok ? 'border-emerald' : 'border-white/70 border-dashed'}`} />}
                  {cam === 'on' && <div className="absolute bottom-2 inset-x-2 text-center"><span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${ok ? 'bg-emerald text-white' : 'bg-black/60 text-white'}`}>{msg}</span></div>}
                  {cam !== 'on' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark/90 text-white p-4 text-center">
                      <div className="text-5xl">📷</div>
                      <button type="button" onClick={openCam} disabled={cam === 'loading'} className="btn btn-gold !py-3 !px-6">{cam === 'loading' ? 'Memuat kamera…' : 'Aktifkan Kamera'}</button>
                    </div>
                  )}
                </div>
                {cam === 'on' && (
                  <button type="button" onClick={capture} disabled={!ok || busy || samples.length >= NEED} className="btn btn-primary w-full !py-3">
                    {samples.length >= NEED ? '✔ Semua sampel terambil' : `📸 Ambil Foto ${samples.length + 1}/${NEED}`}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-light/70 p-3">
                  <div className="text-xs font-bold text-dark">Petunjuk saat ini</div>
                  <div className="text-sm font-semibold mt-0.5">{samples.length >= NEED ? 'Selesai! Lanjutkan ke pendaftaran.' : POSES[samples.length]}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: NEED }).map((_, i) => (
                    <div key={i} className={`w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center text-xs font-bold border-2 ${samples[i] ? 'border-emerald' : i === samples.length ? 'border-gold border-dashed' : 'border-light'} bg-light/60`}>
                      {samples[i] ? <img src={samples[i].thumb} alt="" className="w-full h-full object-cover" /> : i + 1}
                    </div>
                  ))}
                </div>
                {samples.length > 0 && <button type="button" onClick={() => setSamples([])} className="btn btn-ghost !py-2 text-xs">↺ Ulangi dari awal</button>}
                <ul className="text-[11px] text-ink/60 space-y-0.5 list-disc pl-4">
                  <li>Lepas masker/topi/kacamata gelap.</li>
                  <li>Cahaya cukup, wajah di tengah bingkai.</li>
                  <li>Hanya satu wajah yang terlihat.</li>
                </ul>
              </div>
            </div>

            <label className="flex gap-2 text-sm bg-gold/20 rounded-xl p-3"><input type="checkbox" className="mt-1" checked={f.consent_bio} onChange={(e) => set('consent_bio', e.target.checked)} />
              <span>Saya (dan orang tua/wali) <b>menyetujui</b> data wajah dipakai untuk presensi sekolah, serta mengetahui tujuan, masa simpan, dan hak penghapusan data. <Link href="/persetujuan" target="_blank" className="underline text-primary font-semibold">Baca ketentuan</Link></span></label>
          </div>
        )}

        {err && <div role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">⚠ {err}</div>}
        <Link href="/login" className="block text-center text-sm text-primary font-semibold mt-4">← Kembali ke Login</Link>
      </div>

      {/* Bilah aksi tetap di bawah (nyaman untuk HP) */}
      <div className="fixed bottom-0 inset-x-0 z-30 glass safe-bottom">
        <div className="max-w-2xl mx-auto flex gap-2 p-3">
          {step > 0 && <button type="button" onClick={back} className="btn btn-ghost !py-3 flex-1">← Kembali</button>}
          {step < 2
            ? <button type="button" onClick={next} className="btn btn-primary !py-3 flex-[2]">Lanjut →</button>
            : <button type="button" onClick={submit} disabled={busy} className="btn btn-primary !py-3 flex-[2]">{busy ? 'Menyimpan…' : '✅ Daftar Sekarang'}</button>}
        </div>
      </div>
    </main>
  );
}