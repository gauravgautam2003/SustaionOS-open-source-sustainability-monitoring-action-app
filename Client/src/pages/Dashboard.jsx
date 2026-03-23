import { useState, useEffect, useContext } from "react";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import LiveStats from "../components/dashboard/LiveStats";
import Card from "../components/ui/Card";
import EnergyWaterCharts from "../components/dashboard/EnergyWaterCharts";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SuggestionsPanel from "../components/dashboard/SuggestionsPanel";
import DashboardSkeleton from "../components/skeleton/DashboardSkeleton";
import AIChatWidget from "../components/ai/AIChatWidget";
import { ThemeContext } from "../context/ThemeContext";
import { io } from "socket.io-client";

const API = "http://localhost:5000";
const socket = io(API);

const Dashboard = () => {
  const { darkMode } = useContext(ThemeContext);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [scoreData, setScoreData] = useState({
    score: 0,
    usage: { water: 0, energy: 0 },
  });
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  // ✅ FETCH DASHBOARD
  const fetchDashboard = async () => {
    try {
      setError(null);

      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      if (!user?.token) {
        setLoading(false);
        return;
      }

      const [historyRes, scoreRes] = await Promise.all([
        fetch(`${API}/api/data/history`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${API}/api/score`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      const historyJson = await historyRes.json();
      const scoreJson = await scoreRes.json();

      const histArray = Array.isArray(historyJson)
        ? historyJson
        : historyJson.history || [];

      // ✅ SORT FIX (VERY IMPORTANT)
      const sortedHistory = histArray.sort(
        (a, b) =>
          new Date(b.createdAt || b.timestamp) -
          new Date(a.createdAt || a.timestamp)
      );

      setHistory(sortedHistory);
      setLatest(sortedHistory.length ? sortedHistory[0] : null);

      setScoreData(
        scoreJson || { score: 0, usage: { water: 0, energy: 0 } }
      );
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ✅ INIT + REALTIME
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user?.token) {
      fetchDashboard();
    } else {
      setLoading(false);
    }

    // 🔁 AUTO REFRESH
    const interval = setInterval(() => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.token) fetchDashboard();
    }, 5000);

    // ⚡ REALTIME DATA
    socket.on("newData", async (data) => {
      setHistory((prev) => {
        const updated = [data, ...prev];

        // ✅ remove duplicates
        const unique = Array.from(
          new Map(updated.map((item) => [item._id, item])).values()
        );

        return unique.slice(0, 50);
      });

      setLatest(data);

      // 🔥 REFRESH SCORE
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?.token) return;

        const scoreRes = await fetch(`${API}/api/score`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (scoreRes.ok) {
          const scoreJson = await scoreRes.json();
          setScoreData(scoreJson);
        }
      } catch (err) {
        console.error("Realtime score error:", err);
      }
    });

    socket.on("newAlert", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    return () => {
      clearInterval(interval);
      socket.off("newData");
      socket.off("newAlert");
    };
  }, []);

  // ⏳ LOADING
  if (loading) return <DashboardSkeleton />;

  // ❌ ERROR
  if (error)
    return (
      <div className="p-10 text-center text-red-500 font-semibold">
        ⚠️ {error}
      </div>
    );

  // 📭 NO DATA
  if (!latest)
    return (
      <div className="p-10 text-center text-gray-500">
        No real-time data available yet.
      </div>
    );

  // 💡 INSIGHTS
  const energyInsight =
    latest.energy > 400
      ? "⚠️ High energy consumption detected. Optimize heavy appliances."
      : "✅ Energy usage is optimal.";

  const waterInsight =
    latest.water > 2000
      ? "⚠️ Water usage is high. Possible leakage or inefficiency."
      : "✅ Water usage is efficient.";

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time AI sustainability system
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last Updated:
          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* TOP GRID */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4">
          <SustainabilityGauge score={scoreData?.score || 0} />
        </div>
        <div className="col-span-12 md:col-span-8">
          <LiveStats
            water={latest.water}
            energy={latest.energy}
          />
        </div>
      </div>

      {/* ✅ FINAL FIX HERE */}
      <EnergyWaterCharts data={history.slice(0, 7)} />

      {/* ALERTS + SUGGESTIONS */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <AlertsPanel alerts={alerts} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SuggestionsPanel latest={latest} />
        </div>
      </div>

      {/* INSIGHTS */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition shadow-xl">
            <h3 className="text-lg font-semibold mb-3">⚡ Energy Insight</h3>
            <p className="text-sm">{energyInsight}</p>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition shadow-xl">
            <h3 className="text-lg font-semibold mb-3">💧 Water Insight</h3>
            <p className="text-sm">{waterInsight}</p>
          </Card>
        </div>
      </div>

      {/* AI */}
      <AIChatWidget />
    </div>
  );
};

export default Dashboard;