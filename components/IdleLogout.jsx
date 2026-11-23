'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';

const IDLE_MS = 5 * 60 * 1000;   // batas tidak aktif: 5 menit
const WARN_MS = 30 * 1000;       // peringatan muncul 30 detik sebelum habis
const PING_EVERY = 60 * 1000;    // perpanjang sesi server paling cepat tiap 1 menit
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click'];

// Keluar otomatis jika pengguna tidak aktif 5 menit.
// Waktu aktivitas terakhir disimpan di localStorage supaya sinkron antar tab dan
// tetap akurat setelah HP dikunci / laptop tidur (dicek ulang saat aplikasi dibuka lagi).
export default function IdleLogout({ scope = 'admin', pingUrl, logoutUrl, loginUrl }) {
  const actKey = `psi_active_${scope}`;
  const outKey = `psi_logout_${scope}`;
  const [left, setLeft] = useState(null); // detik tersisa saat peringatan tampil
  const lastPing = useRef(0), lastWrite = useRef(0), done = useRef(false);

  const read = useCallback(() => {
    try { return Number(localStorage.getItem(actKey)) || Date.now(); } catch { return Date.now(); }
  }, [actKey]);

  const logout = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    try { localStorage.setItem(outKey, String(Date.now())); } catch {}
    await Promise.race([
      api(logoutUrl, { method: 'POST' }).catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    window.location.href = loginUrl;
  }, [outKey, logoutUrl, loginUrl]);

  const mark = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastWrite.current < 1000) return;
    // Jika sudah lewat batas (mis. perangkat tidur), aktivitas pertama tidak boleh menyelamatkan sesi.
    if (now - read() >= IDLE_MS) { logout(); return; }
    lastWrite.current = now;
    try { localStorage.setItem(actKey, String(now)); } catch {}
    if (pingUrl && (force || now - lastPing.current > PING_EVERY)) {
      lastPing.current = now;
      api(pingUrl, { method: 'POST' }).catch(() => {});
    }
  }, [actKey, pingUrl, read, logout]);

  useEffect(() => {
    const now = Date.now();
    lastWrite.current = now;
    lastPing.current = now;
    try { localStorage.setItem(actKey, String(now)); } catch {}

    const onAct = () => mark(false);
    EVENTS.forEach((e) => window.addEventListener(e, onAct, { passive: true }));

    const tick = () => {
      const idle = Date.now() - read();
      if (idle >= IDLE_MS) { logout(); return; }
      const rem = IDLE_MS - idle;
      setLeft(rem <= WARN_MS ? Math.ceil(rem / 1000) : null);
    };
    const iv = setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    window.addEventListener('focus', onVis);

    // Jika tab lain sudah keluar, tab ini ikut keluar.
    const onStorage = (e) => { if (e.key === outKey && e.newValue) window.location.href = loginUrl; };
    window.addEventListener('storage', onStorage);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onAct));
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('storage', onStorage);
    };
  }, [actKey, outKey, loginUrl, mark, read, logout]);

  if (left === null) return null;

  return (
    <div className="no-print fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="card w-full max-w-sm text-center space-y-3 pop">
        <div className="text-5xl">⏳</div>
        <h2 id="idle-title" className="text-lg font-extrabold text-dark">Sesi akan berakhir</h2>
        <p className="text-sm text-ink/70">
          Tidak ada aktivitas. Kamu akan keluar otomatis dalam <b className="text-dark">{left} detik</b>.
        </p>
        <div className="grid gap-2">
          <button type="button" className="btn btn-primary !py-3" onClick={() => { mark(true); setLeft(null); }}>Tetap masuk</button>
          <button type="button" className="btn btn-ghost !py-2" onClick={logout}>Keluar sekarang</button>
        </div>
      </div>
    </div>
  );
}