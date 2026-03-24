import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import { apiUrl } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import {
  Cpu,
  Wifi,
  BatteryCharging,
  RefreshCcw,
  Radar,
  PlugZap,
  BadgeCheck,
  AlertTriangle,
  MapPin,
} from "lucide-react";

const emptyForm = {
  sensorId: "",
  name: "",
  building: "",
  location: "",
  latitude: "",
  longitude: "",
  sensorType: "multisensor",
  protocol: "HTTP",
  batteryLevel: "",
  firmwareVersion: "",
  notes: "",
  calibrationDueAt: "",
};

const samplePayload = {
  sensorId: "mq-001",
  sensorName: "Main Hall Multisensor",
  building: "Sharda College",
  location: "Main Hall",
  latitude: 23.1815,
  longitude: 79.9864,
  sensorType: "multisensor",
  protocol: "MQTT",
  water: 4520,
  energy: 2330,
  batteryLevel: 84,
  signalQuality: 92,
  timestamp: new Date().toISOString(),
};

const Sensors = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [copyState, setCopyState] = useState("Copy sample payload");

  const loadSensors = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = getAuthToken();
      if (!token) return;

      const [summaryRes, sensorsRes] = await Promise.all([
        fetch(apiUrl("/api/sensors/summary"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl("/api/sensors"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const summaryJson = await summaryRes.json().catch(() => ({}));
      const sensorsJson = await sensorsRes.json().catch(() => ({}));

      if (summaryRes.ok) setSummary(summaryJson);
      if (sensorsRes.ok) setSensors(Array.isArray(sensorsJson.sensors) ? sensorsJson.sensors : []);
    } catch (err) {
      console.error("Sensor load failed:", err);
      setMessage("Failed to load sensor network");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const registerSensor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/sensors"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setMessage(json.msg || "Sensor registration failed");
        return;
      }

      setMessage("Sensor registered successfully");
      setForm(emptyForm);
      await loadSensors();
    } catch (err) {
      console.error("Sensor register failed:", err);
      setMessage("Sensor registration failed");
    } finally {
      setSaving(false);
    }
  };

  const pingSensor = async (sensor) => {
    try {
      const token = getAuthToken();
      await fetch(apiUrl(`/api/sensors/${sensor._id}/ping`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batteryLevel: sensor.batteryLevel ?? 100,
          signalQuality: 95,
          status: "ONLINE",
        }),
      });
      await loadSensors();
    } catch (err) {
      console.error("Sensor ping failed:", err);
    }
  };

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
      setCopyState("Copied");
      setTimeout(() => setCopyState("Copy sample payload"), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyState("Copy failed");
      setTimeout(() => setCopyState("Copy sample payload"), 1500);
    }
  };

  const stats = useMemo(() => {
    const total = summary?.total ?? sensors.length;
    return [
      { label: "Registered", value: total },
      { label: "Online", value: summary?.online ?? 0 },
      { label: "Degraded", value: summary?.degraded ?? 0 },
      { label: "Offline", value: summary?.offline ?? 0 },
      { label: "Health Score", value: `${summary?.healthScore ?? 100}%` },
      { label: "Low Battery", value: summary?.lowBattery ?? 0 },
      { label: "Overdue Cal.", value: summary?.overdueCalibration ?? 0 },
    ];
  }, [summary, sensors.length]);

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-slate-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600">
              <Cpu size={14} />
              IoT Sensor Network
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Register devices now, connect real sensors later.
            </h1>
            <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">
              This layer keeps sensor identity, heartbeat, battery, and protocol metadata ready for future MQTT, HTTP, or edge-device integrations.
            </p>
          </div>
          <button
            onClick={loadSensors}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"
          >
            <RefreshCcw size={16} />
            Refresh network
          </button>
          <button
            onClick={() => navigate("/locations")}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            <MapPin size={16} />
            View map
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        {stats.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <PlugZap size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Register Sensor</h2>
          </div>
          <form onSubmit={registerSensor} className="space-y-3">
            <input
              name="sensorId"
              value={form.sensorId}
              onChange={handleChange}
              placeholder="Sensor ID"
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Sensor name"
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="building"
                value={form.building}
                onChange={handleChange}
                placeholder="Building"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Location"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                placeholder="Latitude (optional)"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                placeholder="Longitude (optional)"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="sensorType"
                value={form.sensorType}
                onChange={handleChange}
                placeholder="Sensor type"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                name="protocol"
                value={form.protocol}
                onChange={handleChange}
                placeholder="Protocol"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="batteryLevel"
                type="number"
                value={form.batteryLevel}
                onChange={handleChange}
                placeholder="Battery %"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                name="firmwareVersion"
                value={form.firmwareVersion}
                onChange={handleChange}
                placeholder="Firmware"
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <input
              name="calibrationDueAt"
              type="date"
              value={form.calibrationDueAt}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Notes"
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {message ? <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p> : null}
            <button className="w-full rounded-lg bg-primary py-3 font-semibold text-black">
              {saving ? "Registering..." : "Register Sensor"}
            </button>
          </form>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Sensor Fleet</h2>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.telemetryCount || 0} sensor-linked readings
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading sensors...</div>
          ) : sensors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No sensors registered yet. Add one now or connect a device later using the same sensorId.
            </div>
          ) : (
            <div className="space-y-3">
              {sensors.map((sensor) => (
                <div
                  key={sensor._id}
                  className="rounded-2xl border border-gray-200 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {sensor.name || sensor.sensorId}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            sensor.status === "ONLINE"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : sensor.status === "DEGRADED"
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-gray-500/15 text-gray-500"
                          }`}
                        >
                          {sensor.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {sensor.building || "Unknown building"}
                        {sensor.location ? ` · ${sensor.location}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {sensor.sensorType} · {sensor.protocol} · ID {sensor.sensorId}
                      </p>
                    </div>

                    <div className="grid min-w-[240px] grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">Battery</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {sensor.batteryLevel != null ? `${sensor.batteryLevel}%` : "N/A"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">Last seen</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => pingSensor(sensor)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <Wifi size={16} />
                        Ping
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Battery health</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {sensor.batteryLevel != null ? `${sensor.batteryLevel}%` : "Unknown"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Signal quality</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {sensor.signalQuality != null ? `${sensor.signalQuality}%` : "Unknown"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Firmware</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {sensor.firmwareVersion || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <BadgeCheck size={18} className="text-primary" />
          <h2 className="text-lg font-semibold">How this helps later</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Today you can register simulated devices and attach telemetry with a sensorId. Later, the same identifiers can be wired to MQTT, LoRa, HTTP gateways, or edge gateways without changing the data model.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Add latitude and longitude when you want the same building or sensor to appear on the Locations map.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 dark:border-gray-800">
            <BatteryCharging size={12} />
            Battery monitoring
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 dark:border-gray-800">
            <AlertTriangle size={12} />
            Offline alerts
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 dark:border-gray-800">
            <Radar size={12} />
            MQTT-ready ingest
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 dark:border-gray-800">
            <MapPin size={12} />
            Map-ready coordinates
          </span>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Future Gateway Payload</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Use this JSON later for MQTT/webhook/edge-gateway ingestion. Same fields already work with the current sensor pipeline.
            </p>
          </div>
          <button
            onClick={copyPayload}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            <Wifi size={16} />
            {copyState}
          </button>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100 dark:border-gray-800">
{JSON.stringify(samplePayload, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default Sensors;
