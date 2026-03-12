import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { Line } from "react-chartjs-2";
import { io } from "socket.io-client";

import {
 Chart as ChartJS,
 LineElement,
 CategoryScale,
 LinearScale,
 PointElement,
 Tooltip,
 Legend
} from "chart.js";

ChartJS.register(
 LineElement,
 CategoryScale,
 LinearScale,
 PointElement,
 Tooltip,
 Legend
);

const socket = io("http://localhost:5000");

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

 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState("All");
 const [loading, setLoading] = useState(true);

 useEffect(() => {

  const fetchHistory = async () => {

   try {

    const res = await fetch(
     "http://localhost:5000/api/data/history"
    );

    const data = await res.json();

    setLogs(data);
    setFilteredLogs(data);

   } catch (err) {

    console.error(err);

   } finally {

    setLoading(false);

   }

  };

  fetchHistory();

  // realtime updates
  socket.on("newData", (data) => {

   setLogs((prev) => [data, ...prev]);

  });

 }, []);

 useEffect(() => {

  let data = [...logs];

  if (search) {

   data = data.filter((log) =>
    log.building
     .toLowerCase()
     .includes(search.toLowerCase())
   );

  }

  if (statusFilter !== "All") {

   data = data.filter(
    (log) => getStatus(log.energy) === statusFilter
   );

  }

  setFilteredLogs(data);

 }, [search, statusFilter, logs]);

 const exportCSV = () => {

  const rows = [
   ["Date", "Building", "Energy", "Water"]
  ];

  filteredLogs.forEach((log) => {

   rows.push([
    new Date(log.timestamp).toLocaleDateString(),
    log.building,
    log.energy,
    log.water
   ]);

  });

  const csv =
   "data:text/csv;charset=utf-8," +
   rows.map((e) => e.join(",")).join("\n");

  const link = document.createElement("a");

  link.href = encodeURI(csv);

  link.download = "history.csv";

  document.body.appendChild(link);

  link.click();

 };

 if (loading) {

  return (
   <p className="text-gray-500">
    Loading history...
   </p>
  );

 }

 const chartData = {
  labels: filteredLogs.map((l) =>
   new Date(l.timestamp).toLocaleDateString()
  ),
  datasets: [
   {
    label: "Energy Usage",
    data: filteredLogs.map((l) => l.energy),
    borderColor: "#3b82f6",
    tension: 0.3
   },
   {
    label: "Water Usage",
    data: filteredLogs.map((l) => l.water),
    borderColor: "#10b981",
    tension: 0.3
   }
  ]
 };

 const totalEnergy = logs.reduce(
  (a, b) => a + b.energy,
  0
 );

 const totalWater = logs.reduce(
  (a, b) => a + b.water,
  0
 );

 return (
  <div className="space-y-8">

   {/* Header */}

   <div className="flex justify-between items-center">

    <div>
     <h1 className="text-2xl md:text-3xl font-bold">
      Usage History
     </h1>
     <p className="text-gray-500">
      Sustainability logs and analytics
     </p>
    </div>

    <button
     onClick={exportCSV}
     className="bg-primary px-4 py-2 rounded-lg"
    >
     Export CSV
    </button>

   </div>

   {/* Summary */}

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

    <Card>

     <p className="text-sm text-gray-500">
      Total Energy
     </p>

     <h2 className="text-2xl font-semibold">
      {totalEnergy} kWh
     </h2>

    </Card>

    <Card>

     <p className="text-sm text-gray-500">
      Total Water
     </p>

     <h2 className="text-2xl font-semibold">
      {totalWater} L
     </h2>

    </Card>

   </div>

   {/* Chart */}

   <Card>

    <Line data={chartData} />

   </Card>

   {/* Filters */}

   <div className="flex flex-col md:flex-row gap-4">

    <input
     type="text"
     placeholder="Search building..."
     value={search}
     onChange={(e) =>
      setSearch(e.target.value)
     }
     className="bg-gray-200 dark:bg-gray-900 border px-4 py-2 rounded-lg"
    />

    <select
     value={statusFilter}
     onChange={(e) =>
      setStatusFilter(e.target.value)
     }
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

    <table className="w-full text-sm">

     <thead className="border-b">

      <tr>
       <th className="px-6 py-4">
        Date
       </th>

       <th className="px-6 py-4">
        Building
       </th>

       <th className="px-6 py-4">
        Energy
       </th>

       <th className="px-6 py-4">
        Water
       </th>

       <th className="px-6 py-4">
        Status
       </th>
      </tr>

     </thead>

     <tbody>

      {filteredLogs.map((log) => {

       const status = getStatus(
        log.energy
       );

       return (

        <tr
         key={log._id}
         className="border-b hover:bg-gray-200/30"
        >

         <td className="px-6 py-4">
          {new Date(
           log.timestamp
          ).toLocaleDateString()}
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