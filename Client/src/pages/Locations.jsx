import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import { apiUrl } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import {
  Building2,
  ExternalLink,
  LocateFixed,
  MapPin,
  Radar,
  RefreshCcw,
} from "lucide-react";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoord = (value) => {
  const parsed = toNumber(value);
  return parsed == null ? "-" : parsed.toFixed(5);
};

const buildMapLinks = (lat, lng) => ({
  google: `https://www.google.com/maps?q=${lat},${lng}`,
  osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
});

const Locations = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    try {
      const token = getAuthToken();
      if (!token) {
        setMessage("Please log in to view location map.");
        return;
      }

      const [historyRes, sensorsRes] = await Promise.all([
        fetch(apiUrl("/api/data/history"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl("/api/sensors"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const historyJson = await historyRes.json().catch(() => []);
      const sensorsJson = await sensorsRes.json().catch(() => ({}));

      if (!historyRes.ok) throw new Error(historyJson?.msg || "Failed to load history");
      if (!sensorsRes.ok) throw new Error(sensorsJson?.msg || "Failed to load sensors");

      setHistory(Array.isArray(historyJson) ? historyJson : historyJson.history || []);
      setSensors(Array.isArray(sensorsJson.sensors) ? sensorsJson.sensors : []);
    } catch (err) {
      console.error("Location map load failed:", err);
      setMessage(err.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const points = useMemo(() => {
    const grouped = new Map();

    const ingest = (item, source) => {
      const latitude = toNumber(item.latitude);
      const longitude = toNumber(item.longitude);
      if (latitude == null || longitude == null) return;

      const building = item.building || "Unknown building";
      const location = item.location || item.name || item.sensorName || item.sensorId || "Unknown location";
      const updatedAt = item.updatedAt || item.createdAt || item.timestamp || item.lastSeen || new Date().toISOString();
      const key = building.toLowerCase();
      const existing = grouped.get(key);

      const nextPoint = {
        building,
        location,
        latitude,
        longitude,
        updatedAt,
        source,
        sensorId: item.sensorId || "",
        sensorName: item.sensorName || item.name || "",
        status: item.status || "ACTIVE",
      };

      if (!existing) {
        grouped.set(key, nextPoint);
        return;
      }

      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const nextTime = new Date(updatedAt).getTime();
      if (Number.isFinite(nextTime) && nextTime >= existingTime) {
        grouped.set(key, nextPoint);
      }
    };

    history.forEach((item) => ingest(item, "Telemetry"));
    sensors.forEach((item) => ingest(item, "Sensor"));

    return Array.from(grouped.values()).sort((a, b) => a.building.localeCompare(b.building));
  }, [history, sensors]);

  const bounds = useMemo(() => {
    const coords = points.filter((point) => point.latitude != null && point.longitude != null);
    if (coords.length === 0) return null;

    const latitudes = coords.map((point) => point.latitude);
    const longitudes = coords.map((point) => point.longitude);

    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes),
    };
  }, [points]);

  const stats = useMemo(() => {
    const coordinates = points.length;
    const sensorNodes = sensors.filter((sensor) => toNumber(sensor.latitude) != null && toNumber(sensor.longitude) != null).length;
    const telemetryNodes = history.filter((item) => toNumber(item.latitude) != null && toNumber(item.longitude) != null).length;
    return [
      { label: "Mapped buildings", value: coordinates },
      { label: "Sensor nodes", value: sensorNodes },
      { label: "Telemetry points", value: telemetryNodes },
      { label: "Data records", value: history.length },
    ];
  }, [history, points, sensors]);

  const width = 1000;
  const height = 560;

  const pointPosition = (point) => {
    if (!bounds) return { x: width / 2, y: height / 2 };

    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;
    if (bounds.maxLat === bounds.minLat && bounds.maxLng === bounds.minLng) {
      return { x: width / 2, y: height / 2 };
    }
    const normalizedX = (point.longitude - bounds.minLng) / lngRange;
    const normalizedY = (point.latitude - bounds.minLat) / latRange;

    return {
      x: 80 + normalizedX * (width - 160),
      y: 80 + (1 - normalizedY) * (height - 160),
    };
  };

  const pointLink = (point) => buildMapLinks(point.latitude, point.longitude);

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-slate-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600">
              <LocateFixed size={14} />
              Building location map
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              See where each building sits on the campus map.
            </h1>
            <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">
              Store latitude and longitude on telemetry or sensor registration to pin buildings on a live map view. The same coordinates can later connect to real GPS, gateways, or IoT devices.
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"
          >
            <RefreshCcw size={16} />
            Refresh map
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <Card className="p-6 overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Campus Map</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {points.length ? `${points.length} mapped buildings` : "No coordinates yet"}
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Loading map points...
            </div>
          ) : points.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No latitude/longitude found yet. Add coordinates from the Profile telemetry form or Sensor registration form to see buildings on the map.
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-slate-950/95 p-4 dark:border-gray-800">
              <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full rounded-2xl sm:h-[340px] md:h-[420px]">
                <defs>
                  <linearGradient id="locationBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#111827" />
                  </linearGradient>
                  <linearGradient id="pinGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width={width} height={height} rx="28" fill="url(#locationBg)" />

                {Array.from({ length: 7 }).map((_, index) => {
                  const x = (width / 6) * index;
                  const y = (height / 6) * index;
                  return (
                    <g key={`grid-${index}`}>
                      <line x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.06)" strokeDasharray="6 12" />
                      <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="6 12" />
                    </g>
                  );
                })}

                {points.map((point, index) => {
                  const { x, y } = pointPosition(point);
                  return (
                    <g key={`${point.building}-${index}`} transform={`translate(${x}, ${y})`}>
                      <circle cx="0" cy="0" r="16" fill="url(#pinGlow)" opacity="0.22" />
                      <circle cx="0" cy="0" r="9" fill="#22d3ee" stroke="#fff" strokeWidth="2" />
                      <text x="18" y="-14" fill="#f8fafc" fontSize="14" fontWeight="700">
                        {point.building}
                      </text>
                      <text x="18" y="4" fill="#cbd5e1" fontSize="11">
                        {point.location}
                      </text>
                      <text x="18" y="20" fill="#7dd3fc" fontSize="10">
                        {formatCoord(point.latitude)}, {formatCoord(point.longitude)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Building Coordinates</h2>
          </div>

          {points.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Add coordinates first to generate a building list with map links.
            </div>
          ) : (
            <div className="space-y-3">
              {points.map((point) => {
                const links = pointLink(point);
                return (
                  <div key={point.building} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{point.building}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{point.location}</p>
                      </div>
                      <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-600">
                        {point.source}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Latitude</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatCoord(point.latitude)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Longitude</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatCoord(point.longitude)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={links.google}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <ExternalLink size={12} />
                        Google Maps
                      </a>
                      <a
                        href={links.osm}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <ExternalLink size={12} />
                        OpenStreetMap
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          <h2 className="text-lg font-semibold">How to use this later</h2>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Right now this is ready for manual coordinates, telemetry, and simulated sensor data. Later you can plug in GPS, gateway metadata, or campus floor-plan coordinates without changing the backend shape.
        </p>
      </Card>

      {message ? (
        <Card className="p-4 border border-amber-300/40 bg-amber-50 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {message}
        </Card>
      ) : null}
    </div>
  );
};

export default Locations;
