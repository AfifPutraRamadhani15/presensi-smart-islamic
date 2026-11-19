import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { deliver } from '@/lib/wa';
import { audit } from '@/lib/log';

// Kirim ulang lewat Cloud API (mode simulasi bila token belum diisi)
export const POST = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  const log = must(await db().from('whatsapp_logs').select('*').eq('id', params.id).single());
  if (body.action === 'manual') {
    must(await db().from('whatsapp_logs').update({ status: 'terkirim', error: 'Dikirim manual oleh admin via WhatsApp' }).eq('id', params.id).select());
    await audit(admin, 'TANDAI_WA_MANUAL', params.id, req);
    return must(await db().from('whatsapp_logs').select('*').eq('id', params.id).single());
  }
  await deliver(log, null);
  await audit(admin, 'KIRIM_ULANG_WA', params.id, req);
  return must(await db().from('whatsapp_logs').select('*').eq('id', params.id).single());
});

// Tandai sudah dikirim manual (setelah admin menekan Kirim di aplikasi WhatsApp)
export const PUT = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { status } = await req.json();
  if (status !== 'terkirim') throw new HttpError(400, 'Status tidak valid');
  const row = must(await db().from('whatsapp_logs').update({ status: 'terkirim', error: 'Dikirim manual oleh admin' }).eq('id', params.id).select().single());
  await audit(admin, 'WA_MANUAL_TERKIRIM', params.id, req);
  return row;
});