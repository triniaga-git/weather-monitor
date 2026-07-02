# Global Weather Monitor — Spec Teknis

## Arsitektur

```
┌─────────────────────┐     cron mingguan      ┌──────────────────────┐
│   GitHub Actions     │ ─────────────────────▶ │  Open-Meteo API      │
│   (Node.js script)   │ ◀───────────────────── │  (current_weather)   │
└─────────┬────────────┘      JSON response     └──────────────────────┘
          │ commit + push
          ▼
┌─────────────────────┐
│ data/weather-        │
│ history.json (repo)  │
└─────────┬────────────┘
          │ (v1.2, belum aktif) fetch via raw.githubusercontent.com
          ▼
┌─────────────────────┐     fetch live per-zona  ┌──────────────────────┐
│  Dashboard (React    │ ─────────────────────▶  │  Open-Meteo API      │
│  artifact, client)   │ ◀─────────────────────  │                       │
└─────────┬────────────┘                          └──────────────────────┘
          │ window.storage (per-browser)
          ▼
   histori lokal per-browser
```

Dua jalur data berjalan paralel saat ini: dashboard melakukan fetch live sendiri tiap dibuka (histori tersimpan per-browser), sementara GitHub Actions mengumpulkan snapshot independen ke repo. Keduanya belum disatukan — itu scope v1.2.

## Zona Representatif (9 titik jangkar)

| id | Nama | Lat | Lon | Belahan | Tipe |
|---|---|---|---|---|---|
| arctic | Svalbard | 78.22 | 15.63 | north | Kutub |
| ny | New York | 40.71 | -74.01 | north | Sedang |
| tokyo | Tokyo | 35.68 | 139.69 | north | Sedang |
| riyadh | Riyadh | 24.71 | 46.68 | north | Arid |
| jakarta | Jakarta | -6.21 | 106.85 | equator | Tropis |
| galapagos | Galapagos | -0.74 | -90.35 | equator | Tropis |
| sydney | Sydney | -33.87 | 151.21 | south | Sedang |
| wellington | Wellington | -41.29 | 174.78 | south | Sedang |
| mcmurdo | McMurdo | -77.85 | 166.67 | south | Kutub |

## Sumber Data
Open-Meteo `GET /v1/forecast?latitude=..&longitude=..&current_weather=true&timezone=auto` — gratis, tanpa API key, CORS-enabled untuk fetch client-side. Response relevan: `current_weather.{temperature, windspeed, winddirection, weathercode, time}`.

## Skema Data

### Entry histori (per zona, per minggu)
```json
{ "week": "2026-W27", "temp": 28.4, "wind": 11.2, "date": "2026-07-02T06:00" }
```

### File JSON sisi GitHub — `data/weather-history.json`
```json
{
  "lastUpdated": "2026-07-02T16:00:00.000Z",
  "zones": {
    "jakarta": [ { "week": "2026-W27", "temp": 28.4, "wind": 11.2, "date": "..." } ],
    "...": []
  }
}
```

### Storage sisi browser (artifact) — `window.storage`
Key: `history:<zone_id>` → value: JSON string berisi array entry dengan bentuk sama seperti di atas. Bersifat personal (shared: false), tidak dibagi antar-device.

## Logika Dedup Mingguan
- ISO week dihitung dengan algoritma standar berbasis Kamis (`getISOWeek`), identik di script Node dan di dashboard supaya penomoran minggu konsisten.
- Kalau minggu berjalan sudah punya entry, entry itu **diperbarui**, bukan ditambah sebagai baris baru — memastikan tepat satu titik data per zona per minggu.
- Riwayat dipangkas ke 26 entri terakhir (~6 bulan) di kedua sisi (script & dashboard) supaya ukuran data terkendali.

## Kalkulasi Analisa Bertingkat
- **Zona**: nilai mentah per titik (suhu, angin, kondisi).
- **Belahan bumi**: rata-rata suhu dari seluruh zona dengan `hemisphere` yang sama (`north` / `equator` / `south`).
- **Global**: rata-rata dari seluruh 9 zona yang berhasil diambil pada saat itu.

## Alur Otomatisasi (GitHub Actions)
- **Trigger**: `cron: '0 23 * * 0'` (Minggu 23:00 UTC = Senin 06:00 WIB) + `workflow_dispatch` untuk trigger manual.
- **Steps**: checkout repo → setup Node 20 → jalankan `scripts/fetch-weather.js` → commit & push kalau ada perubahan pada `data/weather-history.json`.
- **Prasyarat**: repo Settings → Actions → Workflow permissions diset ke "Read and write permissions", karena job ini butuh push balik ke repo.

## Penanganan Error
- Fetch per-zona dibungkus try/catch individual di kedua sisi (script & dashboard) — satu zona gagal tidak menggagalkan seluruh proses.
- Script Node: kalau **semua** zona gagal dalam satu run, `process.exit(1)` — job Actions ditandai gagal, file tidak diubah, minggu itu otomatis dicoba lagi minggu depan.
- Dashboard: kalau fetch gagal, tampilkan banner error; data yang sudah ada di state tetap ditampilkan (tidak di-clear).

## Batasan Diketahui
- Histori browser (`window.storage`) dan histori GitHub (`weather-history.json`) **belum disatukan** — v1.2.
- GitHub Actions scheduled workflow otomatis nonaktif kalau repo idle >60 hari tanpa commit sama sekali. Karena job ini sendiri membuat commit mingguan, sekali jalan pertama kali dia akan terus "hidup".
- Open-Meteo adalah layanan pihak ketiga tanpa API key — tidak ada jaminan SLA formal; kegagalan fetch ditangani secara graceful, bukan fatal.

## Stack
- **Frontend**: React (Claude Artifact, single file), `recharts` untuk chart/scatter, `lucide-react` untuk ikon
- **Sumber data**: Open-Meteo REST API
- **Otomatisasi**: GitHub Actions, Node.js 20 (native `fetch`, tanpa dependency eksternal)
- **Storage**: JSON ter-commit di git (shared, sumber kebenaran jangka panjang) + `window.storage` (per-browser, khusus sesi artifact)
