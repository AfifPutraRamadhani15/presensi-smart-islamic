import { db } from './db';
import { clientIp } from './http';

export async function audit(admin, action, detail, req) {
  try {
    await db().from('activity_logs').insert({
      admin_id: admin?.id ?? null,
      admin_name: admin?.username ?? null,
      action,
      detail: detail ? String(detail).slice(0, 500) : null,
      ip: req ? clientIp(req) : null,
    });
  } catch (e) { console.error('audit gagal', e.message); }
}

export async function notify(title, body, level = 'info') {
  try { await db().from('notifications').insert({ title, body, level }); } catch {}
}
