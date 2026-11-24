'use client';
// Pembungkus face-api.js (bundle lokal /vendor/face-api.js, model lokal /models) - tanpa CDN.
let loading;

export function loadFaceApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('client only'));
  if (window.faceapi && window.__faceModels) return Promise.resolve(window.faceapi);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const boot = async () => {
      try {
        const f = window.faceapi;
        await Promise.all([
          f.nets.tinyFaceDetector.loadFromUri('/models'),
          f.nets.faceLandmark68Net.loadFromUri('/models'),
          f.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        window.__faceModels = true;
        resolve(f);
      } catch (e) { loading = null; reject(e); }
    };
    if (window.faceapi) return boot();
    const s = document.createElement('script');
    s.src = '/vendor/face-api.js';
    s.onload = boot;
    s.onerror = () => { loading = null; reject(new Error('Gagal memuat /vendor/face-api.js')); };
    document.head.appendChild(s);
  });
  return loading;
}

// Sedikit lebih peka dari sebelumnya (ukuran masukan 352, ambang 0.4) agar wajah tetap terdeteksi
// pada cahaya kurang terang / HP kelas menengah. Ukuran harus kelipatan 32.
export const DETECT_OPTS = (f) => new f.TinyFaceDetectorOptions({ inputSize: 352, scoreThreshold: 0.4 });
// Versi lebih cepat untuk loop kiosk (supaya kedipan singkat tidak terlewat di HP)
export const DETECT_FAST = (f) => new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

export async function startCamera(video, facing = 'user') {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera tidak tersedia. Buka lewat HTTPS atau localhost.');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (e) {
    // Izin ditolak: teruskan apa adanya supaya pesan "izin kamera" tetap muncul.
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw e;
    // Kamera/ukuran yang diminta tidak cocok: coba lagi dengan pengaturan paling longgar.
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  try {
    await video.play();
  } catch (e) {
    stopCamera(stream);
    throw e;
  }
  return stream;
}

export function stopCamera(stream) { stream?.getTracks().forEach((t) => t.stop()); }

// Eye Aspect Ratio dari 68 landmark (mata kiri 36-41, kanan 42-47)
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function ear(p) { return (d(p[1], p[5]) + d(p[2], p[4])) / (2 * d(p[0], p[3])); }
export function eyeAspect(landmarks) {
  const pts = landmarks.positions;
  return (ear(pts.slice(36, 42)) + ear(pts.slice(42, 48))) / 2;
}

// Ambil foto profil (JPEG kecil) dari video, dipotong ke wajah
export function snapshot(video, box, size = 240) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const pad = box.width * 0.35;
  const sx = Math.max(0, box.x - pad), sy = Math.max(0, box.y - pad * 1.2);
  const sw = Math.min(video.videoWidth - sx, box.width + pad * 2), sh = Math.min(video.videoHeight - sy, box.height + pad * 2);
  const side = Math.min(sw, sh);
  c.getContext('2d').drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.8);
}

export function brightness(video) {
  const c = document.createElement('canvas'); c.width = 48; c.height = 36;
  const x = c.getContext('2d'); x.drawImage(video, 0, 0, 48, 36);
  const px = x.getImageData(0, 0, 48, 36).data; let s = 0;
  for (let i = 0; i < px.length; i += 4) s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  return s / (px.length / 4);
}

// ===== Suara (Web Speech API, Bahasa Indonesia) =====
export function getVoicePrefs() {
  try { return { on: true, volume: 1, rate: 1, ...JSON.parse(localStorage.getItem('psi_voice') || '{}') }; } catch { return { on: true, volume: 1, rate: 1 }; }
}
export function setVoicePrefs(p) { try { localStorage.setItem('psi_voice', JSON.stringify(p)); } catch {} }

let _utt; // simpan referensi agar tidak dibuang garbage collector (bug Chrome)
export function speak(text, prefs = getVoicePrefs()) {
  if (!prefs.on || typeof speechSynthesis === 'undefined' || !text) return;
  try { speechSynthesis.cancel(); } catch {}
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID'; u.volume = prefs.volume; u.rate = prefs.rate;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('id'));
    if (v) u.voice = v;
    _utt = u;
    try { speechSynthesis.resume(); } catch {}
    speechSynthesis.speak(u);
  }, 80);
}

// Browser (terutama iOS Safari) butuh interaksi pengguna sebelum suara boleh diputar
export function unlockSpeech() { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {} }

// ===== Bunyi 'bip' (Web Audio) — tetap berbunyi walau suara bahasa Indonesia tidak tersedia =====
let audioCtx;
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}
export function beep(kind = 'ok', prefs = getVoicePrefs()) {
  try {
    if (!prefs.on || !audioCtx) return;
    const seq = kind === 'ok' ? [[880, 0.12], [1175, 0.2]] : kind === 'warn' ? [[660, 0.14], [660, 0.14]] : [[300, 0.3]];
    let t = audioCtx.currentTime;
    for (const [freq, dur] of seq) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = Math.max(0.05, 0.3 * prefs.volume);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); g.gain.setTargetAtTime(0.0001, t + dur - 0.04, 0.02); o.stop(t + dur);
      t += dur + 0.03;
    }
  } catch {}
}