# Global Weather Monitor — Design

## Arah Desain
Konsep: **instrumen stasiun cuaca / synoptic chart** — bukan dashboard SaaS generik. Latar gelap seperti layar radar malam hari, data ditampilkan dalam font monospace layaknya pembacaan alat ukur, bukan kartu statistik yang didekorasi.

## Token — Warna

| Token | Hex | Peran |
|---|---|---|
| Ink | `#0B1220` | Latar dasar halaman |
| Panel | `#131B2E` | Latar kartu / panel |
| Panel 2 | `#0F1626` | Latar track (mis. bar perbandingan) |
| Hairline | `#26304A` | Garis pembatas, grid, border kartu non-aktif |
| Text | `#EAEEF7` | Teks utama |
| Muted | `#8892AC` | Label sekunder, caption, sumbu chart |
| Cold | `#4FC3E8` | Suhu rendah / zona kutub |
| Warm | `#FF8A4C` | Suhu tinggi / zona tropis |

Skala suhu berupa interpolasi linear Cold → Warm (lewat fungsi `tempColor`), dipakai konsisten di titik peta, bar perbandingan belahan bumi, dan angka suhu di kartu zona — satu bahasa warna untuk satu makna (suhu), tidak dipakai untuk hal lain.

## Token — Tipografi

| Peran | Font | Alasan |
|---|---|---|
| Display (judul) | Space Grotesk | Geometris, berkarakter teknis, tidak generik |
| Data (angka, koordinat, timestamp) | IBM Plex Mono | Kesan pembacaan instrumen/alat ukur |
| Body / UI (label, tombol, teks penjelasan) | Inter | Netral, sangat legible di ukuran kecil |

## Layout

```
[ Judul + subjudul ]                    [ live-dot + waktu ] [ Muat Ulang ]
────────────────────────────────────────────────────────────────────────
[ Stat: Rata-rata Global ] [ Stat: Terpanas ] [ Stat: Terdingin ]
────────────────────────────────────────────────────────────────────────
[              Peta sebar 9 zona — lintang × bujur                    ]
[   referensi: ekuator, tropic of cancer/capricorn, lingkar kutub     ]
────────────────────────────────────────────────────────────────────────
[ Belahan Utara     ███████░░░ ]
[ Khatulistiwa      ██████████ ]
[ Belahan Selatan   ████░░░░░░ ]
────────────────────────────────────────────────────────────────────────
[ Kartu Zona ] [ Kartu Zona ] [ Kartu Zona ]   ← grid, auto-fit 1–3+ kolom
────────────────────────────────────────────────────────────────────────
[            Tren mingguan — zona terpilih (line chart)               ]
────────────────────────────────────────────────────────────────────────
  catatan sumber data & batasan (footer, teks kecil)
```

## Elemen Signature
Peta sebar lintang × bujur dengan garis referensi geografis (ekuator, tropic lines, lingkar kutub). Bukan peta tile sungguhan — melainkan scatter chart yang diberi konteks geografis lewat reference lines, sehingga tetap terasa seperti "peta" tanpa dependency ke layanan map eksternal. Ini satu-satunya elemen yang "berani"; semua bagian lain (kartu, angka, bar) sengaja dibuat tenang dan datar supaya peta ini yang jadi pusat perhatian.

## Interaksi
- Klik titik di peta **atau** kartu zona → memilih zona aktif → panel tren mingguan di bawah ikut berpindah
- Tombol "Muat Ulang" → fetch ulang manual, dengan status loading yang jelas (ikon berganti, tombol nonaktif sementara)
- Titik zona yang sedang dipilih diberi cincin highlight tipis di peta, dan border warna hangat di kartunya
- Empty state: kalau histori mingguan zona terpilih < 2 titik, tampilkan teks penjelasan ("baru N titik data...") — bukan grafik kosong tanpa konteks

## Motion
Sengaja minim: pulse halus pada indikator "live" saat data terbaru berhasil dimuat, dan transisi lebar bar (0.4s ease) saat nilai berubah. Tidak ada animasi masuk/scroll-reveal — ini alat pemantauan yang dibuka berulang, bukan halaman promosi yang dilihat sekali.

## Responsif
Grid kartu zona pakai `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` — otomatis menyesuaikan dari 1 kolom (mobile sempit) sampai 3+ kolom (desktop) tanpa breakpoint manual yang di-hardcode.

## Hal yang Sengaja Tidak Dipakai
- Palet krem hangat + serif kontras (klise umum desain AI) — diganti latar gelap teknis
- Near-black + satu aksen neon tunggal — diganti skala dua warna (cold/warm) yang punya makna data, bukan sekadar aksen dekoratif
- Layout broadsheet/koran dengan kolom rapat — tidak relevan untuk dashboard data real-time
