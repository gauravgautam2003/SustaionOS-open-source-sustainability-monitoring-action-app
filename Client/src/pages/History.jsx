import React, { useEffect, useState, useContext } from "react";
import Card from "../components/ui/Card";
import { Line } from "react-chartjs-2";
import { AuthContext } from "../context/auth-context";
import socket from "../utils/socket";
import { apiUrl } from "../utils/api";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const getStatus = (energy) => {
  if (energy > 200) return "Critical";
  if (energy > 150) return "Warning";
  return "Optimal";
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Critical":
      return "bg-red-500/20 text-red-500";
    case "Warning":
      return "bg-yellow-500/20 text-yellow-500";
    default:
      return "bg-green-500/20 text-green-500";
  }
};

const History = () => {
  const { user } = useContext(AuthContext);

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // Fetch history
  useEffect(() => {
    if (!user?.token) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(apiUrl("/api/data/history"), {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();

        const historyArray = Array.isArray(data)
          ? data
          : Array.isArray(data.history)
          ? data.history
          : [];
        setLogs(historyArray);
        setFilteredLogs(historyArray);
      } catch (err) {
        console.error("History fetch error:", err);
        setLogs([]);
        setFilteredLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Realtime updates
    if (!socket.connected) socket.connect();
    socket.on("newData", (newData) => {
      if (newData.userId !== user._id) return;
      setLogs((prev) => [newData, ...prev]);
    });

    return () => socket.off("newData");
  }, [user]);

  // Filter logs
  useEffect(() => {
    let data = [...logs];
    if (search) data = data.filter((log) => log.building?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "All") data = data.filter((log) => getStatus(log.energy) === statusFilter);
    setFilteredLogs(data);
  }, [search, statusFilter, logs]);

  // Export CSV
  const exportCSV = () => {
    const rows = [["Date", "Building", "Location", "Energy", "Water"]];
    filteredLogs.forEach((log) => {
      const date = new Date(log.createdAt || log.timestamp || Date.now()).toLocaleDateString();
      rows.push([date, log.building, log.location || "", log.energy, log.water]);
    });
    const csv = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "history.csv";
    document.body.appendChild(link);
    link.click();
  };

  if (loading) return <p className="text-gray-500">Loading history...</p>;

  const chartData = {
    labels: filteredLogs.map((l) => new Date(l.createdAt || l.timestamp || Date.now()).toLocaleDateString()),
    datasets: [
      { label: "Energy Usage", data: filteredLogs.map((l) => l.energy), borderColor: "#3b82f6", tension: 0.3 },
      { label: "Water Usage", data: filteredLogs.map((l) => l.water), borderColor: "#10b981", tension: 0.3 },
    ],
  };

  const totalEnergy = logs.reduce((a, b) => a + b.energy, 0);
  const totalWater = logs.reduce((a, b) => a + b.water, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Usage History</h1>
          <p className="text-gray-500">Sustainability logs and analytics</p>
        </div>
        <button onClick={exportCSV} className="w-full rounded-lg bg-primary px-4 py-2 sm:w-auto">
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-gray-500">Total Energy</p>
          <h2 className="text-2xl font-semibold">{totalEnergy} kWh</h2>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Water</p>
          <h2 className="text-2xl font-semibold">{totalWater} L</h2>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="overflow-hidden">
        <h3 className="text-lg font-semibold mb-4">Energy & Water Trend</h3>
        <div className="relative h-72 sm:h-80 md:h-96">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            }}
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          type="text"
          placeholder="Search building..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-200 dark:bg-gray-900 border px-4 py-2 rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-200 dark:bg-gray-900 border px-4 py-2 rounded-lg"
        >
          <option>All</option>
          <option>Optimal</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Building</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Energy</th>
              <th className="px-6 py-4">Water</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const status = getStatus(log.energy);
              const date = new Date(log.createdAt || log.timestamp || Date.now()).toLocaleDateString();
              return (
                <tr key={log._id} className="border-b hover:bg-gray-200/30">
                  <td className="px-6 py-4">{date}</td>
                  <td className="px-6 py-4">{log.building}</td>
                  <td className="px-6 py-4">{log.location || "-"}</td>
                  <td className="px-6 py-4">{log.energy} kWh</td>
                  <td className="px-6 py-4">{log.water} L</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default History;
