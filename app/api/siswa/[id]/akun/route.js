import { db, must } from '@/lib/db';
import { handle, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';
import { genPassword, cleanUsername, checkPassword, hashPassword } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

const dupMsg = (e) => (e.code === '23505' ? 'Username sudah dipakai siswa lain' : e.message);

// action: create | reset | set_password | set_username | toggle | delete
export const POST = handle(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const b = await req.json();
  const st = must(await db().from('students').select('id,nis,full_name').eq('id', params.id).single());
  const { data: acc } = await db().from('student_accounts').select('*').eq('student_id', st.id).maybeSingle();
  const need = () => { if (!acc) throw new HttpError(404, 'Siswa ini belum memiliki akun'); return acc; };

  switch (b.action) {
    case 'create': {
      if (acc) throw new HttpError(409, 'Akun sudah ada');
      const username = cleanUsername(b.username || st.nis);
      const generated = !b.password;
      const password = generated ? genPassword() : b.password;
      if (!generated) checkPassword(password);
      const { error } = await db().from('student_accounts').insert({ student_id: st.id, username, password_hash: await hashPassword(password), must_change: true });
      if (error) throw new HttpError(error.code === '23505' ? 409 : 500, dupMsg(error));
      await audit(admin, 'BUAT_AKUN_SISWA', `${st.nis} → ${username}`, req);
      return { ok: true, username, password: generated ? password : undefined };
    }
    case 'reset': {
      need();
      const password = genPassword();
      must(await db().from('student_accounts').update({ password_hash: await hashPassword(password), must_change: true }).eq('id', acc.id).select());
      await audit(admin, 'RESET_SANDI_SISWA', `${st.nis}`, req);
      return { ok: true, username: acc.username, password };
    }
    case 'set_password': {
      need(); checkPassword(b.password);
      must(await db().from('student_accounts').update({ password_hash: await hashPassword(b.password), must_change: true }).eq('id', acc.id).select());
      await audit(admin, 'ATUR_SANDI_SISWA', `${st.nis}`, req);
      return { ok: true, username: acc.username };
    }
    case 'set_username': {
      need();
      const username = cleanUsername(b.username);
      const { error } = await db().from('student_accounts').update({ username }).eq('id', acc.id);
      if (error) throw new HttpError(error.code === '23505' ? 409 : 500, dupMsg(error));
      await audit(admin, 'UBAH_USERNAME_SISWA', `${st.nis}: ${acc.username} → ${username}`, req);
      return { ok: true, username };
    }
    case 'toggle': {
      need();
      must(await db().from('student_accounts').update({ is_active: !!b.is_active }).eq('id', acc.id).select());
      await audit(admin, b.is_active ? 'AKTIFKAN_AKUN_SISWA' : 'NONAKTIFKAN_AKUN_SISWA', `${st.nis}`, req);
      return { ok: true };
    }
    case 'delete': {
      need();
      must(await db().from('student_accounts').delete().eq('id', acc.id).select());
      await audit(admin, 'HAPUS_AKUN_SISWA', `${st.nis}`, req);
      return { ok: true };
    }
    default: throw new HttpError(400, 'Aksi tidak dikenal');
  }
});