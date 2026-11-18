# 3. Panduan Pengujian

> Jangan menulis "mendukung semua perangkat" di skripsi sebelum kolom *Hasil* di bawah terisi dari uji nyata.

## A. Uji fungsional (centang saat lulus)
| No | Uji | Langkah | Harapan | Hasil |
|---|---|---|---|---|
| 1 | Login | salah password 5× | diblokir 5 menit | |
| 2 | CRUD siswa | tambah/ubah/hapus/impor Excel | data tersimpan, NIS ganda ditolak | |
| 3 | Daftar wajah | tanpa centang persetujuan | ditolak | |
| 4 | Daftar wajah | 2 wajah di kamera / gelap | tombol ambil nonaktif + pesan | |
| 5 | Presensi | siswa terdaftar kedip | hasil hijau + suara + data tersimpan | |
| 6 | Presensi ganda | ulangi pada sesi sama | "SUDAH MELAKUKAN PRESENSI", baris tetap 1 | |
| 7 | Wajah asing | orang tidak terdaftar | "WAJAH TIDAK DIKENALI" | |
| 8 | Di luar jam | di luar jadwal | pesan ditutup/belum dibuka | |
| 9 | Terlambat | setelah jam terlambat | status TERLAMBAT | |
| 10 | Manual | Rekap → ubah status | tersimpan, metode "Manual" | |
| 11 | Laporan | bandingkan dengan hitung manual 1 siswa | angka sama | |
| 12 | WhatsApp | mode simulasi → log "simulasi"; token asli → pesan masuk | | |
| 13 | Chatbot | 6 pertanyaan contoh | jawaban sesuai dashboard | |
| 14 | Hapus wajah | Detail siswa → hapus | presensi wajah ditolak sampai daftar ulang | |

## B. Uji anti-spoofing
Foto cetak, foto di layar HP, video rekaman di layar. Catat berapa percobaan lolos/ditolak. **Keterbatasan jujur:** liveness kedip menolak foto statis, tetapi *video replay* kedipan bisa lolos. Untuk menekan risiko: kiosk didampingi guru, kamera terpasang tetap, dan log pengenalan wajah ditinjau. Tulis ini di bab pembahasan/keterbatasan.

## C. Kalibrasi threshold (penting untuk akurasi skripsi)
1. Siapkan ≥ 20 siswa terdaftar. Tiap siswa dites 5× (genuine) dan dicoba oleh siswa lain (impostor).
2. Lihat `Log Aktivitas → Pengenalan Wajah` (kolom *jarak*).
3. Hitung **FAR** (impostor diterima), **FRR** (genuine ditolak), **akurasi**; ubah `Threshold` di Pengaturan (0,45–0,55) hingga FAR sekecil mungkin dengan FRR wajar.
4. Uji variasi: cahaya terang/redup, kacamata, peci/hijab, jarak 40–80 cm.

## D. Perangkat
| Perangkat | Browser | Kamera depan | Suara | PWA | Responsif | Catatan |
|---|---|---|---|---|---|---|
| PC Windows | Chrome / Edge | | | | | localhost boleh HTTP |
| Android | Chrome | | | | | wajib HTTPS |
| iPhone | Safari | | | | | wajib HTTPS; suara butuh tap tombol mulai |
| Tablet Android | Chrome | | | | | |
| iPad | Safari | | | | | |

## E. Uji otomatis
`npm test` — enkripsi embedding, pencocokan (cocok/jauh/ambigu), template WA, normalisasi nomor.

## F. Uji presensi ganda di database
`select session_id, student_id, count(*) from attendance_records group by 1,2 having count(*)>1;` → harus 0 baris.
