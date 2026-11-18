# 4. Aktivasi WhatsApp Cloud API & AI

## WhatsApp Business Cloud API (resmi Meta)
1. developers.facebook.com → buat App (tipe Business) → tambahkan produk **WhatsApp**.
2. Siapkan **WhatsApp Business Account** + nomor telepon (nomor khusus sekolah; tidak boleh sedang aktif di aplikasi WhatsApp biasa).
3. Salin **Phone Number ID** dan buat **System User permanent token** (Business Settings → System Users, izin `whatsapp_business_messaging`).
4. Isi `.env.local` / env Vercel:
   ```
   WA_TOKEN=...            WA_PHONE_NUMBER_ID=...
   WA_TEMPLATE_NAME=nama_template_disetujui   WA_TEMPLATE_LANG=id
   ```
5. **Template**: pesan yang dimulai oleh sekolah di luar jendela 24 jam *wajib* memakai template yang disetujui Meta. Buat template kategori *Utility* dengan 7 variabel berurutan: `{{1}} nama, {{2}} nis, {{3}} kelas, {{4}} kegiatan, {{5}} tanggal, {{6}} waktu, {{7}} status`. Tanpa `WA_TEMPLATE_NAME`, aplikasi mengirim teks biasa (hanya sampai bila orang tua baru saja menghubungi nomor bisnis).
6. Menu **WhatsApp**: aktifkan notifikasi, pilih kapan dikirim. Pesan hanya dikirim ke orang tua yang dicentang **setuju** di data siswa.
7. Tarif per pesan & aturan opt-in mengikuti kebijakan Meta — periksa sebelum produksi.
Tanpa token: **mode simulasi** (riwayat tercatat, tidak ada pesan keluar).

## AI Chatbot
- Tanpa API key: chatbot **berbasis aturan** (jawab hari ini, kelas tertinggi, sering tidak hadir, persentase, ringkasan, contoh pesan).
- Dengan AI: isi `AI_API_KEY` (Anthropic) & opsional `AI_MODEL`, lalu centang *Gunakan AI eksternal* di Pengaturan.
- Keamanan: AI **tidak punya akses database**. Server hanya mengirim ringkasan agregat (default tanpa nama siswa, hanya NIS). Prompt melarang mengarang data.
