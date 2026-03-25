import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import { getAuthToken } from "../utils/auth";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { apiUrl } from "../utils/api";

const toneMap = {
  HIGH: "border-red-500/20 bg-red-500/10 text-red-500",
  MEDIUM: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  LOW: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
};

const statusSteps = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

const Incidents = () => {
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
      console.error("Incident load failed:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = useMemo(
    () =>
      alerts.filter((item) => {
        const statusOk = statusFilter === "ALL" || (item.status || "OPEN") === statusFilter;
        const severityOk = severityFilter === "ALL" || (item.severity || "LOW") === severityFilter;
        return statusOk && severityOk;
      }),
    [alerts, statusFilter, severityFilter]
  );

  const openCount = alerts.filter((a) => (a.status || "OPEN") !== "RESOLVED").length;
  const criticalCount = alerts.filter(
    (a) => (a.severity || "").toUpperCase() === "HIGH" && (a.status || "OPEN") !== "RESOLVED"
  ).length;
  const resolvedCount = alerts.filter((a) => (a.status || "OPEN") === "RESOLVED").length;
  const totalLoss = alerts.reduce((sum, item) => sum + Number(item.estimatedLoss || 0), 0);

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-red-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
              <ShieldAlert size={14} />
              Incident response
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Every alert, status, and resolution in one place.
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              Use this page to monitor active incidents, verify action status, and reduce repeat waste events.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[320px]">
            {[
              { label: "Open", value: openCount, icon: AlertTriangle },
              { label: "Critical", value: criticalCount, icon: SlidersHorizontal },
              { label: "Resolved", value: resolvedCount, icon: CheckCircle2 },
              { label: "Loss", value: `Rs. ${totalLoss}`, icon: Clock3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <Icon size={14} className="text-primary" />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={loadAlerts} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">
            <RefreshCcw size={16} />
            Refresh incidents
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock3 size={16} />
            {alerts.length} tracked events
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {["ALL", ...statusSteps].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  statusFilter === status
                    ? "bg-primary text-black border-primary"
                    : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
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
                    : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">Loading incidents...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          No incidents match the selected filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((alert) => {
            const severity = (alert.severity || "LOW").toUpperCase();
            const status = (alert.status || "OPEN").toUpperCase();
            return (
              <Card key={alert._id} className="p-5 border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${toneMap[severity] || toneMap.LOW}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{alert.building || "System"}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{status}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${toneMap[severity] || toneMap.LOW}`}>{severity}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">{alert.message}</p>
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
                              <SlidersHorizontal size={14} />
                              Recommended action
                            </div>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">{alert.recommendedAction}</p>
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Incidents;
