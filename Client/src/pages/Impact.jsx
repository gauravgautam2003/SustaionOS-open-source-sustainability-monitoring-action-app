import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { getAuthToken } from "../utils/auth";
import { Flame, Droplets, Leaf, TrendingUp, RefreshCcw } from "lucide-react";
import { apiUrl } from "../utils/api";

const Impact = () => {
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadImpact = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [reportRes, summaryRes] = await Promise.all([
        fetch(apiUrl("/api/report/data"), { headers }),
        fetch(apiUrl("/api/analytics/summary?period=month"), { headers }),
      ]);

      const reportJson = await reportRes.json();
      const summaryJson = await summaryRes.json();

      setReport(reportJson || {});
      setSummary(summaryJson?.summary ?? summaryJson ?? {});
    } catch (err) {
      console.error("Impact load failed:", err);
      setReport(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpact();
  }, []);

  if (loading) {
    return <Card className="p-8 text-center text-gray-500 dark:text-gray-400">Loading impact data...</Card>;
  }

  const energy = Number(report?.totalEnergy ?? summary?.totalEnergy ?? 0);
  const water = Number(report?.totalWater ?? summary?.totalWater ?? 0);
  const carbon = Number(report?.carbon ?? Math.round(energy * 0.82));
  const cost = Number(report?.cost ?? Math.round(energy * 8 + water * 0.02));
  const savings = Number(report?.insights?.monthlySavingsPotential ?? 0);
  const efficiency = Number(report?.insights?.score ?? 0);

  const cards = [
    { label: "Carbon footprint", value: `${carbon} kg CO2`, icon: Flame, tone: "from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-950" },
    { label: "Water used", value: `${water} L`, icon: Droplets, tone: "from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-950" },
    { label: "Energy cost", value: `Rs. ${cost}`, icon: TrendingUp, tone: "from-emerald-50 to-lime-50 dark:from-gray-900 dark:to-gray-950" },
    { label: "Savings potential", value: `Rs. ${savings}`, icon: Leaf, tone: "from-amber-50 to-yellow-50 dark:from-gray-900 dark:to-gray-950" },
  ];

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
              <Leaf size={14} />
              Impact summary
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              See the business and environmental impact of current telemetry.
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              This page translates live usage into carbon, cost, and savings potential so judges see real-world value immediately.
            </p>
          </div>
          <button onClick={loadImpact} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">
            <RefreshCcw size={16} />
            Refresh impact
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`p-5 bg-gradient-to-br ${item.tone}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                <Icon size={16} className="text-primary" />
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{item.value}</h2>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Executive interpretation</h3>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Efficiency score is currently {efficiency}%. Higher score means lower waste, lower carbon, and a healthier operating profile.
        </p>
      </Card>

      {report?.insights && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI recommendation</h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {report.insights.nextBestAction || report.recommendation || "No recommendation available yet."}
          </p>
        </Card>
      )}
    </div>
  );
};

export default Impact;
