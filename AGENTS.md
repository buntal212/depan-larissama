# Aturan Frontend LarisSama

Frontend ini menggunakan Quasar dan Vue. Aturan ini berlaku untuk pekerjaan di repo `depan-larissama/`.

## Data dan database

- Frontend berkomunikasi dengan backend melalui API. Jangan menambahkan koneksi database, query SQL, migration, atau akses kredensial database di frontend.
- Rancangan skema backend berada di [`../api.larissama/database/README.md`](../api.larissama/database/README.md). Gunakan dokumen itu untuk memahami istilah dan relasi; kontrak API backend tetap menentukan payload yang benar-benar tersedia.
- Jangan menebak endpoint atau menganggap seluruh kolom database dikirim ke browser. Periksa kontrak API backend sebelum membangun alur data baru.
- Untuk request tenant biasa, gunakan konteks autentikasi yang disepakati backend. Jangan mengirim atau mengubah `warung_id` dari input pengguna sebagai cara memilih tenant. Jika backend menyediakan alur pilihan tenant khusus superadmin, ikuti kontrak API tersebut.
- Role, status user, status warung, dan tanggal masa aktif boleh dipakai untuk mengatur tampilan. Backend tetap harus memeriksa otorisasi dan masa aktif pada setiap request.
- Untuk penjualan, tampilkan nilai hasil backend sebagai nilai final. Perhitungan di UI hanya untuk pratinjau; backend menghitung ulang dan memvalidasi nominal. Hindari operasi uang dengan floating point JavaScript tanpa strategi decimal/formatting yang disepakati API.
- Pertahankan nominal desimal persis seperti kontrak API (gunakan string desimal bila itu format transportnya); ubah ke format lokal hanya untuk tampilan, jangan membulatkan atau mengubah nominal lewat tipe floating point.
- Rincian penjualan adalah snapshot transaksi. Riwayat harus menampilkan nama dan harga pada saat transaksi, bukan mengambil nama/harga master menu saat ini.
- Representasikan data `UNKNOWN`, `PARTIAL`, atau `PENDING` sesuai kontrak. Jangan mengubah field yang hilang menjadi `0`, `false`, atau keadaan terkonfirmasi tanpa definisi backend.

## Implementasi UI

- Ikuti struktur, komponen Quasar, router, store, dan gaya yang sudah digunakan di `src/`.
- Tangani status loading, validasi, kegagalan API, dan akses ditolak secara konsisten dengan pola proyek.
- Jangan menyimpan password, token, atau rahasia database dalam source code atau log UI.
