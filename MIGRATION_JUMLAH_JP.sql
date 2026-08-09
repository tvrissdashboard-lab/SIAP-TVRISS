-- Jalankan di Supabase SQL Editor SEBELUM deploy versi baru aplikasi.
-- Menambahkan kolom "jumlah_jp" (Jumlah Jam Pelatihan) yang sebelumnya tidak ada sama sekali.

ALTER TABLE pengajuan_pelatihan ADD COLUMN IF NOT EXISTS jumlah_jp integer;
ALTER TABLE sertifikat_pelatihan ADD COLUMN IF NOT EXISTS jumlah_jp integer;
