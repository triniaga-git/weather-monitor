# Weekly Weather Snapshot — Setup

Otomatis ambil data cuaca 9 zona representatif tiap minggu dan simpan ke
`data/weather-history.json` di repo ini sendiri. Gratis penuh — GitHub Actions
sebagai cron, git repo sebagai "database".

## Struktur file

```
.github/workflows/weekly-weather.yml   ← jadwal cron
scripts/fetch-weather.js               ← logika fetch + simpan
data/weather-history.json              ← hasil (auto-update tiap minggu)
```

## Cara pasang

1. Push ketiga file di atas ke repo GitHub (baru atau yang sudah ada).
   Repo **publik** disarankan — Actions gratis tanpa batas menit. Repo privat
   tetap gratis, cuma kepotong dari jatah ~2.000 menit/bulan (job ini <1 menit
   sekali jalan, jadi jauh dari batas itu).

2. **Wajib**: aktifkan izin tulis untuk Actions.
   Repo → **Settings → Actions → General → Workflow permissions** →
   pilih **"Read and write permissions"** → Save.
   Tanpa ini, langkah commit/push di workflow akan gagal (403).

3. Test manual dulu sebelum nunggu jadwal mingguan:
   Repo → tab **Actions** → pilih workflow **"Weekly Weather Snapshot"** →
   tombol **"Run workflow"**. Cek log-nya, lalu lihat apakah
   `data/weather-history.json` ke-update dengan commit baru.

4. Setelah itu jalan sendiri tiap Minggu 23:00 UTC (Senin 06:00 WIB).
   Mau ganti jadwal, edit baris `cron:` di
   `.github/workflows/weekly-weather.yml` (format cron standar, 5 field, UTC).

## Catatan

- GitHub otomatis menonaktifkan scheduled workflow kalau repo **tanpa
  aktivitas commit sama sekali selama 60 hari**. Karena job ini sendiri
  bikin commit tiap minggu, dia akan terus "hidup" begitu jalan pertama kali —
  cuma perlu dipantau kalau repo memang lama gak disentuh sebelum setup ini aktif.
- Kalau salah satu zona gagal diambil (timeout dsb.), zona lain tetap
  tersimpan; yang gagal cuma dilewati di minggu itu dan dicoba lagi minggu depan.

## Menyambungkan ke dashboard

Setelah file `data/weather-history.json` mulai terisi, dashboard (artifact
React yang sudah dibuat) bisa dihubungkan ke data ini lewat:

```
https://raw.githubusercontent.com/<username>/<nama-repo>/main/data/weather-history.json
```

Ganti `<username>` dan `<nama-repo>` sesuai repo kamu. Kasih tahu aku URL-nya
kalau sudah siap — nanti aku update dashboard-nya supaya baca histori dari
sini (data mingguan yang sama untuk siapa pun yang buka, bukan cuma
tersimpan per-browser seperti sekarang).
