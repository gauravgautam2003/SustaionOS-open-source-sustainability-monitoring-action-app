import React, { useEffect, useState } from "react";
import Card from "../ui/Card";

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/alerts");
        const data = await res.json();
        setAlerts(data || []);
      } catch (err) {
        console.error("Error fetching alerts:", err);
      }
    };
    fetchAlerts();
  }, []);

  const getStyle = type => {
    switch(type) {
      case "critical": return "border-red-500 bg-red-500/10 text-red-400";
      case "warning": return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
      default: return "border-green-500 bg-green-500/10 text-green-400";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">System Alerts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alerts.map(alert => (
          <Card key={alert.id} className={`border ${getStyle(alert.type)} p-4 transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg`}>
            <h3 className="font-semibold mb-1">{alert.title}</h3>
            <p className="text-sm opacity-80">{alert.message}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;