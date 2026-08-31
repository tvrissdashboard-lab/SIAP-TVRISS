-- Jalankan SEKALI di Supabase SQL Editor sebelum deploy versi baru aplikasi.
-- Tabel kecil untuk menyimpan setting on/off yang bisa diubah dari halaman
-- Pengaturan System tanpa perlu edit kode / deploy ulang.

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- Nilai awal: batasan tanggal mundur AKTIF (perilaku normal seperti sekarang)
INSERT INTO app_settings (key, value)
VALUES ('ALLOW_BACKDATE_SUBMISSION', 'false')
ON CONFLICT (key) DO NOTHING;
