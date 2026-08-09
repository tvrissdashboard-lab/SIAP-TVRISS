# Ringkasan Perbaikan SIAP TVRI Sumsel

## Yang WAJIB Anda lakukan sebelum deploy

1. **Jalankan migrasi SQL** di Supabase SQL Editor (isi file `MIGRATION_JUMLAH_JP.sql`):
   ```sql
   ALTER TABLE pengajuan_pelatihan ADD COLUMN IF NOT EXISTS jumlah_jp integer;
   ALTER TABLE sertifikat_pelatihan ADD COLUMN IF NOT EXISTS jumlah_jp integer;
   ```
   Tanpa ini, kolom "Jumlah JP" tidak akan tersimpan.
2. `npm install` (paket baru: `jspdf`, `jspdf-autotable`, `@emailjs/browser`).
3. Salin `.env.example` → `.env` dan isi `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` seperti biasa.

## 1. Tombol Kirim Email — SEKARANG BERFUNGSI NYATA
- Selama ini tombol hanya `setTimeout` palsu.
- Sekarang: jika Anda mengisi `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` di `.env` (daftar gratis di emailjs.com), email terkirim otomatis di background.
- **Jika belum diisi**, tombol tetap berfungsi: otomatis membuka aplikasi email default pengguna dengan subjek & isi surat sudah lengkap — tinggal klik "Kirim".

## 2. Download PDF Palsu (.txt) — SEKARANG PDF ASLI
- Portofolio pelatihan & ringkasan sertifikat sekarang dibuat dengan `jsPDF`: kop surat memakai logo TVRI asli, tabel rapi, nomor halaman — file `.pdf` biner sungguhan.
- Jika sertifikat asli sudah diunggah pegawai, tombol download akan mengunduh **file asli** tersebut, bukan ringkasan.

## 3. Panel Detail Status Pelatihan Terpotong — DIPERBAIKI
- Penyebabnya bug CSS klasik (`flex items-center` dipasang bareng `overflow-y-auto` pada elemen yang sama, sehingga bagian atas konten yang panjang tidak bisa di-scroll).
- Sudah diperbaiki di modal detail pengajuan, modal cetak surat, dan modal rekap bulanan.

## 4. Tombol Preview — DIPERBAIKI
- Sebelumnya menampilkan kartu gelap dengan logo TVRI palsu (kotak biru bertuliskan "TVRI").
- Sekarang: bila berkas asli sudah diunggah, preview menampilkan **file aslinya langsung** (PDF/gambar). Bila belum ada berkas, tampil ringkasan resmi bergaya kop surat terang dengan logo TVRI asli — bukan lagi kartu gelap ala tangkapan layar.

## 5. Ekspor Backup Data — SEKARANG DATA ASLI
- Sebelumnya membaca `localStorage` yang sudah tidak dipakai lagi (aplikasi ini memakai Supabase) — hasilnya file JSON isinya kosong semua.
- Sekarang mengambil langsung dari Supabase: pegawai, pengajuan, sertifikat, riwayat approval, audit log, akses Kepala Stasiun.

## 6. Reset Factory Default — Penjelasan & Cara Mengaktifkan
- Dinonaktifkan **dengan sengaja** karena akan menghapus permanen seluruh data produksi (pegawai, pengajuan, sertifikat) di database Supabase.
- Cara mengaktifkan: tambahkan `VITE_ENABLE_FACTORY_RESET=true` di `.env`, lalu build ulang. Set kembali ke `false` (atau hapus) untuk menonaktifkan.
- Saat aktif, tombol akan meminta Anda mengetik `RESET` sebagai konfirmasi sebelum benar-benar menghapus data — agar tidak terklik tidak sengaja.

## 7. Kolom Jumlah JP — DITAMBAHKAN
- Sebelumnya **tidak ada sama sekali** field JP di sistem. Angka "Total Jam Pelatihan" yang tampil di portofolio adalah rumus asal-asalan: `totalPelatihan × 24` (asumsi semua pelatihan 24 jam, padahal belum tentu).
- Sekarang ada field "Jumlah JP (Jam Pelatihan)" di form pengajuan pelatihan — pegawai mengisi sendiri sesuai surat undangan/sertifikat.
- Untuk data lama yang belum mengisi JP, sistem memakai estimasi standar 8 JP/hari pelaksanaan (bukan lagi 24 jam per pelatihan).

## 8. Tampilan PDF Rekap Bulanan — SEBAGIAN DIPERBAIKI, SEBAGIAN PERLU DIATUR DI BROWSER
- **Border/shadow aneh di sekeliling tabel**: sudah dihilangkan — saat mencetak, margin langsung berbatasan dengan tabel.
- **Tulisan URL & jam (mis. "8/8/26, 5:23 PM ... https://...")**: itu bukan dari aplikasi, melainkan **header/footer bawaan browser Chrome/Edge** saat mencetak. Cara mematikannya:
  1. Klik "Cetak / Download PDF" di aplikasi.
  2. Di jendela cetak, klik **"More settings"**.
  3. Matikan opsi **"Headers and footers"**.
  4. Pastikan ukuran kertas A4 dan margin "Default"/"Normal", lalu simpan sebagai PDF.
  
  Saya sudah menambahkan tips ini langsung di dalam modal Rekap Bulanan agar terlihat oleh Admin SDM.
