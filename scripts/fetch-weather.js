#!/usr/bin/env node
// Ambil snapshot cuaca mingguan untuk 9 zona representatif dan simpan ke
// data/weather-history.json (array datar per zona, TANPA batas panjang --
// histori penuh dari 2000 dijaga lewat scripts/backfill-history.js, script
// ini cuma menambah/memperbarui minggu yang sedang berjalan).

const fs = require("fs");
const path = require("path");

const ZONES = [
  { id: "arctic", lat: 78.22, lon: 15.63 },
  { id: "ny", lat: 40.71, lon: -74.01 },
  { id: "tokyo", lat: 35.68, lon: 139.69 },
  { id: "riyadh", lat: 24.71, lon: 46.68 },
  { id: "jakarta", lat: -6.21, lon: 106.85 },
  { id: "galapagos", lat: -0.74, lon: -90.35 },
  { id: "sydney", lat: -33.87, lon: 151.21 },
  { id: "wellington", lat: -41.29, lon: 174.78 },
  { id: "mcmurdo", lat: -77.85, lon: 166.67 },
];

const DATA_PATH = path.join(__dirname, "..", "data", "weather-history.json");

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function loadExisting() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { lastUpdated: null, zones: {} };
  }
}

async function fetchZone(zone) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${zone.lat}&longitude=${zone.lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return data.current_weather;
}

async function main() {
  const store = loadExisting();
  if (!store.zones) store.zones = {};
  const week = getISOWeek(new Date());
  let successCount = 0;

  for (const zone of ZONES) {
    try {
      const cw = await fetchZone(zone);
      const entry = { week, temp: cw.temperature, wind: cw.windspeed, date: cw.time };

      const existing = store.zones[zone.id];
      const hist = Array.isArray(existing) ? existing : existing?.weekly || [];
      const idx = hist.findIndex((h) => h.week === week);
      if (idx >= 0) hist[idx] = entry; else hist.push(entry);

      store.zones[zone.id] = hist; // tidak dipangkas -- histori penuh dari 2000 dijaga
      successCount++;
      console.log(`OK    ${zone.id.padEnd(11)} ${cw.temperature}°C`);
    } catch (e) {
      console.error(`GAGAL ${zone.id.padEnd(11)} ${e.message}`);
    }
  }

  if (successCount === 0) {
    console.error("Semua zona gagal diambil — file tidak diubah, job dianggap gagal.");
    process.exit(1);
  }

  store.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2) + "\n");
  console.log(`Selesai: ${successCount}/${ZONES.length} zona tersimpan untuk minggu ${week}.`);
}

main();
