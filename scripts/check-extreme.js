#!/usr/bin/env node
// Cek cuaca ekstrem tiap zona, jalan SETELAH scripts/fetch-weather.js di
// workflow yang sama (jadi data/weather-history.json sudah ter-update).
//
// Dua kriteria, digabung (OR):
//   1. Ambang absolut  — jaring pengaman kasar, sama untuk semua zona
//   2. Anomali historis — dibanding rata-rata minggu-yang-sama dari
//      seluruh tahun sebelumnya (jadi "normal" didefinisikan per zona,
//      bukan angka tetap — McMurdo -40°C di Juli itu wajar, bukan alarm)
//
// Output untuk workflow:
//   - data/alert-state.json diperbarui (dedup/cooldown per zona)
//   - /tmp/alert-body.txt ditulis KALAU ADA alert baru (workflow baca ini)
//   - /tmp/alert-recipients.txt ditulis bersamaan (daftar email, dipisah koma)

const fs = require("fs");
const path = require("path");

const HISTORY_PATH = path.join(__dirname, "..", "data", "weather-history.json");
const STATE_PATH = path.join(__dirname, "..", "data", "alert-state.json");
const CONFIG_PATH = path.join(__dirname, "..", "config", "alert-config.json");
const ALERT_BODY_PATH = "/tmp/alert-body.txt";
const ALERT_RECIPIENTS_PATH = "/tmp/alert-recipients.txt";

const ZONE_NAMES = {
  arctic: "Svalbard, Norwegia",
  ny: "New York, AS",
  tokyo: "Tokyo, Jepang",
  riyadh: "Riyadh, Arab Saudi",
  jakarta: "Jakarta, Indonesia",
  galapagos: "Kep. Galapagos, Ekuador",
  sydney: "Sydney, Australia",
  wellington: "Wellington, Selandia Baru",
  mcmurdo: "Stasiun McMurdo, Antartika",
};

function loadJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr, avg) {
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// Berapa minggu berlalu antara dua kode minggu ISO ("2026-W20" vs "2026-W23")
// -- pendekatan kasar (asumsi 52 minggu/tahun), cukup untuk cek cooldown.
function weeksBetween(weekA, weekB) {
  const [yA, wA] = weekA.split("-W").map(Number);
  const [yB, wB] = weekB.split("-W").map(Number);
  return (yB - yA) * 52 + (wB - wA);
}

function main() {
  const store = loadJSON(HISTORY_PATH, { zones: {} });
  const config = loadJSON(CONFIG_PATH, null);
  const state = loadJSON(STATE_PATH, {});

  if (!config) {
    console.error("config/alert-config.json tidak ditemukan — lewati pengecekan.");
    return;
  }
  if (!config.recipients || config.recipients.length === 0 || config.recipients[0].includes("ganti-dengan-email")) {
    console.log("Belum ada recipient valid di config/alert-config.json — lewati pengecekan.");
    return;
  }

  const { maxTempC, minTempC, maxWindKmh } = config.absoluteThresholds;
  const { minHistorySamples, stdDevMultiplier, minDeltaC } = config.anomaly;
  const cooldownWeeks = config.cooldownWeeks || 3;

  const alerts = [];
  const newState = { ...state };

  for (const zoneId of Object.keys(store.zones || {})) {
    const hist = store.zones[zoneId];
    if (!Array.isArray(hist) || hist.length === 0) continue;

    const current = hist[hist.length - 1]; // entry minggu ini, ditulis fetch-weather.js
    const currentWeekNum = current.week.split("-W")[1];

    // --- 1. Cek ambang absolut ---
    const reasons = [];
    if (current.temp > maxTempC) reasons.push(`suhu ${current.temp.toFixed(1)}°C melebihi ambang absolut ${maxTempC}°C`);
    if (current.temp < minTempC) reasons.push(`suhu ${current.temp.toFixed(1)}°C di bawah ambang absolut ${minTempC}°C`);
    if (current.wind > maxWindKmh) reasons.push(`angin ${current.wind.toFixed(0)} km/j melebihi ambang absolut ${maxWindKmh} km/j`);

    // --- 2. Cek anomali historis (minggu yang sama, tahun-tahun sebelumnya) ---
    const sameWeekHist = hist.filter((h) => h.week !== current.week && h.week.split("-W")[1] === currentWeekNum);
    let anomalyNote = null;
    if (sameWeekHist.length >= minHistorySamples) {
      const temps = sameWeekHist.map((h) => h.temp);
      const avg = mean(temps);
      const sd = stdDev(temps, avg);
      const threshold = Math.max(stdDevMultiplier * sd, minDeltaC);
      const delta = current.temp - avg;
      if (Math.abs(delta) > threshold) {
        const arah = delta > 0 ? "di atas" : "di bawah";
        reasons.push(`anomali — ${Math.abs(delta).toFixed(1)}°C ${arah} rata-rata historis minggu ke-${currentWeekNum} (${avg.toFixed(1)}°C ± ${sd.toFixed(1)}°C, dari ${sameWeekHist.length} tahun data)`);
        anomalyNote = { avg, sd, samples: sameWeekHist.length };
      }
    }

    const isExtreme = reasons.length > 0;
    const prevStatus = state[zoneId]?.status || "normal";
    const lastAlertWeek = state[zoneId]?.lastAlertWeek || null;
    const weeksSinceLastAlert = lastAlertWeek ? weeksBetween(lastAlertWeek, current.week) : Infinity;

    if (isExtreme) {
      const shouldNotify = prevStatus === "normal" || weeksSinceLastAlert >= cooldownWeeks;
      if (shouldNotify) {
        alerts.push({ zoneId, name: ZONE_NAMES[zoneId] || zoneId, temp: current.temp, wind: current.wind, week: current.week, reasons });
        newState[zoneId] = { status: "extreme", lastAlertWeek: current.week };
      } else {
        newState[zoneId] = { status: "extreme", lastAlertWeek }; // tetap extreme, tapi dalam cooldown -- tidak re-alert
      }
    } else {
      newState[zoneId] = { status: "normal", lastAlertWeek: null };
    }
  }

  fs.writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2) + "\n");

  if (alerts.length === 0) {
    console.log("Tidak ada zona dengan kondisi ekstrem minggu ini.");
    return;
  }

  console.log(`${alerts.length} zona terdeteksi ekstrem minggu ini:`);
  const lines = [
    "Peringatan Cuaca Ekstrem — Global Weather Monitor",
    `Minggu: ${alerts[0].week}`,
    "",
  ];
  for (const a of alerts) {
    console.log(`  - ${a.zoneId}: ${a.reasons.join("; ")}`);
    lines.push(`⚠️  ${a.name}`);
    lines.push(`    Suhu minggu ini (rata-rata): ${a.temp.toFixed(1)}°C · Angin: ${a.wind.toFixed(0)} km/j`);
    lines.push(`    (Minggu: ${a.week})`);
    a.reasons.forEach((r) => lines.push(`    → ${r}`));
    lines.push("");
  }
  lines.push("Dashboard: https://triniaga-git-weather-monitor.vercel.app");

  fs.writeFileSync(ALERT_BODY_PATH, lines.join("\n") + "\n");
  fs.writeFileSync(ALERT_RECIPIENTS_PATH, config.recipients.join(","));
  console.log(`Alert body ditulis ke ${ALERT_BODY_PATH}, recipients ke ${ALERT_RECIPIENTS_PATH}`);
}

main();
