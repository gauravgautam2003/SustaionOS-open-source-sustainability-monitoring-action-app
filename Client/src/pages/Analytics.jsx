import React, { useContext, useState, useEffect } from "react";
import Card from "../components/ui/Card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar
} from "recharts";
import { ThemeContext } from "../context/ThemeContext";

const Analytics = () => {
  const { darkMode } = useContext(ThemeContext);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [scoreData, setScoreData] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [period, setPeriod] = useState("6"); // default last 6 months
  const [error, setError] = useState("");

  const normalizeTrendArray = (raw) => {
    const arr = Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
      : Array.isArray(raw?.trend) ? raw.trend
      : [];
    return arr.map(item => {
      const dateVal = item?.date ?? item?.createdAt ?? item?.timestamp ?? item?.time ?? item?.label ?? null;
      let parsed = null;
      if (dateVal != null) {
        if (typeof dateVal === "number") parsed = dateVal < 1e12 ? new Date(dateVal * 1000) : new Date(dateVal);
        else parsed = new Date(String(dateVal));
      }
      const label = parsed && !isNaN(parsed.getTime())
        ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : (item?.label ?? "Unknown");
      return {
        date: label,
        energy: Number(item?.energy ?? item?.energy_kwh ?? 0) || 0,
        water: Number(item?.water ?? item?.water_liters ?? 0) || 0,
        rawTime: parsed && !isNaN(parsed.getTime()) ? parsed.getTime() : null,
      };
    }).sort((a, b) => (a.rawTime || 0) - (b.rawTime || 0));
  };

  const fetchAnalytics = async (selectedPeriod = period) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token"); // ensure token set after login
      const doFetch = async (url) => {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { method: "GET", headers, credentials: "include" });
        if (!res.ok) throw new Error(`${url} returned ${res.status}`);
        return await res.json();
      };

      const summaryJson = await doFetch(`/api/analytics/summary?period=${selectedPeriod}`);
      setSummary(summaryJson?.summary ?? summaryJson ?? {});

      const scoreJson = await doFetch(`/api/analytics/score`);
      setScoreData(scoreJson ?? { score: 0, usage: { energy: 0, water: 0 } });

      const trendJson = await doFetch(`/api/analytics/trend?period=${selectedPeriod}`);
      const normalized = normalizeTrendArray(trendJson);
      setTrendData(normalized);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      if (err.message.includes("401")) {
        setError("Unauthorized — please login.");
        // optional redirect: window.location.href = "/login";
      } else {
        setError("Failed to load analytics. Try refreshing.");
      }
      setSummary({});
      setScoreData({});
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) return <div className="text-center text-gray-500 p-10">Loading Analytics...</div>;
  if (error) return <div className="text-center text-red-500 p-10">{error}</div>;
  if (trendData.length === 0) return <div className="text-center text-gray-500 p-10">No data available for this period.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics & Insights</h1>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} mt-1`}>
            Deep sustainability performance analysis
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={`bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-700
            text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm w-full md:w-auto transition-colors`}
        >
          <option value="6">Last 6 Months</option>
          <option value="12">Last 12 Months</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Energy Usage</p>
          <h2 className="text-2xl font-semibold mt-2">{summary.avgEnergy ?? 0} kWh</h2>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Water Usage</p>
          <h2 className="text-2xl font-semibold mt-2">{summary.avgWater ?? 0} L</h2>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Carbon Footprint</p>
          <h2 className="text-2xl font-semibold mt-2">
            {(scoreData.usage?.energy ?? 0) + (scoreData.usage?.water ?? 0)} units
          </h2>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Efficiency Score</p>
          <h2 className="text-2xl font-semibold mt-2 text-green-500">{scoreData.score ?? 0}%</h2>
        </Card>
      </div>

      <Card className="h-96 flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Energy & Water Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#d1d5db"} />
            <XAxis dataKey="date" stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
            <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? "#111827" : "#ffffff",
                border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                borderRadius: 10,
              }}
            />
            <Line type="monotone" dataKey="energy" stroke="#22C55E" strokeWidth={3} />
            <Line type="monotone" dataKey="water" stroke="#3B82F6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="h-96 flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Monthly Energy Comparison</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#d1d5db"} />
            <XAxis dataKey="date" stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
            <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? "#111827" : "#ffffff",
                border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                borderRadius: 10,
              }}
            />
            <Bar dataKey="energy" fill="#22C55E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Analytics;