import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Formulir Persetujuan Data Biometrik' };

export default async function Persetujuan() {
  let s = {}; try { s = await getSettings(); } catch {}
  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen text-sm leading-relaxed">
      <h1 className="text-xl font-extrabold text-center">FORMULIR PEMBERITAHUAN DAN PERSETUJUAN<br />PENGGUNAAN DATA BIOMETRIK (WAJAH)</h1>
      <p className="text-center mb-4">{s.school_name || 'SMKN 1 Ranah Ampek Hulu Tapan'} — Sistem {s.app_name || 'Presensi Smart Islamic'}</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li><b>Data yang diproses:</b> identitas siswa (NIS, nama, kelas), foto wajah untuk profil, dan <i>face embedding</i> (representasi numerik wajah), serta riwayat presensi.</li>
        <li><b>Tujuan:</b> pencatatan presensi Salat Zuhur dan Wirid Remaja, pelaporan kedisiplinan ibadah, pemberitahuan kepada orang tua/wali, serta bahan penelitian skripsi (data dianonimkan pada publikasi).</li>
        <li><b>Penyimpanan & keamanan:</b> embedding dienkripsi (AES-256-GCM), akses dibatasi hanya untuk admin, dan tidak dibagikan kepada pihak ketiga selain penyedia infrastruktur (basis data) yang diperlukan.</li>
        <li><b>Masa simpan:</b> selama siswa terdaftar aktif. Setelah lulus/pindah, data biometrik dihapus paling lambat 30 hari.</li>
        <li><b>Hak:</b> siswa/orang tua berhak meminta akses, perbaikan, dan penghapusan data biometrik kapan saja dengan menghubungi admin sekolah; presensi dapat dialihkan ke verifikasi manual tanpa sanksi.</li>
        <li><b>Dasar hukum:</b> pemrosesan dilakukan atas persetujuan sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (persetujuan orang tua/wali untuk siswa di bawah 18 tahun).</li>
      </ol>
      <p className="mt-4 italic text-xs">Catatan: sesuaikan redaksi dengan kebijakan sekolah dan konsultasikan dengan pihak berwenang bila diperlukan.</p>
      <div className="grid grid-cols-2 gap-8 mt-10 text-center">
        <div>Orang Tua/Wali<br /><br /><br /><br />(............................)</div>
        <div>Siswa<br /><br /><br /><br />(............................)<br />Nama / NIS / Kelas: ......................</div>
      </div>
      <p className="mt-6 text-center">Tapan, ....................... 20....</p>
    </main>
  );
}
