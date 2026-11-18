import { db, must } from '@/lib/db';
import { handle } from '@/lib/http';
import { getSettings, PUBLIC_KEYS } from '@/lib/settings';
import { nowParts } from '@/lib/time';

export const dynamic = 'force-dynamic';

// Publik: dipakai halaman kiosk /presensi. Hanya berisi data non-rahasia.
export const GET = handle(async () => {
  const s = await getSettings();
  const pub = Object.fromEntries(PUBLIC_KEYS.map((k) => [k, s[k] ?? '']));
  const sched = must(await db().from('attendance_settings').select('activity,start_time,late_time,end_time,active_days,is_active'));
  const now = nowParts();
  const sessions = must(await db().from('attendance_sessions').select('activity,start_time,late_time,end_time,is_open').eq('session_date', now.date));
  return { settings: pub, schedule: sched, today_sessions: sessions, now };
});
