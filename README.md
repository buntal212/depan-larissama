# Larisama

Frontend PWA untuk membantu warung makan dan angkringan mengelola menu dan mencatat transaksi. Aplikasi terhubung ke API Larisama melalui `VITE_API_BASE_URL`; backend dan database dijalankan terpisah oleh tim backend.

## Teknologi

- Vue 3 dan Quasar CLI dengan Vite
- Quasar PWA mode dan Workbox
- Sesi bearer token disimpan di `localStorage`; data operasional diambil dari API

## Prasyarat

- Node.js 22.22 atau lebih baru (Node 22.23.3 sudah sesuai)
- npm yang disertakan bersama Node.js

Di Windows PowerShell, gunakan `npm.cmd`. Jika ada beberapa versi Node, pilih Node 22.23.3 untuk sesi terminal ini:

```powershell
$nodeDir = Join-Path $env:LOCALAPPDATA 'nvm\v22.23.3'
$env:PATH = "$nodeDir;$env:PATH"
node --version
npm.cmd --version
```

## Menjalankan dari clone Git bersih

Pastikan API PHP berjalan dan database sudah disiapkan. Konfigurasi alamat API pada `.env`:

```powershell
cd depan-larissama
npm.cmd ci
npm.cmd run dev -- --mode pwa
```

Buka URL yang ditampilkan Quasar (default `http://localhost:9000`). Hentikan server dengan `Ctrl+C`.

Untuk membangun berkas PWA produksi:

```powershell
npm.cmd run build -- --mode pwa
```

Hasil build berada di `dist/pwa`. Sajikan melalui HTTP/HTTPS untuk mencoba instalasi PWA dan service worker; jangan membuka `index.html` langsung dari `file://`.

## Fungsi prototipe

- Dashboard, katalog, kasir, riwayat penjualan, pembelian, laporan, pengguna, dan pendaftaran warung menggunakan endpoint API yang berstatus siap untuk frontend.
- Login menggunakan username/password API; role dipakai untuk mengatur navigasi dan aksi di UI, sementara otorisasi tetap tanggung jawab backend.
- Kasir mengirim ID menu, jumlah, pembayaran, dan `Idempotency-Key`; nama/harga serta total final berasal dari response server.
- Pembelian mendukung bentuk nominal ringkas dan rincian qty/satuan/harga sesuai schema API.
- Profil warung bersifat baca-saja sampai API menyediakan endpoint edit profil/upload logo.

Jika API gagal, halaman menampilkan pesan kegagalan dan tidak menganggap data yang belum termuat sebagai nominal nol. Token sesi disimpan pada key `larisama-access-token-v1`.

## Struktur frontend

Halaman dikelompokkan berdasarkan fitur di `src/pages/<NamaFitur>/`. Komponen khusus fitur ditempatkan di subfolder `components` milik fitur tersebut. Contohnya, `src/pages/MenuKategori/` berisi halaman katalog dan komponen pengelolaan kategori. Komponen yang digunakan lintas fitur, seperti `ProductCard` dan `ProductFormDialog` yang dipakai Dashboard serta Menu & Kategori, tetap berada di `src/components/`.

## Konfigurasi

Salin `.env.example` menjadi `.env` dan sesuaikan `VITE_API_BASE_URL` dengan host API yang berjalan pada mesin Anda. Untuk backend lokal via `php artisan serve`, nilai bawaan development mengarah ke `http://localhost:8000/api/v1`.

## Pemeriksaan dasar

```powershell
npm.cmd run lint:check
npm.cmd run build -- --mode pwa
```
