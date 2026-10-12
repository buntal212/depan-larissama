# Catatan handoff frontend ke backend

## Profil warung

Status saat ini: halaman Profil Warung di frontend masih berupa tampilan contoh dan belum terhubung ke API.

Kontrak yang tersedia sekarang:

- `GET /api/v1/warung` dapat membaca profil warung dari akun tenant.
- `PATCH /api/v1/admin/warungs/{id}` hanya untuk superadmin; endpoint ini bukan jalur edit profil owner.
- Resource warung mengembalikan field `logo`, tetapi schema `WarungUpdate` belum menerima perubahan logo dan belum ada kontrak upload logo.

Kebutuhan yang perlu diputuskan dan disiapkan backend:

- Sediakan operasi agar owner dapat mengubah profil warungnya sendiri. Backend menentukan method/path dan field yang diizinkan; frontend tidak akan mengirim `warung_id` sebagai pilihan tenant.
- Tetapkan field profil yang boleh diubah owner, misalnya nama, alamat, dan telepon. Jelaskan apakah timezone ikut dapat diubah.
- Tentukan kontrak ganti/hapus logo: format request, batas tipe dan ukuran file, serta bentuk URL/path pada response.
- Tegaskan bahwa status aktif, kode warung, dan tanggal masa langganan tetap dikelola admin melalui operasi khusus.
- Dokumentasikan response sukses dan format error validasi agar form frontend dapat menampilkan pesan per field.

Setelah kontrak dan otorisasi tersedia, frontend dapat menghubungkan halaman Profil Warung tanpa mengubah backend.
