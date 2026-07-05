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

const HISTORY_URL =
  "https://raw.githubusercontent.com/triniaga-git/weather-monitor/master/data/weather-history.json";

// Format tanggal jadi "2 Jul" (singkat, muat di kartu kecil)
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

export async function GET() {
  // 1. Live current weather
  const liveResults = await Promise.all(
    ZONES.map(async (z) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lon}&current_weather=true&timezone=auto`;
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        return { id: z.id, cw: data.current_weather };
      } catch {
        return { id: z.id, cw: null };
      }
    })
  );

  // 2. Weekly min/max — ambil daily temperature_2m_max & temperature_2m_min
  //    untuk 7 hari terakhir (forecast past_days=7)
  const weeklyResults = await Promise.all(
    ZONES.map(async (z) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lon}&daily=temperature_2m_max,temperature_2m_min&past_days=7&forecast_days=1&timezone=auto`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        const times = data.daily?.time || [];
        const maxTemps = data.daily?.temperature_2m_max || [];
        const minTemps = data.daily?.temperature_2m_min || [];

        // Cari index suhu tertinggi & terendah dari 7 hari
        let maxVal = -Infinity, minVal = Infinity;
        let maxDate = null, minDate = null;
        for (let i = 0; i < times.length; i++) {
          if (maxTemps[i] !== null && maxTemps[i] > maxVal) {
            maxVal = maxTemps[i];
            maxDate = times[i];
          }
          if (minTemps[i] !== null && minTemps[i] < minVal) {
            minVal = minTemps[i];
            minDate = times[i];
          }
        }

        return {
          id: z.id,
          weekMax: maxVal === -Infinity ? null : maxVal,
          weekMaxDate: fmtDate(maxDate),
          weekMin: minVal === Infinity ? null : minVal,
          weekMinDate: fmtDate(minDate),
        };
      } catch {
        return { id: z.id, weekMax: null, weekMaxDate: null, weekMin: null, weekMinDate: null };
      }
    })
  );

  // 3. Histori mingguan dari GitHub
  let history = {};
  try {
    const histRes = await fetch(HISTORY_URL, { next: { revalidate: 3600 } });
    if (histRes.ok) {
      const histData = await histRes.json();
      history = histData.zones || {};
    }
  } catch {
    // biarkan kosong, live data tetap jalan
  }

  // Gabung semua
  const zonesData = {};
  liveResults.forEach((r) => { if (r.cw) zonesData[r.id] = r.cw; });

  const weeklyData = {};
  weeklyResults.forEach((r) => {
    weeklyData[r.id] = {
      weekMax: r.weekMax,
      weekMaxDate: r.weekMaxDate,
      weekMin: r.weekMin,
      weekMinDate: r.weekMinDate,
    };
  });

  return Response.json({
    zonesData,
    weeklyData,   // ← baru
    history,
    fetchedAt: new Date().toISOString(),
  });
}
