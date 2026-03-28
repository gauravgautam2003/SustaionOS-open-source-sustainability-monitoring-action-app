import React from "react";
import Card from "../ui/Card";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";
import {
  formatIncidentDeadline,
  formatIncidentOwner,
  formatIncidentWindow,
  getEscalationBadge,
  getIncidentMeta,
} from "../../utils/incidentAlert";

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

const AlertsPanel = ({ alerts = [], onAlertUpdated }) => {
  const updateAlert = async (id, payload) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(apiUrl(`/api/alerts/${id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return;
      const json = await res.json();
      if (json?.alert && onAlertUpdated) onAlertUpdated(json.alert);
    } catch (err) {
      console.error("Update alert error:", err);
    }
  };

  if (!alerts.length) {
    return (
      <Card className="p-6 text-center text-gray-500 dark:text-gray-400">
        No alerts - system running efficiently
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Alerts</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alerts.map((alert, index) => {
          const meta = getIncidentMeta(alert);
          const escalationBadge = getEscalationBadge(alert);

          return (
            <Card
              key={index}
              className={`border p-4 rounded-xl transition-all duration-300 hover:scale-[1.04] hover:shadow-xl ${getStyle(alert.severity)}`}
            >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold capitalize">{alert.building || "System"}</h3>
              <span className="text-xs opacity-70">
                {new Date(alert.time || alert.createdAt).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-sm opacity-90">{alert.message}</p>

            <div className="mt-3">
              <span className="text-xs px-2 py-1 rounded bg-black/20">
                {alert.severity
                  ? `${alert.severity.charAt(0)}${alert.severity.slice(1).toLowerCase()}`
                  : "Low"}
              </span>
              {alert.status && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-black/20">{alert.status}</span>
              )}
              {escalationBadge && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-black/20">{escalationBadge}</span>
              )}
              {meta.isOverdue && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-red-950/30 text-red-100">SLA Breached</span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs opacity-90">
              <p>Owner: {formatIncidentOwner(alert)}</p>
              <p>Response window: {formatIncidentWindow(alert)}</p>
              <p>Due by: {formatIncidentDeadline(alert)}</p>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => updateAlert(alert._id, { assignToSelf: true })}
                className="text-xs px-3 py-1 rounded bg-black/20 hover:bg-black/30 transition"
              >
                Take Ownership
              </button>
              <button
                onClick={() => updateAlert(alert._id, { escalate: true, escalationReason: "Escalated from dashboard panel." })}
                className="text-xs px-3 py-1 rounded bg-black/20 hover:bg-black/30 transition"
              >
                Escalate
              </button>
              <button
                onClick={() => updateAlert(alert._id, { status: "ACKNOWLEDGED" })}
                className="text-xs px-3 py-1 rounded bg-black/20 hover:bg-black/30 transition"
              >
                Acknowledge
              </button>
              <button
                onClick={() => updateAlert(alert._id, { status: "RESOLVED" })}
                className="text-xs px-3 py-1 rounded bg-black/20 hover:bg-black/30 transition"
              >
                Resolve
              </button>
            </div>

            {alert.rootCause && <p className="mt-3 text-xs opacity-80">Root cause: {alert.rootCause}</p>}
            {alert.estimatedLoss ? (
              <p className="mt-1 text-xs opacity-80">Estimated loss: Rs. {alert.estimatedLoss}</p>
            ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;
