"use client";

import { useState, useCallback, useEffect } from "react";

const ZONES = [
  { id: "arctic", name: "Arctic" },
  { id: "ny", name: "New York" },
  { id: "tokyo", name: "Tokyo" },
  { id: "riyadh", name: "Riyadh" },
  { id: "jakarta", name: "Jakarta" },
  { id: "galapagos", name: "Galapagos" },
  { id: "sydney", name: "Sydney" },
  { id: "wellington", name: "Wellington" },
  { id: "mcmurdo", name: "McMurdo" },
];

export default function Home() {
  const [zonesData, setZonesData] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setZonesData(data.zonesData);
      setHistory(data.history);
      setLastUpdated(new Date(data.fetchedAt));
    } catch (e) {
      setError("Gagal mengambil data cuaca. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Global Weather Monitor
        </h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Loading..." : "Muat Ulang"}
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {lastUpdated && (
          <div className="mb-6 text-sm text-zinc-400">
            Terakhir diperbarui: {lastUpdated.toLocaleTimeString("id-ID")}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ZONES.map((zone) => {
            const data = zonesData[zone.id];
            return (
              <div
                key={zone.id}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
              >
                <h2 className="text-lg font-semibold mb-2">{zone.name}</h2>
                {data ? (
                  <div className="space-y-1 text-sm">
                    <p>Suhu: {data.temperature}°C</p>
                    <p>Angin: {data.windspeed} km/h</p>
                    <p>Arah: {data.winddirection}°</p>
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">Data tidak tersedia</p>
                )}
              </div>
            );
          })}
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Tren Mingguan</h2>
          {Object.keys(history).length === 0 ? (
            <p className="text-zinc-500">Belum ada data histori. Tunggu snapshot pertama.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ZONES.map((zone) => {
                const zoneHistory = history[zone.id] || [];
                if (zoneHistory.length === 0) return null;
                const latest = zoneHistory[zoneHistory.length - 1];
                return (
                  <div key={zone.id} className="p-3 bg-zinc-900 rounded-lg">
                    <p className="font-medium">{zone.name}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Mingguan: {latest?.temperature ?? "?"}°C</span>
                      <span className="text-zinc-500">
                        {zoneHistory.length} minggu data
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}