import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getSettings, setSettings } from '@/lib/settings';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';
const ALLOWED = ['app_name','school_name','school_address','academic_year','theme_primary','face_threshold','face_margin','tts_enabled','tts_template',
  'wa_enabled','wa_notify_hadir','wa_notify_terlambat','wa_notify_tidak_hadir','ai_enabled','ai_share_names','disc_high','disc_mid','logo_app','logo_school'];

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return { settings: await getSettings(), env: { wa: !!(process.env.WA_TOKEN && process.env.WA_PHONE_NUMBER_ID), ai: !!process.env.AI_API_KEY } };
});

export const PUT = handle(async (req) => {
  const admin = await requireAdmin(req);
  const b = await req.json();
  const o = {};
  for (const k of ALLOWED) if (k in b) o[k] = b[k];
  if ('theme_primary' in o && !/^#[0-9a-fA-F]{6}$/.test(o.theme_primary)) throw new HttpError(400, 'Warna harus format #RRGGBB');
  if ('face_threshold' in o && !(Number(o.face_threshold) > 0.2 && Number(o.face_threshold) < 0.8)) throw new HttpError(400, 'Threshold harus antara 0.2 dan 0.8');
  for (const k of ['logo_app', 'logo_school']) if (o[k] && (!/^data:image\/(png|jpeg|webp);base64,/.test(o[k]) || o[k].length > 200_000)) throw new HttpError(400, 'Logo harus PNG/JPG/WEBP maksimal ±140KB');
  await setSettings(o);
  await audit(admin, 'UBAH_PENGATURAN', Object.keys(o).join(','), req);
  return { ok: true };
});
