'use client';
// Pembungkus face-api.js (bundle lokal /vendor/face-api.js, model lokal /models) - tanpa CDN.
let loading;

const timeout = (ms, msg) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));

// Pemanasan mesin deteksi. Jika WebGL gagal di perangkat tertentu, beralih ke CPU supaya tetap bisa jalan.
async function warmUp(f) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    await f.detectAllFaces(c, new f.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 }));
  } catch (e) {
    try { if (f.tf && f.tf.setBackend) { await f.tf.setBackend('cpu'); await f.tf.ready(); } } catch {}
  }
}

export function loadFaceApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('client only'));
  if (window.faceapi && window.__faceModels) return Promise.resolve(window.faceapi);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const boot = async () => {
      try {
        const f = window.faceapi;
        // Batas waktu supaya tidak "Memuat model…" tanpa akhir saat sinyal buruk / file gagal diunduh.
        await Promise.race([
          Promise.all([
            f.nets.tinyFaceDetector.loadFromUri('/models'),
            f.nets.faceLandmark68Net.loadFromUri('/models'),
            f.nets.faceRecognitionNet.loadFromUri('/models'),
          ]).then(() => warmUp(f)),
          timeout(60000, 'Model wajah terlalu lama dimuat. Periksa sinyal internet lalu tekan "Coba Lagi".'),
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

// ===== Kamera lintas perangkat (Android, iPhone, Windows, macOS) =====

// Browser di dalam aplikasi lain (WhatsApp, Instagram, Facebook, TikTok, ...) sering memblokir kamera.
export function isInAppBrowser() {
  try {
    const ua = navigator.userAgent || '';
    if (/(FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|musical_ly|TikTok|BytedanceWebview|Snapchat|Twitter|LinkedInApp|WhatsApp)/i.test(ua)) return true;
    if (/; wv\)/.test(ua)) return true; // Android WebView
    if (/iPhone|iPad|iPod/.test(ua) && !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return true; // iOS WebView
  } catch {}
  return false;
}

export function cameraErrorMessage(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') {
    return 'Izin kamera ditolak. iPhone: Pengaturan → Apps → Safari → Kamera → Izinkan. Android/komputer: ketuk ikon gembok di bilah alamat → Izin → Kamera → Izinkan. Lalu tekan "Coba Lagi".';
  }
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini.';
  if (n === 'NotReadableError' || n === 'AbortError') return 'Kamera sedang dipakai aplikasi atau tab lain. Tutup yang lain, lalu tekan "Coba Lagi".';
  return (e && e.message) || 'Gagal memulai kamera.';
}

export async function listCameras() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput' && d.deviceId).map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
  } catch { return []; }
}

// Kamera depan (atau webcam laptop) ditampilkan seperti cermin; kamera belakang tidak.
export function isFrontCamera(stream) {
  try {
    const t = stream.getVideoTracks()[0];
    const s = (t.getSettings && t.getSettings()) || {};
    if (s.facingMode) return s.facingMode === 'user';
    return !/back|rear|environment|belakang/i.test(t.label || '');
  } catch { return true; }
}

export async function startCamera(video, facing = 'user', deviceId = null) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(window.isSecureContext === false
      ? 'Kamera hanya bisa dibuka lewat alamat HTTPS.'
      : 'Browser ini tidak mendukung kamera. Buka lewat Chrome atau Safari terbaru (bukan dari dalam aplikasi lain).');
  }
  if (video.srcObject) { stopCamera(video.srcObject); video.srcObject = null; }

  // Dicoba berurutan dari yang paling spesifik ke yang paling longgar.
  const size = { width: { ideal: 640 }, height: { ideal: 480 } };
  const attempts = [];
  if (deviceId) attempts.push({ video: { deviceId: { exact: deviceId }, ...size }, audio: false });
  attempts.push({ video: { facingMode: { ideal: facing }, ...size }, audio: false });
  attempts.push({ video: { facingMode: { ideal: facing } }, audio: false });
  attempts.push({ video: true, audio: false });

  let stream, lastErr;
  for (const c of attempts) {
    try { stream = await navigator.mediaDevices.getUserMedia(c); break; }
    catch (e) {
      lastErr = e;
      // Izin ditolak / kamera dipakai pihak lain: mengulang tidak membantu.
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'NotReadableError')) throw e;
    }
  }
  if (!stream) throw lastErr || new Error('Kamera tidak dapat dibuka.');

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('muted', '');
  video.muted = true;
  video.autoplay = true;
  try {
    // Di iPhone janji play() kadang tidak pernah selesai walau kamera sudah menyala.
    // Tunggu paling lama 4 detik, lalu lanjut (video tetap berjalan sendiri).
    const p = video.play();
    if (p && typeof p.then === 'function') await Promise.race([p, new Promise((r) => setTimeout(r, 4000))]);
    // Pastikan gambar pertama benar-benar datang (bukan layar hitam).
    const t0 = Date.now();
    while (!(video.videoWidth > 0) && Date.now() - t0 < 6000) await new Promise((r) => setTimeout(r, 100));
    if (!(video.videoWidth > 0)) throw new Error('Kamera menyala tetapi tidak mengirim gambar. Tutup aplikasi lain yang memakai kamera, lalu tekan "Coba Lagi".');
  } catch (e) {
    stopCamera(stream);
    video.srcObject = null;
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