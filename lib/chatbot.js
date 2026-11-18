import { dashboardData } from './stats';
import { buildReport } from './report';
import { nowParts, addDays, ACTIVITY_LABEL } from './time';
import { getSettings } from './settings';

export async function snapshot() {
  const now = nowParts();
  const d = await dashboardData();
  const from = addDays(now.date, -29);
  const rep = await buildReport({ activity: 'all', from, to: now.date });
  const absentees = rep.rows.filter((r) => r.sesi > 0).sort((a, b) => b.tidak_hadir - a.tidak_hadir).slice(0, 10)
    .filter((r) => r.tidak_hadir > 0);
  return { now, d, rep, absentees, from };
}

const n = (x) => new Intl.NumberFormat('id-ID').format(x);

function ruleAnswer(q, S, settings) {
  const t = q.toLowerCase();
  const { d, absentees, rep } = S;
  const act = t.includes('wirid') ? 'wirid' : t.includes('zuhur') || t.includes('zhuhur') ? 'zuhur' : null;

  if (/pesan|wa\b|whatsapp|orang tua|ortu/.test(t)) {
    return 'Template pesan orang tua (ubah di menu WhatsApp → Template):\n\n' +
      'Assalamu\'alaikum Wr. Wb.\nYth. Bapak/Ibu Orang Tua/Wali. Kami informasikan bahwa siswa {nama} (NIS {nis}, kelas {kelas}) telah melakukan presensi {kegiatan} pada {tanggal} pukul {waktu} dengan status {status}. Terima kasih. Wassalamu\'alaikum Wr. Wb.\n\nPengiriman otomatis mengikuti aturan di menu Pengaturan.';
  }
  if (/hari ini|sekarang/.test(t) && /hadir|berapa/.test(t)) {
    const parts = (act ? [act] : ['zuhur', 'wirid']).map((a) => {
      const x = d.today[a];
      return x.has_session ? `${ACTIVITY_LABEL[a]}: hadir ${n(x.hadir)}, terlambat ${n(x.terlambat)}, izin/sakit ${n(x.izin)}, belum/tidak hadir ${n(x.tidak_hadir)}` : `${ACTIVITY_LABEL[a]}: belum ada sesi hari ini`;
    });
    return `Data hari ini (${S.now.date}), dari ${n(d.totals.active)} siswa aktif:\n` + parts.join('\n');
  }
  if (/kelas/.test(t) && /(tertinggi|terbaik|paling tinggi|terendah|paling rendah)/.test(t)) {
    const list = d.perClass.filter((c) => c.size > 0);
    if (!list.length) return 'Belum ada data kelas/siswa.';
    const low = /(terendah|paling rendah)/.test(t);
    const c = low ? list[list.length - 1] : list[0];
    return `Kelas dengan kehadiran ${low ? 'terendah' : 'tertinggi'} bulan ini: ${c.name} (${c.pct}%).`;
  }
  if (/sering|tidak hadir|alpa|bolos|jarang/.test(t)) {
    if (!absentees.length) return 'Dalam 30 hari terakhir tidak ada siswa dengan ketidakhadiran tercatat (atau belum ada sesi).';
    return `Siswa dengan ketidakhadiran terbanyak 30 hari terakhir (${rep.sessionCount} sesi):\n` +
      absentees.map((r, i) => `${i + 1}. ${r.nama} (${r.kelas}) — tidak hadir ${r.tidak_hadir}x, kehadiran ${r.persen}%`).join('\n') +
      '\n\nRekomendasi: hubungi orang tua/wali dan wali kelas untuk siswa dengan kehadiran di bawah 75%.';
  }
  if (/persentase|persen|rata/.test(t) || /bulan/.test(t)) {
    const last = d.discipline.values[5];
    return `Rata-rata persentase kehadiran bulan ini: ${last}% (Salat Zuhur ${n(d.compare.zuhur)} kehadiran, Wirid Remaja ${n(d.compare.wirid)} kehadiran).`;
  }
  if (/ringkas|laporan|rangkum/.test(t)) {
    const tot = rep.rows.length, avg = tot ? Math.round(rep.rows.reduce((a, r) => a + r.persen, 0) / tot * 10) / 10 : 0;
    const low = rep.rows.filter((r) => r.sesi > 0 && r.persen < Number(settings.disc_mid || 75)).length;
    return `Ringkasan 30 hari terakhir (${S.from} s.d. ${S.now.date}), ${rep.sessionCount} sesi:\n- Siswa aktif: ${n(tot)}\n- Rata-rata kehadiran: ${avg}%\n- Siswa di bawah ${settings.disc_mid || 75}%: ${n(low)}\n- Kelas terbaik bulan ini: ${d.perClass[0]?.name || '-'} (${d.perClass[0]?.pct ?? 0}%)`;
  }
  if (/cara|bagaimana|gimana|bantuan|help|fitur/.test(t)) {
    return 'Panduan singkat:\n1) Data Siswa → tambah siswa → Daftarkan Wajah (centang persetujuan).\n2) Buka halaman /presensi di perangkat kiosk, pilih kegiatan.\n3) Atur jadwal di Pengaturan. 4) Lihat Laporan untuk rekap & ekspor.';
  }
  return 'Saya bisa menjawab: kehadiran hari ini, kelas tertinggi/terendah, siswa yang sering tidak hadir, persentase bulan ini, ringkasan laporan, dan contoh pesan orang tua. Aktifkan AI_API_KEY untuk jawaban yang lebih fleksibel.';
}

async function aiAnswer(q, S, settings) {
  const share = settings.ai_share_names === '1';
  const ctx = {
    tanggal: S.now.date, siswa_aktif: S.d.totals.active, hari_ini: S.d.today, persen_hari_ini: S.d.pctToday,
    kelas_bulan_ini: S.d.perClass, kedisiplinan_bulanan: S.d.discipline,
    ketidakhadiran_30_hari: S.absentees.map((r) => ({ siswa: share ? r.nama : `NIS ${r.nis}`, kelas: r.kelas, tidak_hadir: r.tidak_hadir, persen: r.persen })),
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.AI_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 700,
      system: 'Anda ISLAMIC ATTENDANCE AI, asisten admin sekolah untuk presensi Salat Zuhur dan Wirid Remaja. Jawab singkat dalam Bahasa Indonesia. Gunakan HANYA data pada konteks JSON. Jika data tidak ada, katakan tidak tersedia. Jangan mengarang data siswa dan jangan menyimpulkan ketidakhadiran tanpa data.',
      messages: [{ role: 'user', content: `DATA:\n${JSON.stringify(ctx)}\n\nPERTANYAAN ADMIN: ${q}` }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'AI error');
  return j.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') || '';
}

export async function answer(q) {
  const settings = await getSettings();
  const S = await snapshot();
  if (process.env.AI_API_KEY && settings.ai_enabled === '1') {
    try { return { text: await aiAnswer(q, S, settings), mode: 'ai' }; }
    catch (e) { return { text: ruleAnswer(q, S, settings) + `\n\n(AI gagal: ${e.message}; memakai mode aturan)`, mode: 'rule' }; }
  }
  return { text: ruleAnswer(q, S, settings), mode: 'rule' };
}
