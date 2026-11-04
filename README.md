# Ofcompas

Panduan sejarah dan budaya daerah untuk turis. Satu kode, dua jalur:

1. **Situs web** di GitHub Pages (`https://USERNAME.github.io/REPO/`)
2. **Aplikasi Android (APK)** dengan Capacitor

Keduanya bisa dipakai **offline** dan **memperbarui diri otomatis** saat ada internet.

## Tampilan

Tema: latar lembut bergradasi, judul bergaya serif dengan stabilo emas, kartu foto dengan panel kaca, hero layar penuh dengan sheet putih, dan menu bawah berbentuk pil navy. Layar sambutan ("Mulai Jelajah") hanya tampil saat pertama kali dibuka. Warna ada di bagian `:root` pada `www/style.css` (`--acc` emas, `--navy`, `--hi` stabilo), jadi mudah diganti.

## Struktur

```
www/                     ← seluruh isi situs dan aplikasi
  index.html  style.css  app.js
  sw.js                  ← service worker (offline)
  config.js              ← alamat situs (diisi otomatis saat build)
  data/countries.json    ← daftar negara
  data/us.json           ← isi Amerika Serikat (state, tujuan, objek)
  img/                   ← taruh foto di sini (opsional)
tools/build-manifest.mjs ← membuat files.json (daftar file + hash)
capacitor.config.json    ← pengaturan aplikasi Android
.github/workflows/build.yml ← build situs dan APK otomatis
```

## Pemasangan (sekali saja)

1. Buat repositori GitHub (Public), upload semua file dengan struktur folder di atas.
   - Folder tersembunyi `.github/workflows/build.yml` harus ada. Dari HP, pakai **Add file → Create new file**, ketik `.github/workflows/build.yml` sebagai nama, lalu tempel isinya.
2. **Settings → Pages → Source: GitHub Actions**.
3. Buka tab **Actions**. Build pertama berjalan otomatis (sekitar 1 menit). Setelah hijau, situs aktif di `https://USERNAME.github.io/REPO/`.

## Membuat APK

1. Tab **Actions → Build → Run workflow**.
2. Tunggu 5-8 menit sampai hijau, buka run tersebut, lalu unduh **jelajah-apk** di bagian *Artifacts* (file ZIP berisi `app-debug.apk`).
3. Ekstrak, lalu pasang di Android (izinkan "install dari sumber tidak dikenal").

APK ini bertanda debug, cukup untuk dibagikan dan diuji. Untuk Play Store nanti perlu APK/AAB bertanda rilis.

## Cara kerja pembaruan otomatis

- Setiap kali Anda mengubah file di GitHub, Actions membangun ulang situs dan membuat `files.json` berisi hash tiap file.
- Saat aplikasi atau situs dibuka dengan internet, ia membaca `files.json`, mengunduh **hanya file yang berubah**, dan menyimpannya di HP.
- Setelah itu semuanya tersedia offline. Indikator di pojok kanan atas menunjukkan statusnya (hijau = tersimpan offline).
- Di APK, data, foto, **dan tampilan** (html/css/js) ikut diperbarui. Jika tampilan berubah, muncul tombol "Muat ulang".
- Yang **tidak** bisa berubah lewat pembaruan: pengaturan Capacitor, ikon aplikasi, dan nama aplikasi. Untuk itu bangun APK baru.

## Menambah isi

Edit `www/data/us.json` (bisa dari HP). Strukturnya:

- `state`: state (id, nama, wilayah, julukan, ibukota, ringkas)
- `tujuan`: kota/taman/pulau di dalam state (field `state` menunjuk id state)
- `objek`: tempat spesifik (field `tujuan` menunjuk id tujuan; `lat`/`lng` untuk lokasi; `unggulan: true` agar muncul di beranda)

Aturan `id`: huruf kecil tanpa spasi, unik di seluruh file.

### Foto

Taruh foto di `www/img/`, kompres dulu (WebP atau JPG, lebar sekitar 1200 px), lalu isi `"foto": "img/golden-gate.webp"`. Selama kosong, tampil ilustrasi bawaan. Pakai foto sendiri atau berlisensi bebas (misalnya Wikimedia Commons, dengan mencantumkan kredit).

### Negara baru

1. Salin `us.json` menjadi file baru, mis. `data/jp.json`, isi dengan data negara itu.
2. Di `countries.json`, ubah negaranya: `"aktif": true` dan `"file": "data/jp.json"`.

## Penting sebelum dipublikasikan

- **Periksa fakta.** Teks sejarah dan budaya di `us.json` adalah draf awal. Cek ulang tiap angka dan tahun ke sumber resmi (misalnya National Park Service) sebelum diumumkan.
- **Peta.** Tombol "Lihat di peta" membuka OpenStreetMap dan butuh internet. Koordinat tetap tersimpan offline.
- **Font.** Aplikasi memakai font bawaan perangkat agar tetap offline.
- **Nama dan ikon.** Ganti "Jelajah" di `capacitor.config.json`, `manifest.webmanifest`, `config.js`, dan `index.html`. Ganti `icon.svg`, `icon-192.png`, `icon-512.png` dengan logo Anda.

## Uji di komputer

```
cd www
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Indikator akan menampilkan "Mode lokal" karena `files.json` baru dibuat oleh GitHub Actions.
