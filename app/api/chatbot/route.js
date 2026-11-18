import { db } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { answer } from '@/lib/chatbot';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { message } = await req.json();
  if (!message?.trim() || message.length > 500) throw new HttpError(400, 'Pertanyaan kosong atau terlalu panjang');
  const r = await answer(message.trim());
  await db().from('chatbot_logs').insert({ admin_id: admin.id, question: message.trim(), answer: r.text, mode: r.mode });
  return r;
});
