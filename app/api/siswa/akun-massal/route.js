import { db, fetchAll } from '@/lib/db';
import { handle } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';
import { genPassword, hashPassword } from '@/lib/accounts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const BATCH = 80; // per permintaan (hashing sandi butuh waktu); klik lagi bila masih ada sisa

// Buat akun untuk semua siswa aktif yang belum punya akun. Username = NIS, sandi sementara acak.
export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const students = await fetchAll(() => db().from('students').select('id,nis,full_name,classes(name)').eq('status', 'aktif').order('full_name'));
  const accs = await fetchAll(() => db().from('student_accounts').select('student_id,username').order('id'));
  const has = new Set(accs.map((a) => a.student_id)), used = new Set(accs.map((a) => a.username));
  const pending = students.filter((s) => !has.has(s.id));
  const created = [], skipped = [];
  for (const s of pending.slice(0, BATCH)) {
    const username = String(s.nis).trim().toLowerCase();
    if (!/^[a-z0-9._-]{4,30}$/.test(username)) { skipped.push(`${s.nis} ${s.full_name}: NIS tidak valid sebagai username`); continue; }
    if (used.has(username)) { skipped.push(`${s.nis} ${s.full_name}: username sudah dipakai`); continue; }
    const password = genPassword();
    const { error } = await db().from('student_accounts').insert({ student_id: s.id, username, password_hash: await hashPassword(password), must_change: true });
    if (error) { skipped.push(`${s.nis} ${s.full_name}: ${error.message}`); continue; }
    used.add(username);
    created.push({ NIS: s.nis, Nama: s.full_name, Kelas: s.classes?.name || '-', Username: username, 'Sandi Sementara': password });
  }
  await audit(admin, 'BUAT_AKUN_MASSAL', `${created.length} dibuat, ${skipped.length} dilewati`, req);
  return { created, skipped, remaining: Math.max(0, pending.length - BATCH) };
});