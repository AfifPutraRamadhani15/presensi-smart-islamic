import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';

// >>> SESUAIKAN nama kolom ini dengan tabel students di sql/schema.sql <<<
const COL = {
  table: 'students',
  nis: 'nis',
  name: 'full_name',
  classId: 'class_id',
  active: 'active',
  photo: 'photo_url',
  face: 'face_descriptor',
};

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    const { data, error } = await db().from('classes').select('id,name').order('name');
    if (error) throw error;
    return NextResponse.json({ classes: data || [], needCode: !!process.env.REGISTER_CODE });
  } catch (e) {
    return bad(e.message || 'Gagal memuat kelas', 500);
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const nis = String(b.nis || '').trim();
    const nama = String(b.nama || '').trim().replace(/\s+/g, ' ');
    const classId = b.class_id;
    const password = String(b.password || '');
    const d = b.descriptor;

    if (process.env.REGISTER_CODE && String(b.kode || '').trim() !== process.env.REGISTER_CODE) {
      return bad('Kode pendaftaran salah.', 403);
    }
    if (!/^[0-9A-Za-z.\-]{4,20}$/.test(nis)) return bad('NIS tidak valid (4-20 karakter, huruf/angka).');
    if (nama.length < 3 || nama.length > 80) return bad('Nama lengkap tidak valid.');
    if (!classId) return bad('Pilih kelas terlebih dahulu.');
    if (password.length < 6 || password.length > 72) return bad('Password minimal 6 karakter.');
    if (!Array.isArray(d) || d.length !== 128 || !d.every((x) => Number.isFinite(x))) {
      return bad('Data wajah tidak valid. Ambil wajah ulang.');
    }
    const photo = typeof b.photo === 'string' && b.photo.startsWith('data:image/jpeg;base64,') && b.photo.length < 200_000 ? b.photo : null;

    const sb = db();
    const { data: exist, error: e1 } = await sb.from(COL.table).select('id').eq(COL.nis, nis).maybeSingle();
    if (e1) throw e1;
    if (exist) return bad('NIS ini sudah terdaftar. Hubungi admin jika ada kesalahan.', 409);

    const row = {
      [COL.nis]: nis,
      [COL.name]: nama,
      [COL.classId]: classId,
      [COL.active]: true,
      [COL.face]: d,
    };
    if (photo) row[COL.photo] = photo;

    const { data: created, error: e2 } = await sb.from(COL.table).insert(row).select('id').single();
    if (e2) throw e2;

    const { error: e3 } = await sb.from('student_accounts').insert({ student_id: created.id, password_hash: hashPassword(password) });
    if (e3) {
      await sb.from(COL.table).delete().eq('id', created.id); // batalkan agar tidak ada siswa tanpa akun
      throw e3;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e.message || 'Gagal menyimpan pendaftaran', 500);
  }
}