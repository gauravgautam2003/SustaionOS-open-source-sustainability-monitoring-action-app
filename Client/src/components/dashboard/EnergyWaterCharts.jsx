// src/components/dashboard/EnergyWaterCharts.jsx
import React, { useContext, useEffect, useState } from "react";
import Card from "../ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ThemeContext } from "../../context/ThemeContext";

const ChartCard = ({ title, dataKey, color, data }) => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <Card className="h-80 md:h-96 flex flex-col hover:scale-[1.02] transition-transform duration-300 shadow-md">
      <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        ></span>
        {title}
      </h3>

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={darkMode ? "#374151" : "#E5E7EB"}
            />
            <XAxis
              dataKey="name"
              stroke={darkMode ? "#9CA3AF" : "#4B5563"}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke={darkMode ? "#9CA3AF" : "#4B5563"}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? "#111827" : "#FFFFFF",
                border: "1px solid",
                borderColor: darkMode ? "#374151" : "#E5E7EB",
                borderRadius: "10px",
                padding: "8px",
              }}
              labelStyle={{ color: darkMode ? "#F9FAFB" : "#111827" }}
              itemStyle={{ color: color, fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const EnergyWaterCharts = () => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/analytics");
        const data = await res.json();

        // Ensure backend returns array format
        const formattedData = Array.isArray(data)
          ? data
          : [
              { name: "Mon", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Tue", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Wed", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Thu", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Fri", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Sat", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
              { name: "Sun", energy: data.totalEnergy || 0, water: data.totalWater || 0 },
            ];

        setChartData(formattedData);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard
        title="Energy Consumption Trend (kWh)"
        dataKey="energy"
        color="#22C55E"
        data={chartData}
      />

      <ChartCard
        title="Water Usage Trend (Liters)"
        dataKey="water"
        color="#3B82F6"
        data={chartData}
      />
    </div>
  );
};

export default EnergyWaterCharts;