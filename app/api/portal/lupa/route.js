import { db } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { decryptJSON } from '@/lib/crypto';
import { euclid } from '@/lib/pure';
import { getSettings } from '@/lib/settings';
import { checkPassword, hashPassword } from '@/lib/accounts';
import { audit, notify } from '@/lib/log';

export const dynamic = 'force-dynamic';
const hits = globalThis.__lupaHits || (globalThis.__lupaHits = new Map());

// mode 'reset'       : verifikasi NIS + tanggal lahir + WAJAH, lalu pasang sandi baru
// mode 'minta_admin' : kirim permintaan reset ke admin (notifikasi di dashboard)
export const POST = handle(async (req) => {
  const b = await req.json();
  const nis = String(b.nis || '').trim();
  const key = `${clientIp(req)}|${nis}`, now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 15 * 60_000);
  if (recent.length >= 6) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi 15 menit lagi atau temui admin.');
  hits.set(key, [...recent, now]);

  const sb = db();
  const { data: st } = await sb.from('students').select('id,full_name,nis,birth_date,status').eq('nis', nis).maybeSingle();

  if (b.mode === 'minta_admin') {
    if (st) await notify('Permintaan reset sandi siswa', `${st.full_name} (NIS ${st.nis}) meminta admin mereset sandinya.`, 'warn');
    return { ok: true }; // jawaban sama walau NIS tidak ada (tidak membocorkan data)
  }

  const bad = () => new HttpError(400, 'Data tidak cocok. Periksa NIS & tanggal lahir, atau gunakan "Minta admin mereset".');
  if (!st || st.status !== 'aktif' || !st.birth_date || st.birth_date !== String(b.birth_date || '')) throw bad();
  const { data: acc } = await sb.from('student_accounts').select('id,approval_status').eq('student_id', st.id).maybeSingle();
  if (!acc) throw new HttpError(400, 'Siswa ini belum punya akun. Silakan daftar akun lebih dulu atau hubungi admin.');
  if (acc.approval_status && acc.approval_status !== 'disetujui') throw new HttpError(403, 'Akunmu belum dikonfirmasi admin.');

  const d = b.descriptor;
  if (!Array.isArray(d) || d.length !== 128 || !d.every((x) => typeof x === 'number' && Number.isFinite(x))) throw new HttpError(400, 'Data wajah tidak valid. Ulangi pemindaian.');
  const { data: faces } = await sb.from('face_data').select('embedding_enc').eq('student_id', st.id);
  if (!faces?.length) throw new HttpError(400, 'Face ID belum terdaftar untuk siswa ini. Gunakan "Minta admin mereset".');
  let best = Infinity;
  for (const r of faces) { try { best = Math.min(best, euclid(d, decryptJSON(r.embedding_enc))); } catch {} }
  const s = await getSettings();
  if (!(best <= Number(s.face_threshold || 0.5))) throw new HttpError(400, 'Wajah tidak cocok dengan data yang terdaftar. Coba lagi dengan cahaya lebih terang.');

  checkPassword(b.password);
  const { error } = await sb.from('student_accounts').update({ password_hash: await hashPassword(String(b.password)), must_change: false }).eq('id', acc.id);
  if (error) throw new Error(error.message);
  await audit(null, 'RESET_SANDI_MANDIRI', `${nis}`, req);
  return { ok: true };
});