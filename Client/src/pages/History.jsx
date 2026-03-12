import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";

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

const getStatus = (energy) => {
 if (energy > 200) return "Critical";
 if (energy > 150) return "Warning";
 return "Optimal";
};

const History = () => {

 const [logs, setLogs] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {

  const fetchHistory = async () => {

   try {

    const res = await fetch(
     "http://localhost:5000/api/data/history"
    );

    const data = await res.json();

    setLogs(data);

   } catch (err) {

    console.error("History fetch error", err);

   } finally {

    setLoading(false);

   }

  };

  fetchHistory();

 }, []);

 if (loading) {
  return <p className="text-gray-500">Loading history...</p>;
 }

 return (
  <div className="space-y-8">

   <div>
    <h1 className="text-2xl md:text-3xl font-bold">
     Usage History
    </h1>
    <p className="text-gray-600 dark:text-gray-400 mt-1">
     Historical sustainability data logs
    </p>
   </div>

   <Card className="overflow-x-auto">

    <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">

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

      {logs.map((log) => {

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