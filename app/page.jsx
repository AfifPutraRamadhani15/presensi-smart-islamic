import Link from 'next/link';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let s = {};
  try { s = await getSettings(); } catch {}
  return (
    <main className="min-h-screen gloss flex items-center justify-center p-6">
      <div className="relative glass !bg-white/15 !border-white/30 rounded-3xl p-8 max-w-md w-full text-center text-white">
        {s.logo_app && <img src={s.logo_app} alt="" className="w-20 h-20 mx-auto rounded-2xl mb-3 object-contain bg-white/80 p-1" />}
        <h1 className="text-2xl font-extrabold">{s.app_name || 'PRESENSI SMART ISLAMIC'}</h1>
        <p className="text-sm opacity-90 mt-1">{s.school_name}</p>
        <div className="mt-6 grid gap-3">
          <Link href="/presensi" className="btn btn-gold !py-4 text-base">📷 Mulai Presensi Wajah</Link>
          <Link href="/login" className="btn bg-white/90 text-dark !py-3">Masuk Admin</Link>
        </div>
      </div>
    </main>
  );
}
