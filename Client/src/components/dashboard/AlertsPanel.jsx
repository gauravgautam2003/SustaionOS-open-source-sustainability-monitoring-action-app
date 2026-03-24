import React from "react";
import Card from "../ui/Card";

const getStyle = (severity) => {
  const s = (severity || "").toString().toUpperCase();
  switch (s) {
    case "HIGH":
      return "border-red-500 bg-red-500/10 text-red-400";
    case "MEDIUM":
      return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
    default:
      return "border-green-500 bg-green-500/10 text-green-400";
  }
};

const AlertsPanel = ({ alerts = [] }) => {

  if (!alerts.length) {
    return (
      <Card className="p-6 text-center text-gray-500 dark:text-gray-400">
        ✅ No alerts — system running efficiently
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        🚨 System Alerts
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {alerts.map((alert, index) => (
          <Card
            key={index}
            className={`
              border p-4 rounded-xl
              transition-all duration-300
              hover:scale-[1.04] hover:shadow-xl
              ${getStyle(alert.severity)}
            `}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold capitalize">
                {alert.building || "System"}
              </h3>

              <span className="text-xs opacity-70">
                {new Date(alert.time).toLocaleTimeString()}
              </span>
            </div>

            {/* MESSAGE */}
            <p className="text-sm opacity-90">
              {alert.message}
            </p>

            {/* SEVERITY TAG */}
            <div className="mt-3">
              <span className="text-xs px-2 py-1 rounded bg-black/20">
                {alert.severity
                  ? `${alert.severity.charAt(0)}${alert.severity.slice(1).toLowerCase()}`
                  : "Low"}
              </span>
            </div>

          </Card>
        ))}

      </div>
    </div>
  );
};

export default AlertsPanel;