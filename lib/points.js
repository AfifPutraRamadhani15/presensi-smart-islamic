import { nowParts } from './time';

// Aturan poin (harus SAMA dengan fungsi SQL semester_points di sql/patch-poin.sql)
//   +3 hadir lewat wajah dalam EARLY_MIN menit pertama sejak sesi dibuka
//   +2 hadir sebelum batas terlambat (atau hadir diinput manual admin)
//   +1 terlambat | 0 izin/sakit | -1 alfa (sesi yang sudah selesai)
export const EARLY_MIN = 15;

// Semester Ganjil: 1 Juli – 31 Des | Semester Genap: 1 Jan – 30 Jun. Poin otomatis "reset" tiap semester baru.
export function semesterRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  if (m >= 7) return { from: `${y}-07-01`, to: `${y}-12-31`, label: `Semester Ganjil ${y}/${y + 1}` };
  return { from: `${y}-01-01`, to: `${y}-06-30`, label: `Semester Genap ${y - 1}/${y}` };
}

const sec = (t) => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + (s || 0); };

export function pointsFor({ status, method, checked_at, start_time }) {
  if (status === 'hadir') {
    if (method === 'face' && checked_at) {
      const wib = nowParts(new Date(checked_at)).time;
      if (sec(wib) <= sec(start_time) + EARLY_MIN * 60) return 3;
    }
    return 2;
  }
  if (status === 'terlambat') return 1;
  if (status === 'izin' || status === 'sakit') return 0;
  return -1; // tidak_hadir / alfa
}