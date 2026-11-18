import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { dashboardData } from '@/lib/stats';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req) => { await requireAdmin(req); return dashboardData(); });
