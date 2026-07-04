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

// GANTI dengan username & nama repo GitHub kamu
const HISTORY_URL = "https://raw.githubusercontent.com/triniaga-git/weather-monitor/master/data/weather-history.json";

export async function GET() {
  // Ambil data live untuk 9 zona (di-cache 5 menit di edge Vercel)
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

  // Ambil histori mingguan dari GitHub (di-cache 1 jam)
  let history = {};
  try {
    const histRes = await fetch(HISTORY_URL, { next: { revalidate: 3600 } });
    if (histRes.ok) {
      const histData = await histRes.json();
      history = histData.zones || {};
    }
  } catch {
    // biarkan history kosong, live data tetap jalan
  }

  const zonesData = {};
  liveResults.forEach((r) => { if (r.cw) zonesData[r.id] = r.cw; });

  return Response.json({ zonesData, history, fetchedAt: new Date().toISOString() });
}