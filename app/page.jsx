import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import LoginArt from '@/components/LoginArt';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let s = {};
  try { s = await getSettings(); } catch {}
  const appName = s.app_name || 'PRESENSI SMART ISLAMIC';
  const school = s.school_name || '';
  const logo = s.logo_app || '/icons/icon-192.png';

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.15fr_1fr] bg-surface">
      <section className="relative overflow-hidden gloss !block h-72 sm:h-80 lg:h-auto lg:min-h-screen">
        <div className="relative z-10 p-5 lg:p-10 safe-top">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width="44" height="44" className="w-11 h-11 rounded-xl bg-white/90 object-contain p-0.5" />
            <div className="leading-tight">
              <div className="font-extrabold text-base lg:text-lg">{appName}</div>
              <div className="text-xs opacity-80">{school}</div>
            </div>
          </div>
          <h1 className="hidden lg:block mt-10 text-4xl xl:text-5xl font-extrabold leading-tight">Presensi Salat Zuhur<br />&amp; Wirid Remaja</h1>
          <p className="hidden lg:block mt-3 text-lg opacity-90 max-w-md">Mencatat kehadiran ibadah siswa secara cepat, akurat, dan aman dengan Face Recognition.</p>
          <p className="lg:hidden mt-3 text-sm font-semibold opacity-95">Presensi Salat Zuhur &amp; Wirid Remaja</p>
        </div>
        <LoginArt className="absolute bottom-0 inset-x-0 w-full h-[72%] lg:h-[58%] pointer-events-none" />
      </section>

      <section className="relative -mt-6 lg:mt-0 rounded-t-3xl lg:rounded-none bg-surface flex items-center justify-center px-6 py-8 lg:p-12 z-10">
        <div className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-dark">Assalamu’alaikum 👋</h2>
            <p className="text-sm text-ink/60 mt-1">Pilih peran untuk melanjutkan.</p>
          </div>
          <Link href="/siswa/login" className="btn btn-gold w-full !py-4 text-base">🎓 Masuk sebagai Siswa</Link>
          <Link href="/login" className="btn btn-primary w-full !py-4 text-base">🔑 Masuk sebagai Admin</Link>
          <p className="text-center text-[11px] text-ink/40 pt-2">{school} · © {new Date().getFullYear()}</p>
        </div>
      </section>
    </main>
  );
}