import { db, must } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { encryptJSON } from '@/lib/crypto';
import { matchDescriptor, invalidateFaceCache } from '@/lib/face';
import { normalizePhone } from '@/lib/pure';
import { cleanUsername, checkPassword, hashPassword } from '@/lib/accounts';
import { getSettings } from '@/lib/settings';
import { audit, notify } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Pembatasan: maks 6 percobaan pendaftaran / 10 menit / IP (best effort per instance)
const hits = globalThis.__regHits || (globalThis.__regHits = new Map());

// Publik: daftar kelas untuk formulir + apakah kode pendaftaran diwajibkan
export const GET = handle(async () => {
  const { data } = await db().from('classes').select('id,name,departments(name),academic_years(name)').order('name');
  return {
    classes: (data || []).map((c) => ({ id: c.id, name: c.name, jurusan: c.departments?.name || '', tahun: c.academic_years?.name || '' })),
    needCode: !!process.env.REGISTER_CODE,
  };
});

const okVec = (d) => Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === 'number' && Number.isFinite(x));

// Mencari siswa lain yang wajahnya cocok. Hasil pencocokan memakai cache di memori (per instance server),
// yang bisa usang setelah siswa dihapus admin atau setelah pendaftaran gagal. Karena itu pemiliknya
// dipastikan benar-benar ada di database; kalau tidak ada, cache disegarkan lalu dicek ulang sekali.
async function faceOwner(vec, threshold, claimId) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const m = await matchDescriptor(vec, threshold, 0);
    if (!m.matched || m.student_id === claimId) return null;
    const { data: owner } = await db().from('students').select('id,nis,full_name').eq('id', m.student_id).maybeSingle();
    if (owner) return owner;
    invalidateFaceCache();
  }
  return null;
}

