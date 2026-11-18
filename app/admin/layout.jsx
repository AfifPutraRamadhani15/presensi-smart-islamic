import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const admin = await getAdmin();
  if (!admin) redirect('/login');
  let s = {};
  try { s = await getSettings(); } catch {}
  return <Shell admin={admin} appName={s.app_name || 'PRESENSI SMART ISLAMIC'} school={s.school_name} logo={s.logo_app}>{children}</Shell>;
}
