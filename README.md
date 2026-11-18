# PRESENSI SMART ISLAMIC
Sistem presensi **Salat Zuhur & Wirid Remaja** berbasis **Face Recognition** — Next.js 14 + Supabase + face-api.js + PWA.
Untuk skripsi: *"Efektivitas Sistem Presensi Salat Zuhur dan Wirid Remaja Berbasis Face Recognition terhadap Kedisiplinan Ibadah Siswa di SMKN 1 Ranah Ampek Hulu Tapan."*

## Isi paket
| Fitur | Status |
|---|---|
| Login admin (bcrypt, JWT httpOnly, rate limit, cek Origin) | ✅ |
| CRUD siswa, impor/ekspor Excel, foto & status wajah | ✅ |
| Kelas, jurusan, tahun ajaran | ✅ |
| Pendaftaran wajah (3–8 sampel, cek 1 wajah/cahaya/posisi, persetujuan biometrik, embedding terenkripsi AES-256-GCM) | ✅ |
| Presensi wajah (deteksi → liveness kedip → embedding → pencocokan di server → simpan) | ✅ |
| Anti presensi ganda (UNIQUE session+siswa), waktu dari server | ✅ |
| Suara otomatis Bahasa Indonesia (Web Speech API) + volume/kecepatan/tes | ✅ |
| Jadwal & sesi Zuhur/Wirid terpisah, status hadir/terlambat/izin/sakit/tidak hadir | ✅ |
| Verifikasi/input manual admin (cadangan) | ✅ |
| Dashboard + 6 grafik dari data asli | ✅ |
| Laporan harian…tahunan, filter, Excel, cetak/PDF | ✅ |
| WhatsApp Cloud API resmi (template, riwayat, kirim ulang) | ✅ mode simulasi sampai token diisi |
| AI Chatbot (rule-based + Claude API opsional) | ✅ mode aturan sampai API key diisi |
| PWA (ikon, splash, installable), responsif HP/tablet/PC | ✅ |
| Audit log, log pengenalan wajah, backup, hapus data biometrik | ✅ |

## Mulai cepat (Windows)
1. Install **Node.js 20 LTS** dan editor (VS Code).
2. Buat project di https://supabase.com → **SQL Editor** → tempel isi `sql/schema.sql` → **Run**.
3. Buka folder ini di terminal:
   ```
   npm install
   copy .env.example .env.local
   npm run gen-keys        (salin 2 baris hasilnya ke .env.local)
   ```
4. Isi `.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → *service_role*), `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
5. `npm run seed-admin` lalu `npm run dev` → buka http://localhost:3000
6. Login admin → **Kelas & Jurusan** (buat jurusan, tahun ajaran, kelas) → **Data Siswa** → daftarkan wajah → buka **/presensi**.

Panduan lengkap: `docs/`. Uji di HP wajib HTTPS (lihat `docs/03-PENGUJIAN.md`).

## Perintah
`npm run dev` · `npm run dev:https` · `npm run build` · `npm start` · `npm test` · `npm run seed-admin` · `npm run backup` · `npm run gen-keys`
