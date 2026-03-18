import { useState, useEffect } from "react";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import LiveStats from "../components/dashboard/LiveStats";
import Card from "../components/ui/Card";
import EnergyWaterCharts from "../components/dashboard/EnergyWaterCharts";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SuggestionsPanel from "../components/dashboard/SuggestionsPanel";
import DashboardSkeleton from "../components/skeleton/DashboardSkeleton";
import AIChatWidget from "../components/ai/AIChatWidget";

const Dashboard = () => {

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [scoreData, setScoreData] = useState(null);

  // 🔥 FETCH REAL DATA
  const fetchDashboard = async () => {
    try {
      const [historyRes, scoreRes] = await Promise.all([
        fetch("http://localhost:5000/api/data/history"),
        fetch("http://localhost:5000/api/score")
      ]);

      const historyJson = await historyRes.json();
      const scoreJson = await scoreRes.json();

      setHistory(historyJson);
      setLatest(historyJson[0]); // latest record
      setScoreData(scoreJson);

    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // 🔥 AUTO REFRESH
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !latest || !scoreData) return <DashboardSkeleton />;

  // 🔥 SMART INSIGHTS
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

        {/* SCORE */}
        <div className="col-span-12 md:col-span-4">
          <SustainabilityGauge score={scoreData.score} />
        </div>

        {/* LIVE STATS */}
        <div className="col-span-12 md:col-span-8">
          <LiveStats water={latest.water} energy={latest.energy} />
        </div>

      </div>

      {/* CHARTS */}
      <div className="transition hover:scale-[1.01]">
        <EnergyWaterCharts data={history} />
      </div>

      {/* ALERTS + SUGGESTIONS */}
      <div className="grid grid-cols-12 gap-6">

        <div className="col-span-12 lg:col-span-6">
          <AlertsPanel />
        </div>

        <div className="col-span-12 lg:col-span-6">
          <SuggestionsPanel latest={latest} />
        </div>

      </div>

      {/* AI INSIGHTS */}
      <div className="grid grid-cols-12 gap-6">

        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              ⚡ Energy Insight
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {energyInsight}
            </p>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              💧 Water Insight
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {waterInsight}
            </p>
          </Card>
        </div>

      </div>

      {/* AI CHAT */}
      <AIChatWidget />

    </div>
  );
};

export default Dashboard;