import { db } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Publik: dipakai halaman login sebagai foto latar (diberi cache agar ringan)
export async function GET() {
  try {
    const { data } = await db().from('app_settings').select('value').eq('key', 'login_bg').maybeSingle();
    const m = /^data:(image\/jpeg|image\/png|image\/webp);base64,(.+)$/.exec(data?.value || '');
    if (!m) return new Response(null, { status: 404 });
    return new Response(Buffer.from(m[2], 'base64'), { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400' } });
  } catch { return new Response(null, { status: 404 }); }
}

export const PUT = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { image } = await req.json();
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image || '') || image.length > 450_000) throw new HttpError(400, 'Foto harus JPG/PNG/WEBP dan maksimal ±330 KB (otomatis diperkecil di browser)');
  const { error } = await db().from('app_settings').upsert({ key: 'login_bg', value: image }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  await audit(admin, 'UBAH_FOTO_LOGIN', null, req);
  return { ok: true };
});

export const DELETE = handle(async (req) => {
  const admin = await requireAdmin(req);
  await db().from('app_settings').delete().eq('key', 'login_bg');
  await audit(admin, 'HAPUS_FOTO_LOGIN', null, req);
  return { ok: true };
});