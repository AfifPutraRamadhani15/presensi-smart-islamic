import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import LoginArt from '@/components/LoginArt';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let s = {};
  try {
    s = (await getSettings()) || {};
  } catch (e) {
    s = {};
  }

  const appName = s.app_name || 'PRESENSI SMART ISLAMIC';
  const school = s.school_name || '';
  const logo = s.logo_app || '/icons/icon-192.png';
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-surface lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* Panel kiri / atas: identitas aplikasi */}
      <section className="gloss relative !block h-72 overflow-hidden sm:h-80 lg:h-auto lg:min-h-screen">
        <div className="safe-top relative z-10 p-5 lg:p-10">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt={`Logo ${appName}`}
              width="44"
              height="44"
              className="h-11 w-11 rounded-xl bg-white/90 object-contain p-0.5 shadow-md"
            />
            <div className="leading-tight">
              <div className="text-base font-extrabold lg:text-lg">{appName}</div>
              {school && <div className="text-xs opacity-80">{school}</div>}
            </div>
          </div>

          <h1 className="mt-10 hidden text-4xl font-extrabold leading-tight xl:text-5xl lg:block">
            Presensi Salat Zuhur
            <br />
            &amp; Wirid Remaja
          </h1>
          <p className="mt-3 hidden max-w-md text-lg opacity-90 lg:block">
            Mencatat kehadiran ibadah siswa secara cepat, akurat, dan aman dengan Face Recognition.
          </p>
          <p className="mt-3 text-sm font-semibold opacity-95 lg:hidden">
            Presensi Salat Zuhur &amp; Wirid Remaja
          </p>
        </div>

        <LoginArt className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full lg:h-[58%]" />
      </section>

      {/* Panel kanan / bawah: pilihan masuk */}
      <section className="relative z-10 -mt-6 flex items-center justify-center rounded-t-3xl bg-surface px-6 py-8 lg:mt-0 lg:rounded-none lg:p-12">
        <div className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold text-dark md:text-3xl">Assalamu’alaikum 👋</h2>
            <p className="mt-1 text-sm text-ink/60">Pilih peran untuk melanjutkan.</p>
          </div>

          <Link href="/presensi" className="btn btn-primary w-full !py-4 text-base">
            📷 Buka Presensi Wajah
          </Link>
          <Link href="/siswa/login" className="btn btn-gold w-full !py-4 text-base">
            🎓 Masuk sebagai Siswa
          </Link>
          <Link href="/login" className="btn w-full !py-4 text-base border border-ink/15 bg-white text-dark">
            🔑 Masuk sebagai Admin
          </Link>

          <p className="pt-2 text-center text-[11px] text-ink/40">
            {school ? `${school} · ` : ''}© {year}
          </p>
        </div>
      </section>
    </main>
  );
}