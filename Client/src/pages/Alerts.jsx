import React, { useEffect, useMemo, useState, useContext } from "react";
import Card from "../components/ui/Card";
import { ThemeContext } from "../context/ThemeContext";
import { getAuthToken } from "../utils/auth";
import { apiUrl } from "../utils/api";
import {
  Bell,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Layers3,
  RotateCcw,
  Siren,
  UserCheck,
  Clock3,
} from "lucide-react";
import {
  formatIncidentDeadline,
  formatIncidentOwner,
  formatIncidentWindow,
  getEscalationBadge,
  getIncidentMeta,
} from "../utils/incidentAlert";

const statusOrder = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

const severityTone = {
  HIGH: "text-red-500 bg-red-500/10 border-red-500/20",
  MEDIUM: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  LOW: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
};

const Alerts = () => {
  const { darkMode } = useContext(ThemeContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setAlerts([]);
        return;
      }

      const res = await fetch(apiUrl("/api/alerts"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Alerts load failed:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

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
      if (json?.alert) {
        setAlerts((prev) => prev.map((item) => (item._id === json.alert._id ? json.alert : item)));
      }
    } catch (err) {
      console.error("Alert update failed:", err);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const statusOk = statusFilter === "ALL" || (alert.status || "OPEN") === statusFilter;
      const severityOk = severityFilter === "ALL" || (alert.severity || "LOW") === severityFilter;
      return statusOk && severityOk;
    });
  }, [alerts, statusFilter, severityFilter]);

  const activeAlerts = alerts.filter((a) => (a.status || "OPEN") !== "RESOLVED");
  const criticalAlerts = alerts.filter(
    (a) => (a.severity || "").toUpperCase() === "HIGH" && (a.status || "OPEN") !== "RESOLVED"
  );
  const escalatedAlerts = alerts.filter((a) => getIncidentMeta(a).escalationLevel > 0 && (a.status || "OPEN") !== "RESOLVED");
  const breachedAlerts = alerts.filter((a) => getIncidentMeta(a).isOverdue && (a.status || "OPEN") !== "RESOLVED");
  const totalLoss = alerts.reduce((sum, alert) => sum + Number(alert.estimatedLoss || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            Operations
          </p>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-3">
            <Bell className="text-primary" size={28} />
            Alert Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track incidents, acknowledge issues, and close the loop on sustainability events.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black font-medium"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
          <h2 className="text-3xl font-bold mt-2">{activeAlerts.length}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Critical Alerts</p>
          <h2 className="text-3xl font-bold mt-2 text-red-500">{criticalAlerts.length}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Loss</p>
          <h2 className="text-3xl font-bold mt-2">Rs. {totalLoss}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
          <h2 className="text-3xl font-bold mt-2 text-emerald-500">
            {alerts.filter((a) => (a.status || "OPEN") === "RESOLVED").length}
          </h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Escalated</p>
          <h2 className="text-3xl font-bold mt-2 text-amber-500">{escalatedAlerts.length}</h2>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">SLA Breached</p>
          <h2 className="text-3xl font-bold mt-2 text-red-500">{breachedAlerts.length}</h2>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {["ALL", ...statusOrder].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  statusFilter === status
                    ? "bg-primary text-black border-primary"
                    : darkMode
                      ? "border-gray-700 text-gray-300"
                      : "border-gray-300 text-gray-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((severity) => (
              <button
                key={severity}
                onClick={() => setSeverityFilter(severity)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  severityFilter === severity
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : darkMode
                      ? "border-gray-700 text-gray-300"
                      : "border-gray-300 text-gray-700"
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading alerts...
        </Card>
      ) : filteredAlerts.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          No alerts match the selected filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert._id} className="p-5">
              {(() => {
                const meta = getIncidentMeta(alert);
                const escalationBadge = getEscalationBadge(alert);
                return (
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                      severityTone[(alert.severity || "LOW").toUpperCase()] || severityTone.LOW
                    }`}
                  >
                    {(alert.severity || "").toUpperCase() === "HIGH" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <Activity size={18} />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{alert.building || "System"}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        {alert.status || "OPEN"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          severityTone[(alert.severity || "LOW").toUpperCase()] || severityTone.LOW
                        }`}
                      >
                        {alert.severity || "LOW"}
                      </span>
                      {escalationBadge ? (
                        <span className="text-xs px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-500">
                          {escalationBadge}
                        </span>
                      ) : null}
                      {meta.isOverdue ? (
                        <span className="text-xs px-2 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-500">
                          SLA BREACHED
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
                      {alert.message}
                    </p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <UserCheck size={14} />
                          Incident owner
                        </div>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">{formatIncidentOwner(alert)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Clock3 size={14} />
                          Response window
                        </div>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">{formatIncidentWindow(alert)}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatIncidentDeadline(alert)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Siren size={14} />
                          Escalation
                        </div>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                          {escalationBadge || "Monitoring"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {alert.rootCause && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 font-medium">
                            <ShieldAlert size={14} />
                            Root cause
                          </div>
                          <p className="mt-1 text-gray-600 dark:text-gray-400">{alert.rootCause}</p>
                        </div>
                      )}
                      {alert.recommendedAction && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Layers3 size={14} />
                            Recommended action
                          </div>
                          <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {alert.recommendedAction}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(alert.time || alert.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm font-semibold">Rs. {alert.estimatedLoss || 0}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateAlert(alert._id, { assignToSelf: true })}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                    >
                      Take ownership
                    </button>
                    <button
                      onClick={() => updateAlert(alert._id, { escalate: true, escalationReason: "Escalated from alert center." })}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm"
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => updateAlert(alert._id, { status: "ACKNOWLEDGED" })}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => updateAlert(alert._id, { status: "IN_PROGRESS" })}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => updateAlert(alert._id, { status: "RESOLVED" })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
                );
              })()}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
