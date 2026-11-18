import { db, must } from './db';
import { getSettings } from './settings';
import { dateID, timeID, ACTIVITY_LABEL, STATUS_LABEL } from './time';
import { notify } from './log';
import { render, normalizePhone } from './pure';
export { render, normalizePhone } from './pure';

export function buildVars({ student, className, activity, session_date, checked_at, status }) {
  return {
    nama: student.full_name, nis: student.nis, kelas: className || '-',
    kegiatan: ACTIVITY_LABEL[activity] || activity,
    tanggal: dateID(session_date), waktu: checked_at ? timeID(checked_at) : '-',
    status: STATUS_LABEL[status] || status,
  };
}

// Kirim lewat WhatsApp Cloud API resmi Meta. Jika WA_TOKEN kosong -> mode SIMULASI (hanya mencatat log).
export async function deliver(logRow, vars) {
  const token = process.env.WA_TOKEN, phoneId = process.env.WA_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return db().from('whatsapp_logs').update({ status: 'simulasi', error: 'WA_TOKEN belum diisi (mode simulasi)' }).eq('id', logRow.id);
  }
  const to = normalizePhone(logRow.to_number);
  let payload;
  if (process.env.WA_TEMPLATE_NAME) {
    const order = ['nama','nis','kelas','kegiatan','tanggal','waktu','status'];
    payload = { messaging_product: 'whatsapp', to, type: 'template', template: {
      name: process.env.WA_TEMPLATE_NAME, language: { code: process.env.WA_TEMPLATE_LANG || 'id' },
      components: [{ type: 'body', parameters: order.map((k) => ({ type: 'text', text: String(vars?.[k] ?? '-') })) }] } };
  } else {
    payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: logRow.message } };
  }
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
    await db().from('whatsapp_logs').update({ status: 'terkirim', error: null }).eq('id', logRow.id);
  } catch (e) {
    await db().from('whatsapp_logs').update({ status: 'gagal', error: String(e.message).slice(0, 300) }).eq('id', logRow.id);
    await notify('Pengiriman WhatsApp gagal', e.message, 'warn');
  }
}

// Dipanggil setelah presensi tersimpan. Tidak pernah melempar error (presensi tidak boleh gagal karena WA).
export async function notifyParent({ student, className, activity, session_date, checked_at, status, record_id }) {
  try {
    const s = await getSettings();
    if (s.wa_enabled !== '1') return;
    if (s['wa_notify_' + status] !== '1') return;
    const { data: pc } = await db().from('parent_contacts').select('whatsapp, consent_wa').eq('student_id', student.id).maybeSingle();
    if (!pc?.whatsapp || !pc.consent_wa) return;
    const { data: tpl } = await db().from('whatsapp_templates').select('*').eq('code', status === 'terlambat' ? 'terlambat' : status === 'hadir' ? 'hadir' : 'tidak_hadir').maybeSingle();
    if (!tpl || !tpl.is_active) return;
    const vars = buildVars({ student, className, activity, session_date, checked_at, status });
    const message = render(tpl.body, vars);
    const log = must(await db().from('whatsapp_logs').insert({
      student_id: student.id, record_id, to_number: pc.whatsapp, template_code: tpl.code, message, status: 'menunggu',
    }).select().single());
    await deliver(log, vars);
  } catch (e) { console.error('notifyParent', e.message); }
}
