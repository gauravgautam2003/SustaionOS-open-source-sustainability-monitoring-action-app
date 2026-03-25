import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import { getAuthToken } from "../utils/auth";
import { Building2, ExternalLink, Layers3, MapPin, RefreshCcw, TrendingUp } from "lucide-react";
import { apiUrl } from "../utils/api";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoord = (value) => {
  const parsed = toNumber(value);
  return parsed == null ? "-" : parsed.toFixed(5);
};

const mapLinks = (lat, lng) => ({
  google: `https://www.google.com/maps?q=${lat},${lng}`,
  osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
});

const Buildings = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setHistory([]);
        return;
      }

      const res = await fetch(apiUrl("/api/data/history"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      setHistory(Array.isArray(data) ? data : data.history || []);
    } catch (err) {
      console.error("Building history load failed:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const buildings = useMemo(() => {
    const map = history.reduce((acc, item) => {
      const key = item.building || "Unknown";
      if (!acc[key]) acc[key] = { building: key, energy: 0, water: 0, count: 0, locations: new Set(), latitude: null, longitude: null };
      acc[key].energy += Number(item.energy || 0);
      acc[key].water += Number(item.water || 0);
      acc[key].count += 1;
      if (item.location) acc[key].locations.add(item.location);
      if (toNumber(item.latitude) != null && toNumber(item.longitude) != null) {
        acc[key].latitude = toNumber(item.latitude);
        acc[key].longitude = toNumber(item.longitude);
      }
      return acc;
    }, {});

    const maxLoad = Math.max(
      1,
      ...Object.values(map).map((item) => item.energy + item.water)
    );

    return Object.values(map)
      .map((item) => ({
        ...item,
        locations: Array.from(item.locations || []),
        total: item.energy + item.water,
        score: Math.max(15, Math.round(100 - ((item.energy + item.water) / maxLoad) * 70)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [history]);

  const top = buildings[0];

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-slate-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600">
              <Building2 size={14} />
              Building comparison
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Compare buildings and find the worst performer fast.
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              This view groups telemetry by building so you can quickly see where most waste is happening.
            </p>
          </div>
          <button onClick={loadHistory} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">
            <RefreshCcw size={16} />
            Refresh buildings
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Worst performer</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{top?.building || "N/A"}</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Energy {top ? top.energy : 0} kWh, water {top ? top.water : 0} L, score {top ? top.score : 0}%.
          </p>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total buildings tracked</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{buildings.length}</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            The ranking below is based on combined load and repeated usage frequency.
          </p>
        </Card>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">Loading buildings...</Card>
      ) : buildings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">No building data found yet.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {buildings.map((item, index) => (
            <Card key={item.building} className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Layers3 size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      #{index + 1} {item.building}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count} readings tracked
                    </p>
                    {item.locations?.length ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Locations: {item.locations.join(", ")}
                      </p>
                    ) : null}
                    {item.latitude != null && item.longitude != null ? (
                      <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">
                        {formatCoord(item.latitude)}, {formatCoord(item.longitude)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                    <p className="text-gray-500 dark:text-gray-400">Energy</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{item.energy} kWh</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                    <p className="text-gray-500 dark:text-gray-400">Water</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{item.water} L</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                    <p className="text-gray-500 dark:text-gray-400">Score</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{item.score}%</p>
                  </div>
                </div>

                {item.latitude != null && item.longitude != null ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={mapLinks(item.latitude, item.longitude).google}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      <ExternalLink size={12} />
                      Open in Google Maps
                    </a>
                    <a
                      href={mapLinks(item.latitude, item.longitude).osm}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                    >
                      <MapPin size={12} />
                      OpenStreetMap
                    </a>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Buildings;
