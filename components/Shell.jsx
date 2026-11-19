'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';

const MENU = [
  { href: '/admin', label: 'Dashboard', icon: '🏠' },
  { href: '/presensi', label: 'Presensi Wajah', icon: '📷', ext: true },
  { href: '/admin/siswa', label: 'Data Siswa', icon: '🎓' },
  { href: '/admin/kelas', label: 'Kelas & Jurusan', icon: '🏫' },
  { href: '/admin/sesi', label: 'Jadwal & Sesi', icon: '🗓️' },
  { href: '/admin/presensi', label: 'Rekap & Verifikasi', icon: '✅' },
  { href: '/admin/laporan', label: 'Laporan', icon: '📊' },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/admin/chatbot', label: 'AI Chatbot', icon: '🤖' },
  { href: '/admin/log', label: 'Log Aktivitas', icon: '🛡️' },
  { href: '/admin/pengaturan', label: 'Pengaturan & Profil', icon: '⚙️' },
];
const BOTTOM = [
  { href: '/admin', label: 'Beranda', icon: '🏠' },
  { href: '/presensi', label: 'Presensi', icon: '📷', big: true },
  { href: '/admin/siswa', label: 'Siswa', icon: '🎓' },
  { href: '/admin/laporan', label: 'Laporan', icon: '📊' },
  { href: '/admin/menu', label: 'Profil', icon: '👤' },
];

export default function Shell({ admin, appName, school, logo, children }) {
  const path = usePathname();
  const active = (h) => (h === '/admin' ? path === '/admin' : path.startsWith(h));
  async function logout() { await api('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print hidden md:flex md:w-64 shrink-0 flex-col gloss min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="relative p-5 flex items-center gap-3">
          <img src={logo || '/icons/icon-192.png'} alt="" className="w-10 h-10 rounded-xl bg-white/90 object-contain" />
          <div className="leading-tight"><div className="font-extrabold text-sm">{appName}</div><div className="text-[11px] opacity-80">{school}</div></div>
        </div>
        <nav className="relative flex-1 px-3 space-y-1">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} target={m.ext ? '_blank' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${active(m.href) ? 'bg-white text-dark shadow' : 'hover:bg-white/15'}`}>
              <span>{m.icon}</span>{m.label}
            </Link>
          ))}
        </nav>
        <div className="relative p-4 text-xs"><div className="opacity-80 mb-2">Masuk sebagai <b>{admin.name}</b></div><button onClick={logout} className="btn bg-white/20 w-full">Keluar</button></div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-30 glass safe-top flex items-center justify-between px-4 md:px-6 py-3">
          <div className="font-extrabold text-dark md:hidden">{appName}</div>
          <div className="hidden md:block text-sm text-ink/60">{school}</div>
          <div className="flex items-center gap-2 text-sm"><span className="hidden sm:inline text-ink/70">{admin.name}</span>
            <button onClick={logout} className="btn btn-ghost !py-1 md:hidden">Keluar</button></div>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-28 md:pb-6">{children}</main>
      </div>

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 glass safe-bottom grid grid-cols-5">
        {BOTTOM.map((m) => (
          <Link key={m.href} href={m.href} className={`flex flex-col items-center py-2 text-[11px] font-semibold ${active(m.href) && !m.big ? 'text-primary' : 'text-ink/60'}`}>
            {m.big ? <span className="-mt-7 w-14 h-14 rounded-full gloss shadow-soft flex items-center justify-center text-2xl border-4 border-surface">{m.icon}</span> : <span className="text-xl">{m.icon}</span>}
            {m.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
