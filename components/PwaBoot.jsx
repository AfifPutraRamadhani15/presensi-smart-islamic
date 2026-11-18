'use client';
import { useEffect, useState } from 'react';

// Mendaftarkan service worker + splash screen singkat saat aplikasi dibuka
export default function PwaBoot({ appName }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const t = setTimeout(() => setShow(false), 900);
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
