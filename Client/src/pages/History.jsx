import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";

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

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {

    const fetchHistory = async () => {

      try {

        const res = await fetch("http://localhost:5000/api/data/history");

        const data = await res.json();

        setLogs(data);
        setFilteredLogs(data);

      } catch (err) {

        console.error("History fetch error", err);

      } finally {

        setLoading(false);

      }

    };

    fetchHistory();

  }, []);

  useEffect(() => {

    let data = [...logs];

    if (search) {
      data = data.filter((log) =>
        log.building.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "All") {
      data = data.filter(
        (log) => getStatus(log.energy) === statusFilter
      );
    }

    setFilteredLogs(data);

  }, [search, statusFilter, logs]);

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading sustainability history...
      </p>
    );
  }

  const totalEnergy = logs.reduce((a, b) => a + b.energy, 0);
  const totalWater = logs.reduce((a, b) => a + b.water, 0);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Usage History
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Historical sustainability data logs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card>
          <p className="text-sm text-gray-500">
            Total Energy Recorded
          </p>
          <h2 className="text-2xl font-semibold mt-1">
            {totalEnergy} kWh
          </h2>
        </Card>

        <Card>
          <p className="text-sm text-gray-500">
            Total Water Recorded
          </p>
          <h2 className="text-2xl font-semibold mt-1">
            {totalWater} L
          </h2>
        </Card>

      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">

        <input
          type="text"
          placeholder="Search by building..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-200 dark:bg-gray-900
          border border-gray-300 dark:border-gray-700
          px-4 py-2 rounded-lg text-sm w-full md:w-72"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-200 dark:bg-gray-900
          border border-gray-300 dark:border-gray-700
          px-4 py-2 rounded-lg text-sm w-full md:w-48"
        >
          <option>All</option>
          <option>Optimal</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>

      </div>

      {/* Table */}
      <Card className="overflow-x-auto">

        <table className="w-full text-sm text-left">

          <thead className="text-xs uppercase border-b border-gray-300">

            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Building</th>
              <th className="px-6 py-4">Energy</th>
              <th className="px-6 py-4">Water</th>
              <th className="px-6 py-4">Status</th>
            </tr>

          </thead>

          <tbody>

            {filteredLogs.map((log) => {

              const status = getStatus(log.energy);

              return (

                <tr
                  key={log._id}
                  className="border-b border-gray-200 hover:bg-gray-200/40 transition"
                >

                  <td className="px-6 py-4">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    {log.building}
                  </td>

                  <td className="px-6 py-4">
                    {log.energy} kWh
                  </td>

                  <td className="px-6 py-4">
                    {log.water} L
                  </td>

                  <td className="px-6 py-4">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                        status
                      )}`}
                    >
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