'use client';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/client';

// Menjaga sesi tetap hidup SELAMA aplikasi masih terbuka (tab/aplikasi masih berjalan),
// walaupun pengguna hanya diam, membaca, atau berpindah ke tab lain di browser.
// Jika aplikasi ditutup / di-swipe keluar / ditinggalkan di HP (proses dibekukan), denyut berhenti
// dan cookie sesi habis sendiri sekitar 5 menit kemudian. Saat kembali, pengguna diarahkan ke login.
const BEAT_MS = 30 * 1000;

export default function IdleLogout({ pingUrl, loginUrl }) {
  const busy = useRef(false);

  useEffect(() => {
    if (!pingUrl) return undefined;

    const beat = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        await api(pingUrl, { method: 'POST' });
      } catch (e) {
        // Sesi sudah habis di server -> kembali ke halaman login.
        if (/sesi/i.test(String(e && e.message))) window.location.href = loginUrl || '/login';
      } finally {
        busy.current = false;
      }
    };

    // Saat ditinggalkan, kirim satu denyut terakhir supaya hitungan 5 menit mulai dari saat itu.
    const leave = () => { try { if (navigator.sendBeacon) navigator.sendBeacon(pingUrl); } catch {} };
    const onVis = () => { if (document.visibilityState === 'visible') beat(); else leave(); };

    beat();
    const iv = setInterval(beat, BEAT_MS);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', beat);
    window.addEventListener('online', beat);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', beat);
      window.removeEventListener('online', beat);
    };
  }, [pingUrl, loginUrl]);

  return null;
}