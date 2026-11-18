import './globals.css';
import { getSettings, hexToRgbTriplet } from '@/lib/settings';
import { Toasts } from '@/components/ui';
import PwaBoot from '@/components/PwaBoot';

export const dynamic = 'force-dynamic';

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#087F5B', viewportFit: 'cover' };

export async function generateMetadata() {
  let name = 'Presensi Smart Islamic';
  try { name = (await getSettings()).app_name || name; } catch {}
  return {
    title: name,
    description: 'Presensi Salat Zuhur dan Wirid Remaja berbasis Face Recognition',
    manifest: '/manifest.json',
    icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
  };
}

export default async function RootLayout({ children }) {
  let rgb = '8 127 91', name = 'PRESENSI SMART ISLAMIC';
  try { const s = await getSettings(); rgb = hexToRgbTriplet(s.theme_primary); name = s.app_name || name; } catch {}
  return (
    <html lang="id">
      <head><style>{`:root{--primary:${rgb}}`}</style></head>
      <body>
        <PwaBoot appName={name} />
        {children}
        <Toasts />
      </body>
    </html>
  );
}
