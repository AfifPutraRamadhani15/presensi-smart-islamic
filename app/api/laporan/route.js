import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { buildReport } from '@/lib/report';
import { nowParts, addDays } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const sp = new URL(req.url).searchParams;
  const now = nowParts();
  const from = sp.get('from') || addDays(now.date, -29), to = sp.get('to') || now.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400, 'Format tanggal salah');
  const activity = ['zuhur', 'wirid'].includes(sp.get('activity')) ? sp.get('activity') : 'all';
  const r = await buildReport({ activity, from, to, class_id: sp.get('class_id') || undefined, department_id: sp.get('department_id') || undefined, student_id: sp.get('student_id') || undefined });
  return { rows: r.rows, sessionCount: r.sessionCount, from, to, activity, school: r.settings.school_name, app: r.settings.app_name };
});
