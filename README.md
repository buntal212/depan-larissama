# Larisama

Frontend PWA untuk membantu warung makan dan angkringan mengelola menu dan mencatat transaksi. Versi awal ini memakai data demo di browser; belum terhubung ke API backend.

## Teknologi

- Vue 3 dan Quasar CLI dengan Vite
- Quasar PWA mode dan Workbox
- Data demo disimpan di `localStorage`

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

Tidak ada service backend atau database yang diperlukan untuk prototipe ini.

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

- Dashboard dengan ringkasan dan grafik contoh.
- Daftar menu dengan pencarian, kategori, status ketersediaan, dan form tambah/edit.
- Kasir demo dengan keranjang, simulasi penyelesaian transaksi, dan tombol keranjang tetap di bagian bawah layar mobile. Tombol membuka ringkasan pesanan dalam bottom sheet sehingga daftar menu tetap bisa discroll tanpa kehilangan akses ke keranjang.
- Produk awal serta perubahan form disimpan di browser pada `localStorage` dengan kunci `larisama-demo-products-v1`. Hapus data situs di browser untuk mengembalikan daftar awal.

Angka dashboard dan transaksi adalah data contoh, bukan laporan penjualan sungguhan. Transaksi kasir hanya simulasi dan tidak dikirim ke backend.

## Konfigurasi

Salin `.env.example` menjadi `.env` jika ingin menyiapkan alamat backend untuk integrasi berikutnya. `VITE_API_BASE_URL` belum digunakan oleh prototipe ini.

## Pemeriksaan dasar

```powershell
npm.cmd run lint:check
npm.cmd run build -- --mode pwa
```
