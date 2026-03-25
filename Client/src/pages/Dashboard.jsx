import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Gauge,
  Sparkles,
  TrendingUp,
  Droplets,
  Zap,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";

import { getAuthToken } from "../utils/auth";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import LiveStats from "../components/dashboard/LiveStats";
import Card from "../components/ui/Card";
import EnergyWaterCharts from "../components/dashboard/EnergyWaterCharts";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SuggestionsPanel from "../components/dashboard/SuggestionsPanel";
import DashboardSkeleton from "../components/skeleton/DashboardSkeleton";
import PredictionCard from "../components/dashboard/PredictionCard";
import ExecutiveInsightsPanel from "../components/dashboard/ExecutiveInsightsPanel";
import { apiUrl } from "../utils/api";

const socket = io(apiUrl(""));

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [scoreData, setScoreData] = useState({ score: 0, usage: { water: 0, energy: 0 } });
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const [historyRes, scoreRes, alertsRes] = await Promise.all([
        fetch(apiUrl("/api/data/history"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/score"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/alerts"), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const historyJson = await historyRes.json();
      const scoreJson = await scoreRes.json();
      const alertsJson = await alertsRes.json();

      const historyArray = Array.isArray(historyJson) ? historyJson : historyJson.history || [];
      const sortedHistory = [...historyArray].sort(
        (a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
      );

      setHistory(sortedHistory);
      setLatest(sortedHistory[0] || null);
      setScoreData(scoreJson || { score: 0, usage: { water: 0, energy: 0 } });
      setAlerts(Array.isArray(alertsJson) ? alertsJson : []);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (token) fetchDashboard();
    else setLoading(false);

    const interval = setInterval(() => {
      const currentToken = getAuthToken();
      if (currentToken) fetchDashboard();
    }, 5000);

    socket.on("newData", async (data) => {
      setHistory((prev) => {
        const updated = [data, ...prev];
        const unique = Array.from(new Map(updated.map((item) => [item._id, item])).values());
        return unique
          .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
          .slice(0, 50);
      });
      setLatest(data);

      try {
        const currentToken = getAuthToken();
        if (!currentToken) return;
        const scoreRes = await fetch(apiUrl("/api/score"), {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (scoreRes.ok) {
          const scoreJson = await scoreRes.json();
          setScoreData(scoreJson);
        }
      } catch (err) {
        console.error("Realtime score error:", err);
      }
    });

    socket.on("newAlert", (alert) => setAlerts((prev) => [alert, ...prev]));

    return () => {
      clearInterval(interval);
      socket.off("newData");
      socket.off("newAlert");
    };
  }, []);

  const handleAlertUpdated = (updatedAlert) => {
    setAlerts((prev) =>
      prev
        .map((item) => (item._id === updatedAlert._id ? updatedAlert : item))
        .sort((a, b) => new Date(b.time || b.createdAt) - new Date(a.time || a.createdAt))
    );
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="p-10 text-center text-red-500 font-semibold">{error}</div>;
  if (!latest) return <div className="p-10 text-center text-gray-500">No real-time data available yet.</div>;

  const activeAlertsCount = alerts.filter((a) => (a.status || "OPEN") !== "RESOLVED").length;
  const criticalAlertsCount = alerts.filter(
    (a) => (a.severity || "").toUpperCase() === "HIGH" && (a.status || "OPEN") !== "RESOLVED"
  ).length;
  const latestWithLocation =
    history.find((item) => item.location || item.latitude != null || item.longitude != null) || latest || null;

  const energyInsight =
    latest.energy > 400
      ? "High energy consumption detected. Optimize heavy appliances."
      : "Energy usage is within the healthy range.";
  const waterInsight =
    latest.water > 2000
      ? "Water usage is high. Possible leakage or inefficiency."
      : "Water usage is within the healthy range.";

  const quickStats = [
    {
      label: "Latest Building",
      value: latest.building || "Unknown",
      meta: [
        latest.location || latestWithLocation?.location || "Location not set",
        latest.sensorId ? `Sensor ${latest.sensorId}` : null,
        latestWithLocation?.latitude != null && latestWithLocation?.longitude != null
          ? `${Number(latestWithLocation.latitude).toFixed(4)}, ${Number(latestWithLocation.longitude).toFixed(4)}`
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
      icon: Gauge,
    },
    {
      label: "Active Alerts",
      value: activeAlertsCount,
      icon: Bell,
    },
    {
      label: "Critical",
      value: criticalAlertsCount,
      icon: Sparkles,
    },
    {
      label: "Score",
      value: `${scoreData?.score || 0}%`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn relative">
      <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute top-36 -left-12 w-52 h-52 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <Card className="relative overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white via-white to-primary/5 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-black dark:text-white">
                <Sparkles size={14} />
                Live AI campus sustainability hub
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                One view for energy, water, alerts, and action.
              </h1>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl">
                Monitor your campus in real time, catch waste spikes early, and turn telemetry into decisions the team can act on.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live score {scoreData?.score || 0}%
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
                  {activeAlertsCount} active alerts
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
                  {latest.building || "Unknown building"} live now
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[420px] xl:shrink-0">
              {quickStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-gray-200 bg-white/70 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                      <Icon size={14} className="text-primary" />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {item.value}
                    </p>
                    {item.meta ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{item.meta}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("alerts-section")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black shadow-sm shadow-primary/20 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Bell size={16} />
              Review alerts
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => document.getElementById("insights-section")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
            >
              <Gauge size={16} />
              Open insights
            </button>
            <button
              onClick={() => document.getElementById("forecast-section")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
            >
              <TrendingUp size={16} />
              Forecast
            </button>
            <button
              onClick={() => navigate("/locations")}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-300 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
            >
              <Gauge size={16} />
              View map
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4">
          <SustainabilityGauge score={scoreData?.score || 0} />
        </div>
        <div className="col-span-12 md:col-span-8">
          <LiveStats water={latest.water} energy={latest.energy} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Operational Snapshot</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A quick view of live telemetry, alert pressure, and current usage state.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live data refreshing automatically
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-green-50/60 dark:from-gray-900 dark:to-gray-950">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap size={16} />
            Energy status
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{energyInsight}</p>
        </Card>
        <Card className="p-5 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-blue-50/60 dark:from-gray-900 dark:to-gray-950">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Droplets size={16} />
            Water status
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{waterInsight}</p>
        </Card>
        <Card className="p-5 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-primary/10 dark:from-gray-900 dark:to-gray-950">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Bell size={16} />
            Alert pressure
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {criticalAlertsCount > 0
              ? `${criticalAlertsCount} critical events need action`
              : "No critical events right now"}
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Usage Trends</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last 7 telemetry points for a quick operational snapshot.
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
        <EnergyWaterCharts data={history.slice(0, 7)} />
      </div>

      <div id="forecast-section" className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <PredictionCard />
        </div>
      </div>

      <div id="insights-section">
        <ExecutiveInsightsPanel period="week" />
      </div>

      <div id="alerts-section" className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <AlertsPanel alerts={alerts} onAlertUpdated={handleAlertUpdated} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SuggestionsPanel latest={latest} />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
