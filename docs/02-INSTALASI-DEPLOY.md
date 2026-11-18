# 2. Instalasi, Deploy, HTTPS, Backup

## Lokal (Windows)
Lihat `README.md`. Jika `npm install` lambat, gunakan jaringan stabil (±100 paket).

## Deploy Vercel (HTTPS otomatis — diperlukan kamera di HP)
1. Unggah proyek ke GitHub (`.env.local` sudah di-ignore).
2. vercel.com → *Add New Project* → pilih repo → Framework: Next.js.
3. *Environment Variables*: salin semua isi `.env.local` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET, FACE_ENC_KEY, WA_*, AI_*). **Jangan** ubah FACE_ENC_KEY setelah ada data wajah.
4. Deploy. Jalankan `npm run seed-admin` dari laptop (memakai .env.local yang sama) bila admin belum dibuat.
5. Buka `https://namaproyek.vercel.app/presensi` di HP → menu browser → **Tambahkan ke layar utama** (PWA).

## HTTPS lokal untuk uji HP (tanpa deploy)
- `npm run dev:https` lalu buka `https://IP-LAPTOP:3000` di HP (satu Wi-Fi). Sertifikat lokal perlu dipercaya; atau
- pakai tunnel (mis. Cloudflare Tunnel `cloudflared tunnel --url http://localhost:3000`) → dapat URL HTTPS publik sementara.
- `http://IP-LAPTOP:3000` **tidak bisa** memakai kamera di HP (aturan browser), hanya `localhost` di laptop.
- Firewall Windows: izinkan Node.js pada jaringan Private.

## Backup
`npm run backup` → folder `backups/<waktu>/` berisi JSON semua tabel (embedding tetap terenkripsi). Simpan di tempat aman. Supabase juga menyediakan backup (paket berbayar) dan fitur export di dashboard.
Pulihkan: impor JSON via SQL/`supabase-js` (urutan: master → siswa → face_data → sesi → records). **Simpan FACE_ENC_KEY** bersama backup, tanpa itu embedding tak bisa dibuka (cukup daftar ulang wajah).

## APK Android & iOS
- **Direkomendasikan: PWA** (sudah ada). Install dari Chrome (Android) / Safari → Bagikan → Tambah ke Layar Utama (iOS).
- **APK Android**: bungkus PWA dengan **Bubblewrap/TWA** (`npx @bubblewrap/cli init --manifest https://domain/manifest.json`) atau Capacitor. Bisa dibuat di Windows. Butuh domain HTTPS.
- **iOS native**: build & publikasi App Store **mewajibkan macOS + Xcode + Apple Developer (US$99/thn)**. Tidak perlu pada tahap skripsi — PWA di Safari sudah cukup.
