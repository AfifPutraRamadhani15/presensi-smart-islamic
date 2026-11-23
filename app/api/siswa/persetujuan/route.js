import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Daftar akun siswa yang menunggu konfirmasi (dan yang ditolak, supaya bisa disetujui ulang).
export const GET = handle(async (req) => {
  await requireAdmin(req);
  const data = must(await db().from('student_accounts')
    .select('id,username,created_at,approval_status,students(full_name,nis,classes(name))')
    .in('approval_status', ['menunggu', 'ditolak'])
    .order('created_at', { ascending: true }));
  const rows = (data || []).map((r) => ({
    id: r.id, username: r.username, created_at: r.created_at, status: r.approval_status,
    nama: r.students?.full_name || '-', nis: r.students?.nis || '-', kelas: r.students?.classes?.name || '-',
  }));
  return { rows };
});

// Body: { ids: [id akun, ...], action: 'setujui' | 'tolak' }
export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const { ids, action } = await req.json();
  if (!['setujui', 'tolak'].includes(action)) throw new HttpError(400, 'Aksi tidak valid');
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x))) {
    throw new HttpError(400, 'Daftar akun tidak valid');
  }
  const status = action === 'setujui' ? 'disetujui' : 'ditolak';
  const rows = must(await db().from('student_accounts')
    .update({ approval_status: status, approved_at: new Date().toISOString() })
    .in('id', ids).neq('approval_status', status)
    .select('id,username'));
  await audit(admin, action === 'setujui' ? 'SETUJUI_AKUN_SISWA' : 'TOLAK_AKUN_SISWA', `${rows.length} akun: ${rows.map((r) => r.username).join(', ')}`.slice(0, 480), req);
  return { ok: true, count: rows.length };
});