"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, LineChart, Line,
  BarChart, Bar,
} from "recharts";
import { RefreshCw, Loader2, MapPin, TrendingUp, Radio, ChevronLeft, ChevronRight } from "lucide-react";

const INK = "#0B1220";
const PANEL = "#131B2E";
const PANEL_2 = "#0F1626";
const HAIRLINE = "#26304A";
const TEXT = "#EAEEF7";
const MUTED = "#8892AC";
const COLD = "#4FC3E8";
const WARM = "#FF8A4C";
const DISPLAY_FONT = "'Space Grotesk', sans-serif";
const MONO_FONT = "'IBM Plex Mono', monospace";
const BODY_FONT = "'Inter', sans-serif";

const ZONES = [
  { id: "arctic", name: "Svalbard", full: "Svalbard, Norwegia", shortName: "SVB", lat: 78.22, lon: 15.63, hemisphere: "north", type: "Kutub" },
  { id: "ny", name: "New York", full: "New York, AS", shortName: "NYC", lat: 40.71, lon: -74.01, hemisphere: "north", type: "Sedang" },
  { id: "tokyo", name: "Tokyo", full: "Tokyo, Jepang", shortName: "TYO", lat: 35.68, lon: 139.69, hemisphere: "north", type: "Sedang" },
  { id: "riyadh", name: "Riyadh", full: "Riyadh, Arab Saudi", shortName: "RUH", lat: 24.71, lon: 46.68, hemisphere: "north", type: "Arid" },
  { id: "jakarta", name: "Jakarta", full: "Jakarta, Indonesia", shortName: "JKT", lat: -6.21, lon: 106.85, hemisphere: "equator", type: "Tropis" },
  { id: "galapagos", name: "Galapagos", full: "Kep. Galapagos, Ekuador", shortName: "GPS", lat: -0.74, lon: -90.35, hemisphere: "equator", type: "Tropis" },
  { id: "sydney", name: "Sydney", full: "Sydney, Australia", shortName: "SYD", lat: -33.87, lon: 151.21, hemisphere: "south", type: "Sedang" },
  { id: "wellington", name: "Wellington", full: "Wellington, Selandia Baru", shortName: "WLG", lat: -41.29, lon: 174.78, hemisphere: "south", type: "Sedang" },
  { id: "mcmurdo", name: "McMurdo", full: "Stasiun McMurdo, Antartika", shortName: "MCM", lat: -77.85, lon: 166.67, hemisphere: "south", type: "Kutub" },
];

const HEMI_LABEL: Record<string, string> = { north: "Belahan Utara", equator: "Zona Khatulistiwa", south: "Belahan Selatan" };
const TYPE_COLOR: Record<string, string> = { Kutub: COLD, Sedang: MUTED, Arid: "#FFB454", Tropis: WARM };

const WEATHER_DESC: Record<number, string> = {
  0: "Cerah", 1: "Cerah Berawan", 2: "Berawan Sebagian", 3: "Mendung",
  45: "Berkabut", 48: "Kabut Beku",
  51: "Gerimis Ringan", 53: "Gerimis", 55: "Gerimis Lebat",
  61: "Hujan Ringan", 63: "Hujan", 65: "Hujan Lebat",
  71: "Salju Ringan", 73: "Salju", 75: "Salju Lebat",
  80: "Hujan Sesaat", 81: "Hujan Sesaat Lebat", 82: "Hujan Ekstrem",
  95: "Badai Petir", 96: "Badai + Es", 99: "Badai Hebat + Es",
};
function weatherDesc(code: number) {
  return WEATHER_DESC[code] !== undefined ? WEATHER_DESC[code] : "Tidak diketahui";
}

function tempColor(t: number) {
  const clamped = Math.max(-25, Math.min(42, t));
  const ratio = (clamped + 25) / 67;
  const r = Math.round(79 + (255 - 79) * ratio);
  const g = Math.round(195 + (138 - 195) * ratio);
  const b = Math.round(232 + (76 - 232) * ratio);
  return `rgb(${r},${g},${b})`;
}

function MapTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIRLINE}`, borderRadius: 8, padding: "8px 12px", fontFamily: MONO_FONT, fontSize: 12, color: TEXT }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: BODY_FONT }}>{p.name}</div>
      <div>{p.temp.toFixed(1)}°C · angin {p.wind.toFixed(0)} km/j</div>
    </div>
  );
}

function HistoryTooltip({ active, payload, labelKey = "week", valueKey = "temp" }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIRLINE}`, borderRadius: 8, padding: "6px 10px", fontFamily: MONO_FONT, fontSize: 12, color: TEXT }}>
      <div>{p[labelKey]}</div>
      <div style={{ color: WARM }}>{Number(p[valueKey]).toFixed(1)}°C</div>
    </div>
  );
}

function ZoneDot(props: any) {
  const { cx, cy, payload, onSelect, selectedId } = props;
  const color = tempColor(payload.temp);
  const isSelected = payload.id === selectedId;
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onSelect(payload.id)}>
      {isSelected && <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />}
      <circle cx={cx} cy={cy} r={6} fill={color} stroke={TEXT} strokeWidth={1} opacity={0.95} />
      <text x={cx} y={cy - 11} textAnchor="middle" fontSize={9.5} fill={MUTED} fontFamily={MONO_FONT}>{payload.shortName}</text>
    </g>
  );
}

