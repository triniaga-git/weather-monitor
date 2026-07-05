#!/usr/bin/env node
// Backfill histori MINGGUAN dari 2000 sampai sekarang, untuk 9 zona.
// Jalankan SEKALI (manual lewat workflow_dispatch), BUKAN bagian dari cron
// mingguan biasa. scripts/fetch-weather.js tetap jalan tiap minggu untuk
// menambah/memperbarui minggu berjalan ke array yang sama.
//
// Sumber: Open-Meteo Historical Weather API (ERA5 reanalysis, gratis, tanpa
// API key, data tersedia dari 1940).

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
const START_DATE = "2000-01-01";

function getEndDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7); // buffer, data arsip biasanya telat beberapa hari
  return d.toISOString().slice(0, 10);
}

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

async function fetchZoneHistory(zone, endDate) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${zone.lat}&longitude=${zone.lon}&start_date=${START_DATE}&end_date=${endDate}&daily=temperature_2m_mean,windspeed_10m_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (!data.daily || !data.daily.time) throw new Error("respons tidak lengkap (cek nama parameter daily)");
  return data.daily;
}

function aggregateWeekly(daily) {
  const buckets = {};
  for (let i = 0; i < daily.time.length; i++) {
    const temp = daily.temperature_2m_mean[i];
    if (temp === null || temp === undefined) continue;
    const wind = daily.windspeed_10m_max[i] || 0;
    const week = getISOWeek(new Date(daily.time[i] + "T00:00:00Z"));
    if (!buckets[week]) buckets[week] = { tempSum: 0, windSum: 0, count: 0 };
    buckets[week].tempSum += temp;
    buckets[week].windSum += wind;
    buckets[week].count += 1;
  }
  return Object.keys(buckets)
    .sort()
    .map((week) => ({
      week,
      temp: Number((buckets[week].tempSum / buckets[week].count).toFixed(1)),
      wind: Number((buckets[week].windSum / buckets[week].count).toFixed(1)),
    }));
}

async function main() {
  const store = loadExisting();
  if (!store.zones) store.zones = {};
  const endDate = getEndDate();
  let successCount = 0;

  for (const zone of ZONES) {
    try {
      const daily = await fetchZoneHistory(zone, endDate);
      const backfilled = aggregateWeekly(daily);

      // Migrasi aman: apapun format lama (array datar, atau {monthly,weekly}
      // dari eksperimen sebelumnya), diselaraskan ke satu array datar.
      const existing = store.zones[zone.id];
      const already = Array.isArray(existing) ? existing : existing?.weekly || [];

      const merged = {};
      backfilled.forEach((e) => { merged[e.week] = e; });
      already.forEach((e) => { merged[e.week] = e; }); // data live-cron menang kalau tumpang tindih

      store.zones[zone.id] = Object.keys(merged).sort().map((w) => merged[w]);
      successCount++;
      console.log(`OK    ${zone.id.padEnd(11)} ${backfilled.length} minggu (${backfilled[0]?.week} -> ${backfilled[backfilled.length - 1]?.week})`);
    } catch (e) {
      console.error(`GAGAL ${zone.id.padEnd(11)} ${e.message}`);
    }
  }

  if (successCount === 0) {
    console.error("Semua zona gagal di-backfill — file tidak diubah.");
    process.exit(1);
  }

  store.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2) + "\n");
  console.log(`Selesai: ${successCount}/${ZONES.length} zona ter-backfill dari ${START_DATE} sampai ${endDate}.`);
}

main();
