'use client';
import { useEffect, useState } from 'react';

// Mendaftarkan service worker + splash screen singkat saat aplikasi dibuka
export default function PwaBoot({ appName }) {
  const [show, setShow] = useState(false);

  // Service worker: hanya aktif di production
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else {
      // Mode development: hapus service worker & cache lama supaya tidak mengganggu
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    }
  }, []);

  // Splash screen: tampil sekali per sesi, lalu hilang setelah 500ms
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('psi_splash') === '1'; } catch {}
    if (seen) return;

    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem('psi_splash', '1'); } catch {}
    }, 500);

    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] gloss flex flex-col items-center justify-center text-center p-6">
      <img src="/icons/icon-192.png" alt="" className="relative w-24 h-24 rounded-3xl shadow-2xl pop" />
      <div className="relative mt-4 text-xl font-extrabold tracking-wide">{appName}</div>
      <div className="relative text-xs opacity-80 mt-1">Presensi Salat Zuhur &amp; Wirid Remaja</div>
    </div>
  );
}