# Global Weather Monitor — Product

## Ringkasan
Dashboard pemantauan cuaca global berbasis 9 zona representatif (bukan grid penuh dunia), dengan analisa bertingkat — zona → belahan bumi → global — dan histori mingguan yang terkumpul otomatis.

## Latar Belakang
Berangkat dari diskusi soal pemetaan cuaca real-time: daripada menarik data dari jutaan koordinat, cukup pakai beberapa titik jangkar yang mewakili tiap karakteristik iklim utama (pendekatan ala standar WMO). Kebutuhannya bukan cuma "cuaca sekarang", tapi tiga hal sekaligus: kondisi terkini, histori pergerakan data, dan analisa bertingkat.

## Target Pengguna
Personal use — alat pemantauan pribadi, bukan produk yang dijual/dikomersialkan.

## Tujuan (Goals)
- Gambaran cuaca global yang representatif tanpa overhead data penuh
- Histori berbasis **mingguan** (bukan harian) supaya tren lebih stabil dan minim noise harian
- Analisa tiga tingkat: per-zona, per-belahan-bumi, rata-rata global
- Berjalan gratis penuh — tanpa biaya hosting, tanpa biaya API

## Non-Goals (di luar cakupan v1)
- Bukan alat prakiraan cuaca (forecasting) — hanya kondisi aktual + histori
- Bukan cakupan grid penuh / presisi lokal — representasi lewat 9 titik jangkar
- Belum multi-user, belum ada autentikasi atau akses publik

## Fitur Utama
1. Peta sebar 9 zona (lintang × bujur) dengan garis referensi ekuator & tropic
2. Statistik tier global — rata-rata, zona terpanas, zona terdingin
3. Perbandingan belahan bumi — Utara / Khatulistiwa / Selatan
4. Kartu kondisi real-time per zona (suhu, angin, deskripsi cuaca)
5. Grafik tren mingguan per zona (klik zona/titik peta untuk lihat)
6. Koleksi data otomatis mingguan lewat GitHub Actions — tidak perlu buka app manual

## Zona Representatif
Svalbard, New York, Tokyo, Riyadh, Jakarta, Galapagos, Sydney, Wellington, McMurdo — mewakili kutub, kontinental sedang (barat & timur), arid, tropis maritim, tropis Pasifik, dan Antartika. Detail koordinat & rasional tiap zona ada di `SPEC.md`.

## Definisi Berhasil (informal)
- Histori terus terkumpul tanpa intervensi manual, berjalan lintas minggu/bulan
- Bisa menjawab "bagaimana pola panas/dingin minggu ini dibanding bulan lalu" dalam hitungan detik saat dibuka

## Roadmap
| Versi | Status | Cakupan |
|---|---|---|
| v1 | Selesai | Dashboard client-side, live fetch, histori per-browser (`window.storage`) |
| v1.1 | Selesai | Koleksi otomatis mingguan via GitHub Actions → JSON di repo |
| v1.2 | Berikutnya | Dashboard baca histori dari JSON GitHub (shared, bukan per-browser) |
| v2 | Opsional | Tambah zona, notifikasi anomali suhu, export data, hosting publik (GitHub Pages / Vercel) |

## Dokumen Terkait
- `SPEC.md` — spesifikasi teknis (arsitektur, skema data, alur otomatisasi)
- `DESIGN.md` — sistem desain (token warna/tipografi, layout, elemen signature)
- `weather-automation/README.md` — panduan setup GitHub Actions
