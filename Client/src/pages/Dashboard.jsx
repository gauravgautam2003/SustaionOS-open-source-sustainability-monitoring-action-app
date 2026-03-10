import { useState, useEffect } from "react";
import SustainabilityGauge from "../components/dashboard/SustainabilityGauge";
import LiveStats from "../components/dashboard/LiveStats";
import Card from "../components/ui/Card";
import EnergyWaterCharts from "../components/dashboard/EnergyWaterCharts";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SuggestionsPanel from "../components/dashboard/SuggestionsPanel";
import DashboardSkeleton from "../components/skeleton/DashboardSkeleton";
import AIChatWidget from "../components/ai/AIChatWidget"; // ✅ Import AI Chat Widget

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const score = 82;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            Real-time sustainability monitoring & performance insights
          </p>
        </div>

        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          Last Updated:{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            Just Now
          </span>
        </div>
      </div>

      {/* Top Grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <SustainabilityGauge score={score} />
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-8">
          <LiveStats />
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-6 transition-transform duration-500 hover:scale-[1.01]">
        <EnergyWaterCharts />
      </div>

      {/* Alerts & Suggestions */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 transition-transform duration-300 hover:scale-[1.02]">
          <AlertsPanel />
        </div>

        <div className="col-span-12 lg:col-span-6 transition-transform duration-300 hover:scale-[1.02]">
          <SuggestionsPanel />
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition-transform duration-300 shadow-lg">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              Energy Insight
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Energy usage remains stable with minor peak-hour fluctuations.
              Consider optimizing high-load appliances during peak hours.
            </p>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Card className="hover:scale-[1.03] transition-transform duration-300 shadow-lg">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              Water Insight
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Water consumption slightly above optimal threshold.
              Smart leak detection could improve efficiency by 8–10%.
            </p>
          </Card>
        </div>
      </div>

      {/* ✅ AI Chat Widget - Fixed bottom-right */}
      <AIChatWidget />

    </div>
  );
};

export default Dashboard;