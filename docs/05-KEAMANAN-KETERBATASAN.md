# 5. Keamanan & Keterbatasan

## Yang diterapkan
bcrypt (cost 12) · JWT httpOnly + SameSite + Secure (produksi), 8 jam · batas login 5×/5 menit/IP (in-memory, per instance) · cek Origin untuk non-GET · semua query lewat Supabase client (parameterisasi) · React meng-escape output (XSS) · validasi input & ukuran upload (foto ≤80 KB, logo ≤200 KB) · RLS aktif tanpa policy (anon key tak bisa baca) · service-role key hanya di server · embedding AES-256-GCM · batas 40 permintaan/menit/IP pada `/api/presensi/recognize` (berdasar `recognition_logs`) · audit log admin · header keamanan (X-Frame-Options, nosniff, Permissions-Policy kamera) · hak penghapusan data biometrik · form persetujuan `/persetujuan`.

## Keterbatasan (jujur)
1. **Liveness kedip tidak kebal terhadap video replay / topeng.** Untuk risiko tinggi tambahkan pengawasan guru atau verifikasi manual.
2. `/api/presensi/recognize` **publik** (siswa tak punya akun). Penyerang yang memiliki vektor embedding valid bisa memanggilnya langsung; mitigasi: rate limit, log, dan hanya mengakui presensi dalam jendela jadwal. Peningkatan: PIN/token perangkat kiosk (belum ada).
3. Rate limit login berada di memori per instance serverless (best effort). Untuk produksi ketat gunakan Upstash/Redis.
4. Akurasi face-api.js menurun pada cahaya buruk, wajah sangat mirip (kembar), atau posisi ekstrem. Kalibrasi threshold (lihat 03-PENGUJIAN).
5. Foto profil disimpan sebagai data URL kecil di tabel `students` (praktis untuk skala sekolah); jika data besar pindahkan ke Supabase Storage.
6. `izin/sakit/tidak hadir` otomatis dihitung dari selisih sesi, kecuali admin menginput manual; sesi baru terbentuk saat presensi pertama atau dibuat admin.
7. Fitur PDF = cetak browser ("Simpan sebagai PDF"), bukan generator PDF di server.
8. Dukungan perangkat belum diuji oleh pembuat — lihat tabel uji.
9. Pelindungan data pribadi (UU PDP No. 27/2022): konsultasikan kebijakan retensi & persetujuan dengan pihak sekolah/pembimbing.
