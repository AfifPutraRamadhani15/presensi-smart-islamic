import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';

const T = {
  departments: { cols: ['name'], order: 'name' },
  academic_years: { cols: ['name', 'is_active'], order: 'name', desc: true },
  classes: { cols: ['name', 'level', 'department_id', 'academic_year_id'], select: '*, departments(name), academic_years(name)', order: 'name' },
  attendance_sessions: { cols: ['activity', 'session_date', 'start_time', 'late_time', 'end_time', 'is_open', 'note'], order: 'session_date', desc: true, limit: 200 },
  attendance_settings: { cols: ['start_time', 'late_time', 'end_time', 'active_days', 'is_active'], order: 'activity', noCreate: true, noDelete: true },
  whatsapp_templates: { cols: ['title', 'body', 'is_active'], order: 'code', noCreate: true, noDelete: true },
};

function cfg(p) {
  const c = T[p.table];
  if (!c) throw new HttpError(404, 'Tabel tidak dikenal');
  return c;
}
function clean(c, body) {
  const o = {};
  for (const k of c.cols) if (k in body) o[k] = body[k] === '' ? null : body[k];
  return o;
}

export const GET = handle(async (req, { params }) => {
  await requireAdmin(req);
  const c = cfg(params);
  let q = db().from(params.table).select(c.select || '*').order(c.order, { ascending: !c.desc }).limit(c.limit || 1000);
  return must(await q);
});

export const POST = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const c = cfg(params);
  if (c.noCreate) throw new HttpError(405, 'Tidak diizinkan');
  const row = must(await db().from(params.table).insert(clean(c, await req.json())).select().single());
  await audit(admin, `TAMBAH_${params.table}`.toUpperCase(), row.id, req);
  return row;
});

export const PUT = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const c = cfg(params);
  const body = await req.json();
  if (!body.id) throw new HttpError(400, 'id wajib');
  if (params.table === 'academic_years' && body.is_active) await db().from('academic_years').update({ is_active: false }).neq('id', body.id);
  const row = must(await db().from(params.table).update(clean(c, body)).eq('id', body.id).select().single());
  await audit(admin, `UBAH_${params.table}`.toUpperCase(), body.id, req);
  return row;
});

export const DELETE = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const c = cfg(params);
  if (c.noDelete) throw new HttpError(405, 'Tidak diizinkan');
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'id wajib');
  must(await db().from(params.table).delete().eq('id', id).select());
  await audit(admin, `HAPUS_${params.table}`.toUpperCase(), id, req);
  return { ok: true };
});
