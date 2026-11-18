import { db, must } from '@/lib/db';
import { handle, HttpError, clientIp } from '@/lib/http';
import { getSettings } from '@/lib/settings';
import { matchDescriptor } from '@/lib/face';
import { nowParts, ACTIVITY_LABEL, STATUS_LABEL, dateID, timeID } from '@/lib/time';
import { notifyParent } from '@/lib/wa';
import { audit } from '@/lib/log';

export const dynamic = 'force-dynamic';
const log = (row) => db().from('recognition_logs').insert(row).then(() => {}, () => {});

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  // Pembatasan percobaan: maks 40 permintaan / menit / IP
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db().from('recognition_logs').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since);
  if ((count || 0) >= 40) throw new HttpError(429, 'Terlalu banyak percobaan. Tunggu sebentar.');

  const { descriptor, activity, liveness } = await req.json();
  if (!['zuhur', 'wirid'].includes(activity)) throw new HttpError(400, 'Kegiatan tidak valid');
  if (!Array.isArray(descriptor) || descriptor.length !== 128 || descriptor.some((x) => typeof x !== 'number' || !isFinite(x))) throw new HttpError(400, 'Data wajah tidak valid');
  if (liveness !== true) { await log({ ip, activity, result: 'liveness' }); return { result: 'liveness', message: 'Pemeriksaan keaslian wajah (kedip) belum lolos.' }; }

  const now = nowParts(); // waktu SERVER
  const { data: existing } = await db().from('attendance_sessions').select('*').eq('activity', activity).eq('session_date', now.date).maybeSingle();
  let times = existing;
  if (existing) {
    if (!existing.is_open) { await log({ ip, activity, result: 'closed' }); return { result: 'closed', message: 'Sesi presensi ini ditutup oleh admin.' }; }
  } else {
    const { data: sc } = await db().from('attendance_settings').select('*').eq('activity', activity).maybeSingle();
    if (!sc || !sc.is_active || !sc.active_days.includes(now.dow)) { await log({ ip, activity, result: 'closed' }); return { result: 'closed', message: `Tidak ada jadwal ${ACTIVITY_LABEL[activity]} hari ini.` }; }
    times = sc;
  }
  if (now.time < times.start_time) { await log({ ip, activity, result: 'closed' }); return { result: 'closed', message: `Presensi ${ACTIVITY_LABEL[activity]} dibuka pukul ${times.start_time.slice(0, 5)} WIB.` }; }
  if (now.time > times.end_time) { await log({ ip, activity, result: 'closed' }); return { result: 'closed', message: `Presensi ${ACTIVITY_LABEL[activity]} sudah ditutup (${times.end_time.slice(0, 5)} WIB).` }; }

  const s = await getSettings();
  const m = await matchDescriptor(descriptor, Number(s.face_threshold || 0.5), Number(s.face_margin || 0.04));
  if (!m.matched) { await log({ ip, activity, result: 'unknown', distance: m.distance ?? null }); return { result: 'unknown', message: 'WAJAH TIDAK DIKENALI. SILAKAN COBA KEMBALI.' }; }

  const student = must(await db().from('students').select('id,nis,full_name,photo,classes(name),departments(name)').eq('id', m.student_id).single());

  let session = existing;
  if (!session) {
    const ins = await db().from('attendance_sessions').insert({ activity, session_date: now.date, start_time: times.start_time, late_time: times.late_time, end_time: times.end_time }).select().single();
    if (ins.error) session = must(await db().from('attendance_sessions').select('*').eq('activity', activity).eq('session_date', now.date).single());
    else session = ins.data;
  }

  const status = now.time <= session.late_time ? 'hadir' : 'terlambat';
  const view = { nama: student.full_name, nis: student.nis, kelas: student.classes?.name || '-', jurusan: student.departments?.name || '-', photo: student.photo, kegiatan: ACTIVITY_LABEL[activity], tanggal: dateID(now.date) };

  const { data: rec, error } = await db().from('attendance_records').insert({
    session_id: session.id, student_id: student.id, status, method: 'face', confidence: Math.round((1 - m.distance) * 1000) / 1000, checked_at: now.iso,
  }).select().single();

  if (error) {
    if (error.code === '23505') {
      const { data: old } = await db().from('attendance_records').select('status,checked_at').eq('session_id', session.id).eq('student_id', student.id).single();
      await log({ ip, activity, result: 'duplicate', student_id: student.id, distance: m.distance });
      return { result: 'duplicate', message: 'ANDA SUDAH MELAKUKAN PRESENSI PADA KEGIATAN INI.', student: view, status: old?.status, waktu: old ? timeID(old.checked_at) : null };
    }
    throw new Error(error.message);
  }

  await log({ ip, activity, result: 'success', student_id: student.id, distance: m.distance });
  await audit(null, 'PRESENSI_WAJAH', `${student.nis} ${activity} ${status}`, req);
  await notifyParent({ student, className: view.kelas, activity, session_date: now.date, checked_at: rec.checked_at, status, record_id: rec.id });

  const speech = (s.tts_template || '').replace('{nama}', student.full_name).replace('{kelas}', view.kelas)
    .replace('{kegiatan}', ACTIVITY_LABEL[activity]).replace('{status}', status === 'hadir' ? 'hadir' : 'terlambat');
  return { result: 'ok', student: view, status, status_label: STATUS_LABEL[status], waktu: timeID(rec.checked_at), speech };
});