function Panel({ title, icon, children, style, right }: any) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIRLINE}`, borderRadius: 12, padding: 18, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, fontFamily: MONO_FONT, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {icon}{title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: MONO_FONT, fontSize: 28, marginTop: 4, color: color || TEXT }}>{value}</div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function buildFiveYearBuckets(hist: any[]) {
  if (!hist.length) return [];
  const currentYear = new Date().getFullYear();
  const buckets: { label: string; avg: number }[] = [];
  let start = 2000;
  while (start <= currentYear) {
    const end = Math.min(start + 4, currentYear);
    const isPartial = start + 4 > currentYear;
    const entries = hist.filter((h) => {
      const y = parseInt(h.week.slice(0, 4), 10);
      return y >= start && y <= end;
    });
    if (entries.length) {
      const avg = entries.reduce((s: number, e: any) => s + e.temp, 0) / entries.length;
      buckets.push({ label: `${start}-${String(end).slice(2)}${isPartial ? "*" : ""}`, avg: Number(avg.toFixed(1)) });
    }
    start += 5;
  }
  return buckets;
}

export default function Home() {
  const [zonesData, setZonesData] = useState<Record<string, any>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState("jakarta");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setZonesData(data.zonesData || {});
      setWeeklyData(data.weeklyData || {});
      setHistory(data.history || {});
      setLastUpdated(new Date(data.fetchedAt));
    } catch (e) {
      setError("Gagal mengambil data cuaca. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const zoneTemps = ZONES.map((z) => ({ ...z, temp: zonesData[z.id]?.temperature })).filter((z) => typeof z.temp === "number");
  const globalAvg = zoneTemps.length ? zoneTemps.reduce((s, z) => s + z.temp, 0) / zoneTemps.length : null;
  const hottest = zoneTemps.length ? zoneTemps.reduce((a, b) => (b.temp > a.temp ? b : a)) : null;
  const coldest = zoneTemps.length ? zoneTemps.reduce((a, b) => (b.temp < a.temp ? b : a)) : null;
  const hemiAvg = (h: string) => {
    const arr = zoneTemps.filter((z) => z.hemisphere === h);
    return arr.length ? arr.reduce((s, z) => s + z.temp, 0) / arr.length : null;
  };

  const mapData = zoneTemps.map((z) => ({ x: z.lon, y: z.lat, temp: z.temp, wind: zonesData[z.id]?.windspeed || 0, id: z.id, name: z.full, shortName: z.shortName }));
  const selectedZone = ZONES.find((z) => z.id === selectedZoneId);
  const selectedCurrent = zonesData[selectedZoneId];
  const fullHistory: any[] = history[selectedZoneId] || [];
  const availableYears = Array.from(new Set(fullHistory.map((h) => h.week.slice(0, 4)))).sort() as string[];
  const effectiveYear = selectedYear && availableYears.includes(selectedYear) ? selectedYear : availableYears[availableYears.length - 1];
  const yearWeekly = fullHistory.filter((h) => h.week.startsWith(effectiveYear || "")).map((h) => ({ ...h, weekNum: h.week.split("-W")[1] }));
  const yearIdx = effectiveYear ? availableYears.indexOf(effectiveYear) : -1;
  const periodBuckets = buildFiveYearBuckets(fullHistory);

  const barPct = (t: number | null) => t === null ? 0 : Math.max(0, Math.min(100, ((t + 30) / 75) * 100));

  return (
    <div style={{ minHeight: "100vh", background: INK, color: TEXT, fontFamily: BODY_FONT, padding: "24px 16px 56px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        @keyframes pulseDot { 0% { opacity: 1; } 50% { opacity: 0.25; } 100% { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select.year-select { background: ${PANEL_2}; color: ${TEXT}; border: 1px solid ${HAIRLINE}; border-radius: 6px; font-family: ${MONO_FONT}; font-size: 13px; padding: 4px 8px; }
        button.chev { background: ${PANEL_2}; border: 1px solid ${HAIRLINE}; color: ${TEXT}; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        button.chev:disabled { opacity: 0.35; cursor: default; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={20} color={WARM} />
              <h1 style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 26, margin: 0 }}>Peta Cuaca Global</h1>
            </div>
            <p style={{ color: MUTED, fontSize: 13, margin: "4px 0 0 28px" }}>9 zona representatif · histori mingguan 2000-sekarang · analisa bertingkat</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: MONO_FONT, display: "flex", alignItems: "center", gap: 6 }}>
              {lastUpdated && (<><Radio size={12} color={WARM} style={{ animation: "pulseDot 2s ease-in-out infinite" }} />{lastUpdated.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>)}
            </div>
            <button onClick={loadData} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, background: PANEL, border: `1px solid ${HAIRLINE}`, color: TEXT, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontFamily: BODY_FONT, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
              Muat Ulang
            </button>
          </div>
        </div>

        {error && <div style={{ background: "rgba(255,138,76,0.1)", border: `1px solid ${WARM}`, color: WARM, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>{error}</div>}

        {/* Tier 1: Global summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Rata-rata Global" value={globalAvg !== null ? `${globalAvg.toFixed(1)}°C` : "—"} sub="9 zona" />
          <StatCard label="Zona Terpanas" value={hottest ? `${hottest.temp.toFixed(1)}°C` : "—"} sub={hottest ? hottest.full : "—"} color={WARM} />
          <StatCard label="Zona Terdingin" value={coldest ? `${coldest.temp.toFixed(1)}°C` : "—"} sub={coldest ? coldest.full : "—"} color={COLD} />
        </div>

        {/* Map panel */}
        <Panel title="Sebaran Zona — Lintang × Bujur" icon={<TrendingUp size={15} color={MUTED} />}>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <ReferenceArea y1={-23.5} y2={23.5} x1={-180} x2={180} fill={WARM} fillOpacity={0.05} />
              <ReferenceArea y1={66.5} y2={90} x1={-180} x2={180} fill={COLD} fillOpacity={0.05} />
              <ReferenceArea y1={-90} y2={-66.5} x1={-180} x2={180} fill={COLD} fillOpacity={0.05} />
              <CartesianGrid stroke={HAIRLINE} strokeDasharray="2 4" opacity={0.6} />
              <XAxis type="number" dataKey="x" domain={[-180, 180]} ticks={[-180, -90, 0, 90, 180]} stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} label={{ value: "Bujur (°)", position: "insideBottom", offset: -8, fill: MUTED, fontSize: 10 }} />
              <YAxis type="number" dataKey="y" domain={[-90, 90]} ticks={[-90, -45, 0, 45, 90]} stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} label={{ value: "Lintang (°)", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 10 }} />
              <ReferenceLine y={0} stroke={MUTED} strokeDasharray="4 3" label={{ value: "Ekuator", position: "insideTopRight", fill: MUTED, fontSize: 9 }} />
              <ReferenceLine y={23.5} stroke={HAIRLINE} strokeDasharray="2 3" label={{ value: "Tropic of Cancer", position: "insideTopRight", fill: MUTED, fontSize: 8 }} />
              <ReferenceLine y={-23.5} stroke={HAIRLINE} strokeDasharray="2 3" label={{ value: "Tropic of Capricorn", position: "insideBottomRight", fill: MUTED, fontSize: 8 }} />
              <Tooltip content={<MapTooltip />} />
              <Scatter data={mapData} shape={(props: any) => <ZoneDot {...props} onSelect={setSelectedZoneId} selectedId={selectedZoneId} />} />
            </ScatterChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>Warna titik = suhu (biru dingin → oranye panas). Klik titik untuk lihat tren.</p>
        </Panel>

        {/* Tier 2: Hemisphere comparison */}
        <Panel title="Perbandingan Belahan Bumi" style={{ marginTop: 20 }}>
          {["north", "equator", "south"].map((h) => {
            const t = hemiAvg(h);
            return (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 130, fontSize: 12.5, color: MUTED }}>{HEMI_LABEL[h]}</div>
                <div style={{ flex: 1, height: 8, background: PANEL_2, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barPct(t)}%`, background: t !== null ? tempColor(t) : HAIRLINE, borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ width: 56, textAlign: "right", fontFamily: MONO_FONT, fontSize: 13 }}>{t !== null ? `${t.toFixed(1)}°C` : "—"}</div>
              </div>
            );
          })}
        </Panel>

        {/* Tier 3: Zone grid dengan min/max */}
        <div style={{ marginTop: 24, marginBottom: 8, fontSize: 13, color: MUTED, fontFamily: MONO_FONT }}>ZONA · 9 TITIK JANGKAR</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {ZONES.map((z) => {
            const cw = zonesData[z.id];
            const wk = weeklyData[z.id];
            const isSelected = z.id === selectedZoneId;
            return (
              <div
                key={z.id}
                onClick={() => { setSelectedZoneId(z.id); setSelectedYear(null); }}
                style={{ background: PANEL, border: `1px solid ${isSelected ? WARM : HAIRLINE}`, borderRadius: 10, padding: 14, cursor: "pointer", transition: "border-color 0.2s ease" }}
              >
                {/* Nama + badge tipe */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{z.name}</div>
                  <span style={{ fontSize: 9.5, color: TYPE_COLOR[z.type], border: `1px solid ${TYPE_COLOR[z.type]}`, borderRadius: 4, padding: "1px 5px" }}>{z.type}</span>
                </div>

                {/* Suhu saat ini */}
                <div style={{ fontFamily: MONO_FONT, fontSize: 24, marginTop: 8, color: cw ? tempColor(cw.temperature) : MUTED }}>
                  {cw ? `${cw.temperature.toFixed(1)}°` : loading ? "···" : "—"}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  {cw ? `${weatherDesc(cw.weathercode)} · ${cw.windspeed.toFixed(0)} km/j` : "menunggu data"}
                </div>

                {/* Min/Max 7 hari terakhir */}
                {wk && (wk.weekMax !== null || wk.weekMin !== null) && (
                  <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${HAIRLINE}` }}>
                    {wk.weekMax !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 10.5, color: WARM, fontFamily: MONO_FONT }}>▲ {wk.weekMax.toFixed(1)}°</span>
                        <span style={{ fontSize: 9, color: MUTED }}>{wk.weekMaxDate}</span>
                      </div>
                    )}
                    {wk.weekMin !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
                        <span style={{ fontSize: 10.5, color: COLD, fontFamily: MONO_FONT }}>▼ {wk.weekMin.toFixed(1)}°</span>
                        <span style={{ fontSize: 9, color: MUTED }}>{wk.weekMinDate}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tren mingguan dengan pemilih tahun */}
        <Panel
          title={`Tren Mingguan — ${selectedZone ? selectedZone.full : ""}`}
          style={{ marginTop: 20 }}
          right={
            availableYears.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="chev" disabled={yearIdx <= 0} onClick={() => setSelectedYear(availableYears[yearIdx - 1])}><ChevronLeft size={14} /></button>
                <select className="year-select" value={effectiveYear || ""} onChange={(e) => setSelectedYear(e.target.value)}>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="chev" disabled={yearIdx >= availableYears.length - 1} onClick={() => setSelectedYear(availableYears[yearIdx + 1])}><ChevronRight size={14} /></button>
              </div>
            )
          }
        >
          {selectedCurrent && (
            <div style={{ display: "flex", gap: 24, marginBottom: 14, fontFamily: MONO_FONT, fontSize: 13 }}>
              <div><span style={{ color: MUTED }}>Saat ini: </span>{selectedCurrent.temperature.toFixed(1)}°C</div>
              <div><span style={{ color: MUTED }}>Angin: </span>{selectedCurrent.windspeed.toFixed(0)} km/j</div>
              <div><span style={{ color: MUTED }}>Kondisi: </span>{weatherDesc(selectedCurrent.weathercode)}</div>
            </div>
          )}
          {yearWeekly.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={yearWeekly} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={HAIRLINE} strokeDasharray="2 4" opacity={0.5} />
                <XAxis dataKey="weekNum" stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} label={{ value: "Minggu ke-", position: "insideBottom", offset: -5, fill: MUTED, fontSize: 10 }} />
                <YAxis stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} unit="°" />
                <Tooltip content={<HistoryTooltip labelKey="week" valueKey="temp" />} />
                <Line type="monotone" dataKey="temp" stroke={WARM} strokeWidth={2} dot={{ r: 2, fill: WARM }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: 12.5, color: MUTED, padding: "16px 0", lineHeight: 1.6 }}>
              Belum ada histori untuk zona ini — jalankan workflow <strong>"Backfill Weather History (2000-now)"</strong> di tab Actions.
            </div>
          )}
        </Panel>

        {/* Komparasi rata-rata per 5 tahun */}
        <Panel title={`Komparasi Rata-rata per 5 Tahun — ${selectedZone ? selectedZone.full : ""}`} style={{ marginTop: 20 }}>
          {periodBuckets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={periodBuckets} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={HAIRLINE} strokeDasharray="2 4" opacity={0.5} />
                <XAxis dataKey="label" stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} />
                <YAxis stroke={MUTED} tick={{ fontSize: 10, fontFamily: MONO_FONT, fill: MUTED }} unit="°" />
                <Tooltip content={<HistoryTooltip labelKey="label" valueKey="avg" />} />
                <Bar dataKey="avg" fill={WARM} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: 12.5, color: MUTED, padding: "16px 0", lineHeight: 1.6 }}>
              Belum ada histori untuk dihitung — jalankan backfill dulu.
            </div>
          )}
          <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>* periode berjalan, belum genap 5 tahun</p>
        </Panel>

        <p style={{ fontSize: 11, color: MUTED, marginTop: 24, lineHeight: 1.6 }}>
          Data live dari Open-Meteo Forecast API · histori mingguan 2000-sekarang dari Open-Meteo Historical Weather API + GitHub Actions · min/max 7 hari dari Open-Meteo daily forecast — digabung lewat satu endpoint <code>/api/weather</code>.
        </p>
      </div>
    </div>
  );
}
