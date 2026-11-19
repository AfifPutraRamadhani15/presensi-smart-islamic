import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import LoginArt from '@/components/LoginArt';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Login Admin' };

const FEATURES = [['📷', 'Presensi Wajah'], ['📊', 'Laporan Otomatis'], ['💬', 'Notifikasi WhatsApp'], ['🔒', 'Data Terenkripsi']];

export default async function Login() {
  let s = {}, bgVersion = null;
  try {
    s = await getSettings();
    const { data } = await db().from('app_settings').select('updated_at').eq('key', 'login_bg').maybeSingle();
    bgVersion = data?.updated_at ? encodeURIComponent(data.updated_at) : null;
  } catch {}
  const appName = s.app_name || 'PRESENSI SMART ISLAMIC';
  const school = s.school_name || '';
  const logo = s.logo_app || '/icons/icon-192.png';
  // Foto latar (opsional) di belakang panel ilustrasi, ditutup lapisan hijau agar teks tetap terbaca.
  const bgStyle = bgVersion
    ? { backgroundImage: `linear-gradient(rgba(6,78,59,.80), rgba(8,127,91,.72)), url(/api/login-bg?v=${bgVersion})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.15fr_1fr] bg-surface">
      {/* ===== PANEL KIRI / BANNER ATAS (HP) ===== */}
      <section className="relative overflow-hidden gloss !block h-72 sm:h-80 lg:h-auto lg:min-h-screen" style={bgStyle}>
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
          <div className="hidden lg:flex flex-wrap gap-2 mt-6 max-w-lg">
            {FEATURES.map(([i, t]) => <span key={t} className="bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold">{i} {t}</span>)}
          </div>
          <p className="lg:hidden mt-3 text-sm font-semibold opacity-95">Presensi Salat Zuhur &amp; Wirid Remaja</p>
        </div>
        <LoginArt className="absolute bottom-0 inset-x-0 w-full h-[72%] lg:h-[58%] pointer-events-none" />
      </section>

      {/* ===== PANEL KANAN / FORM ===== */}
      <section className="relative -mt-6 lg:mt-0 rounded-t-3xl lg:rounded-none bg-surface flex items-center justify-center px-6 py-8 lg:p-12 z-10">
        <LoginForm school={school} />
      </section>
    </main>
  );
}