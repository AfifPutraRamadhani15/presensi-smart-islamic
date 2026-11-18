const TZ = 'Asia/Jakarta';

export function nowParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dowMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
    dow: dowMap[p.weekday],
    iso: d.toISOString(),
  };
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export function dateID(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}
export function timeID(iso) {
  const f = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return f.format(new Date(iso)).replace(':', '.') + ' WIB';
}
export const ACTIVITY_LABEL = { zuhur: 'Salat Zuhur', wirid: 'Wirid Remaja' };
export const STATUS_LABEL = { hadir: 'HADIR', terlambat: 'TERLAMBAT', izin: 'IZIN', sakit: 'SAKIT', tidak_hadir: 'TIDAK HADIR' };