export const POST = handle(async (req) => {
  const ip = clientIp(req), now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 6) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  hits.set(ip, [...recent, now]);

  const b = await req.json();
  if (process.env.REGISTER_CODE && String(b.kode || '').trim() !== process.env.REGISTER_CODE) throw new HttpError(403, 'Kode pendaftaran salah.');

  const nis = String(b.nis || '').trim();
  const nama = String(b.nama || '').trim().replace(/\s+/g, ' ');
  const birthPlace = String(b.birth_place || '').trim();
  const birthDate = String(b.birth_date || '');
  const address = String(b.address || '').trim();
  const parentName = String(b.parent_name || '').trim();
  const phone = normalizePhone(b.whatsapp);
  const password = String(b.password || '');
  const descs = b.descriptors;

  if (!/^[0-9A-Za-z.\-]{4,20}$/.test(nis)) throw new HttpError(400, 'NIS tidak valid (4–20 karakter, huruf/angka).');
  if (nama.length < 3 || nama.length > 80) throw new HttpError(400, 'Nama lengkap tidak valid.');
  if (!['L', 'P'].includes(b.gender)) throw new HttpError(400, 'Pilih jenis kelamin.');
  if (birthPlace.length < 2 || birthPlace.length > 60) throw new HttpError(400, 'Tempat lahir tidak valid.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || +birthDate.slice(0, 4) < 1990 || birthDate > new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'Tanggal lahir tidak valid.');
  if (address.length < 5 || address.length > 200) throw new HttpError(400, 'Alamat tidak valid.');
  if (parentName.length < 3 || parentName.length > 80) throw new HttpError(400, 'Nama orang tua/wali tidak valid.');
  if (!phone) throw new HttpError(400, 'Nomor HP/WhatsApp orang tua tidak valid.');
  checkPassword(password);
  if (!b.consent_biometric) throw new HttpError(400, 'Persetujuan penggunaan data wajah wajib dicentang.');
  if (!Array.isArray(descs) || descs.length < 3 || descs.length > 8 || !descs.every(okVec)) throw new HttpError(400, 'Data wajah tidak valid. Ambil wajah ulang.');
  const photo = typeof b.photo === 'string' && /^data:image\/jpeg;base64,/.test(b.photo) && b.photo.length < 80_000 ? b.photo : null;
  const username = cleanUsername(nis);

  const sb = db();
  const { data: cls } = await sb.from('classes').select('id,department_id,academic_year_id').eq('id', String(b.class_id || '')).maybeSingle();
  if (!cls) throw new HttpError(400, 'Kelas tidak ditemukan.');

  // NIS sudah ada?  -> boleh "klaim" HANYA bila belum punya akun & belum punya Face ID (mis. setelah admin menekan Reset Pendaftaran)
  const { data: ex } = await sb.from('students').select('id,birth_date').eq('nis', nis).maybeSingle();
  let claimId = null;
  if (ex) {
    const { data: exAcc } = await sb.from('student_accounts').select('id').eq('student_id', ex.id).maybeSingle();
    if (exAcc) throw new HttpError(409, 'NIS ini sudah punya akun. Masuk lewat halaman login, pilih "Lupa kata sandi" bila lupa, atau hubungi admin.');
    const { count } = await sb.from('face_data').select('id', { count: 'exact', head: true }).eq('student_id', ex.id);
    if ((count || 0) > 0) throw new HttpError(409, 'NIS ini sudah terdaftar dengan data wajah. Minta admin menekan "Reset Pendaftaran" pada data siswamu, lalu daftar ulang.');
    if (ex.birth_date && ex.birth_date !== birthDate) throw new HttpError(403, 'Tanggal lahir tidak cocok dengan data sekolah.');
    claimId = ex.id;
  }
  const { data: dupUser } = await sb.from('student_accounts').select('id').eq('username', username).maybeSingle();
  if (dupUser) throw new HttpError(409, 'Username (NIS) sudah dipakai. Hubungi admin.');

  // Cegah satu wajah didaftarkan dua kali dengan identitas berbeda
  const s = await getSettings();
  const owner = await faceOwner(descs[0], Number(s.face_threshold || 0.5), claimId);
  if (owner) {
    // Identitas pemilik wajah hanya dikirim ke admin, tidak ditampilkan ke pendaftar.
    try {
      await notify('Pendaftaran ditolak: wajah ganda', `${nama} (NIS ${nis}) mencoba mendaftar, tetapi wajahnya cocok dengan ${owner.full_name} (NIS ${owner.nis}). Periksa di Data Siswa.`, 'warn');
    } catch {}
    throw new HttpError(409, 'Wajah ini sudah terdaftar atas siswa lain. Hubungi admin jika ada kesalahan.');
  }

  const fields = {
    full_name: nama, gender: b.gender, birth_place: birthPlace, birth_date: birthDate,
    class_id: cls.id, department_id: cls.department_id, academic_year_id: cls.academic_year_id,
    address, consent_biometric: true, consent_at: new Date().toISOString(), photo,
  };
  let sid = claimId;
  if (claimId) must(await sb.from('students').update(fields).eq('id', claimId).select('id'));
  else sid = must(await sb.from('students').insert({ nis, status: 'aktif', ...fields }).select('id').single()).id;

  try {
    must(await sb.from('parent_contacts').upsert({ student_id: sid, parent_name: parentName, whatsapp: phone, consent_wa: !!b.consent_wa }, { onConflict: 'student_id' }));
    must(await sb.from('face_data').insert(descs.map((d, i) => ({ student_id: sid, embedding_enc: encryptJSON(d), sample_no: i + 1 }))));
    must(await sb.from('student_accounts').insert({ student_id: sid, username, password_hash: await hashPassword(password), must_change: false }));
  } catch (e) {
    // batalkan agar tidak ada data setengah jadi (data anak dihapus lebih dulu, tidak bergantung pada cascade)
    try {
      await sb.from('face_data').delete().eq('student_id', sid);
      await sb.from('student_accounts').delete().eq('student_id', sid);
      if (!claimId) {
        await sb.from('parent_contacts').delete().eq('student_id', sid);
        await sb.from('students').delete().eq('id', sid);
      }
    } catch {}
    invalidateFaceCache();
    throw e;
  }

  invalidateFaceCache();
  await audit(null, 'DAFTAR_MANDIRI', `${nis} ${nama}`, req);
  await notify('Siswa baru mendaftar mandiri', `${nama} (NIS ${nis})`);
  return { ok: true, username };
});