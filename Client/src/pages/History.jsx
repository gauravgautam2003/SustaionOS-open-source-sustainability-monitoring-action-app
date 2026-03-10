import React from "react";
import Card from "../components/ui/Card";

const logs = [
  {
    id: 1,
    date: "2026-03-01",
    energy: "320 kWh",
    water: "1100 L",
    status: "Optimal",
  },
  {
    id: 2,
    date: "2026-03-02",
    energy: "410 kWh",
    water: "1350 L",
    status: "Warning",
  },
  {
    id: 3,
    date: "2026-03-03",
    energy: "450 kWh",
    water: "1500 L",
    status: "Critical",
  },
];

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

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search by date..."
          className="bg-gray-200 dark:bg-gray-900
                     border border-gray-300 dark:border-gray-700
                     text-gray-900 dark:text-white
                     px-4 py-2 rounded-lg text-sm
                     w-full md:w-72
                     transition-colors duration-300"
        />

        <select
          className="bg-gray-200 dark:bg-gray-900
                     border border-gray-300 dark:border-gray-700
                     text-gray-900 dark:text-white
                     px-4 py-2 rounded-lg text-sm
                     w-full md:w-48
                     transition-colors duration-300"
        >
          <option>All Status</option>
          <option>Optimal</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-800">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Energy</th>
              <th className="px-6 py-4">Water</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-gray-200 dark:border-gray-800 
                           hover:bg-gray-200/50 dark:hover:bg-gray-800/40 
                           transition"
              >
                <td className="px-6 py-4">{log.date}</td>
                <td className="px-6 py-4">{log.energy}</td>
                <td className="px-6 py-4">{log.water}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

    </div>
  );
};

export default History;