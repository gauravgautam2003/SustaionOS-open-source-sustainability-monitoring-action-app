// src/pages/Analytics.jsx
import React, { useContext, useState, useEffect } from "react";
import Card from "../components/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { ThemeContext } from "../context/ThemeContext";

const Analytics = () => {
  const { darkMode } = useContext(ThemeContext);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [scoreData, setScoreData] = useState({});
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Backend fetch paths corrected
        const summaryRes = await fetch("/api/analytics/summary");
        const summaryJson = await summaryRes.json();
        if (!summaryJson.msg) setSummary(summaryJson);

        const scoreRes = await fetch("/api/analytics/score");
        const scoreJson = await scoreRes.json();
        setScoreData(scoreJson);

        const trendRes = await fetch("/api/analytics/trend");
        const trendJson = await trendRes.json();
        setTrendData(
          trendJson.map((item) => ({
            month: new Date(item.date).toLocaleString("default", {
              month: "short",
            }),
            energy: item.energy,
            water: item.water,
          }))
        );
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-24 bg-gray-300 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="h-96 bg-gray-300 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics & Insights</h1>
          <p className={`mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Deep sustainability performance analysis
          </p>
        </div>

        <select
          className={`bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-700
            text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm
            w-full md:w-auto transition-colors duration-300`}
        >
          <option>Last 6 Months</option>
          <option>Last 12 Months</option>
          <option>This Year</option>
        </select>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:scale-105 transition-transform duration-300">
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Avg Energy Usage
          </p>
          <h2 className="text-2xl font-semibold mt-2">{summary.avgEnergy} kWh</h2>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-300">
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Avg Water Usage
          </p>
          <h2 className="text-2xl font-semibold mt-2">{summary.avgWater} L</h2>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-300">
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Carbon Footprint
          </p>
          <h2 className="text-2xl font-semibold mt-2">
            {scoreData.usage?.energy + scoreData.usage?.water} units
          </h2>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-300">
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Efficiency Score
          </p>
          <h2 className="text-2xl font-semibold mt-2 text-green-500">{scoreData.score}%</h2>
          <p className="text-sm mt-1">{scoreData.status}</p>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="h-96 flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Energy & Water Trend</h3>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#d1d5db"} />
              <XAxis dataKey="month" stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
              <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? "#111827" : "#ffffff",
                  border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "10px",
                }}
              />
              <Line type="monotone" dataKey="energy" stroke="#22C55E" strokeWidth={3} />
              <Line type="monotone" dataKey="water" stroke="#3B82F6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bar Chart */}
      <Card className="h-96 flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Monthly Energy Comparison</h3>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#d1d5db"} />
              <XAxis dataKey="month" stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
              <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? "#111827" : "#ffffff",
                  border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "10px",
                }}
              />
              <Bar dataKey="energy" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;