import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BatteryWarning,
  Building2,
  CheckCircle2,
  IndianRupee,
  Leaf,
  Radar,
  RefreshCcw,
  ShieldAlert,
  Siren,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";

import Card from "../components/ui/Card";
import { getAuthToken } from "../utils/auth";
import { apiUrl } from "../utils/api";

const numberFormatter = new Intl.NumberFormat("en-IN");

const riskTone = {
  Low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  Moderate: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  High: "border-orange-500/20 bg-orange-500/10 text-orange-600",
  Critical: "border-red-500/20 bg-red-500/10 text-red-500",
};

const urgencyTone = {
  Immediate: "border-red-500/20 bg-red-500/10 text-red-500",
  Today: "border-orange-500/20 bg-orange-500/10 text-orange-500",
  "This Week": "border-cyan-500/20 bg-cyan-500/10 text-cyan-600",
  Monitor: "border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const formatCount = (value) => numberFormatter.format(Number(value || 0));

const Recommendations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMissionControl = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setData(null);
        return;
      }

      const res = await fetch(apiUrl("/api/analytics/command-center?period=week"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load mission control");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Mission control load failed:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissionControl();
  }, []);

  const topHotspot = data?.hotspots?.[0] || null;
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Live";

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_35%,#ecfccb_100%)] dark:bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#052e16_100%)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles size={14} />
              Mission control
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
              Turn live sustainability signals into an execution plan the team can run today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 md:text-base">
              Telemetry, incidents, sensor reliability, and ROI are fused into one daily operating brief so nothing important gets lost between dashboards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300">
              Refreshed {generatedAt}
            </div>
            <button
              onClick={loadMissionControl}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh mission control"}
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Building the command-center brief from telemetry, incidents, and AI insights...
        </Card>
      ) : !data ? (
        <Card className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Mission control is waiting on telemetry. Add live readings to unlock hotspot ranking and ROI planning.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Portfolio score",
                value: `${data.portfolio?.score || 0}%`,
                meta: data.portfolio?.riskLevel || "Low risk",
                icon: Radar,
              },
              {
                label: "Savings opportunity",
                value: `Rs. ${formatCount(data.portfolio?.monthlySavingsOpportunity)}`,
                meta: `${data.portfolio?.atRiskBuildings || 0} buildings at risk`,
                icon: IndianRupee,
              },
              {
                label: "Carbon recovery",
                value: `${formatCount(data.portfolio?.carbonOpportunity)} kg`,
                meta: "monthly reduction opportunity",
                icon: Leaf,
              },
              {
                label: "Sensor confidence",
                value: `${data.portfolio?.sensorHealthScore || 0}%`,
                meta: `${data.portfolio?.unhealthySensors || 0} weak sensors`,
                icon: BatteryWarning,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-5 border border-gray-200/80 dark:border-gray-800/80">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                    <Icon size={18} className="text-primary" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.meta}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <Card className="p-6 border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[data.portfolio?.riskLevel || "Low"] || riskTone.Low}`}>
                  {data.portfolio?.riskLevel || "Low"} risk
                </span>
                <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {data.windowDays || 7}-day operating window
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
                {data.story?.headline}
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                {data.story?.brief}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next best action</p>
                  <p className="mt-2 text-sm font-medium text-white">{data.story?.nextBestAction}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue incidents</p>
                  <p className="mt-2 text-2xl font-bold text-white">{data.portfolio?.overdueIncidents || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Estimated current loss</p>
                  <p className="mt-2 text-2xl font-bold text-white">Rs. {formatCount(data.portfolio?.estimatedLoss)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Users size={16} />
                Team queue
              </div>
              <div className="mt-4 space-y-3">
                {data.teamQueues?.length ? (
                  data.teamQueues.map((team) => (
                    <div key={team.team} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{team.team}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{team.focus}</p>
                        </div>
                        <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          {team.openActions} open
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {team.urgentActions} urgent action{team.urgentActions === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Team queues will appear here once the platform can rank live actions.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ranked hotspots</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Where waste, alert pressure, and telemetry confidence combine into the strongest intervention opportunities.
                </p>
              </div>
              {topHotspot ? (
                <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 lg:inline-flex">
                  <ArrowRight size={16} className="text-primary" />
                  Focus first on {topHotspot.building}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.hotspots?.length ? (
                data.hotspots.map((item) => (
                  <Card key={item.building} className="p-6 border border-gray-200/80 dark:border-gray-800/80">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.building}</h3>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyTone[item.urgency] || urgencyTone.Monitor}`}>
                            {item.urgency}
                          </span>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[item.riskLevel] || riskTone.Low}`}>
                            {item.riskScore}/100
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.issue}</p>
                        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{item.recommendedAction}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[220px]">
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <IndianRupee size={14} />
                            Savings
                          </div>
                          <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                            Rs. {formatCount(item.opportunity?.monthlySavings)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Leaf size={14} />
                            Carbon
                          </div>
                          <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                            {formatCount(item.opportunity?.carbonReduction)} kg
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Waves size={14} />
                            Water
                          </div>
                          <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                            {formatCount(item.opportunity?.waterRecovery)} L
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <BatteryWarning size={14} />
                            Sensors
                          </div>
                          <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                            {item.sensorHealthScore}% health
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.owner}
                      </span>
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.responseWindow}
                      </span>
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.activeAlerts} open alerts
                      </span>
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.overdueIncidents} overdue
                      </span>
                    </div>

                    {item.evidence?.length ? (
                      <div className="mt-5 grid grid-cols-1 gap-2">
                        {item.evidence.map((evidence, index) => (
                          <div
                            key={`${item.building}-${index}`}
                            className="rounded-2xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300"
                          >
                            {evidence}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-sm text-gray-500 dark:text-gray-400">
                  No live hotspot ranking yet. Add more telemetry to activate building-level prioritization.
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Execution roadmap</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A staged plan to move from containment to repeatable savings.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.roadmap?.map((item, index) => (
                <Card key={`${item.title}-${index}`} className="p-5 border border-gray-200/80 dark:border-gray-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyTone[item.urgency] || urgencyTone.Monitor}`}>
                      {item.horizon}
                    </span>
                    <span className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {item.owner}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.objective}</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Success metric</p>
                      <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">{item.successMetric}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Expected impact</p>
                      <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">{item.expectedImpact}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adoption scenarios</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how aggressively you want to operationalize the ranked actions.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {data.scenarios?.map((scenario) => (
                <Card key={scenario.key} className="p-5 border border-gray-200/80 dark:border-gray-800/80">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{scenario.label}</p>
                      <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{scenario.reductionTarget}</h3>
                    </div>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {scenario.riskImprovement}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{scenario.summary}</p>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">Projected savings</span>
                      <span className="font-semibold text-gray-900 dark:text-white">Rs. {formatCount(scenario.projectedSavings)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">Projected score</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{scenario.projectedScore}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">Carbon reduction</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCount(scenario.projectedCarbonReduction)} kg</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">Water recovery</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCount(scenario.projectedWaterRecovery)} L</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Siren size={16} />
                Incident queue
              </div>
              <div className="mt-4 space-y-3">
                {data.incidentQueue?.length ? (
                  data.incidentQueue.map((incident) => (
                    <div key={incident.id || incident.message} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{incident.building}</h3>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${incident.overdue ? urgencyTone.Immediate : urgencyTone.Monitor}`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{incident.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                          {incident.severity}
                        </span>
                        <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                          Owner: {incident.owner}
                        </span>
                        <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                          {incident.responseWindow}
                        </span>
                        <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                          Rs. {formatCount(incident.estimatedLoss)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No active incidents are blocking the current plan.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <BatteryWarning size={16} />
                Sensor watchlist
              </div>
              <div className="mt-4 space-y-3">
                {data.sensorWatch?.length ? (
                  data.sensorWatch.map((sensor) => (
                    <div key={`${sensor.building}-${sensor.sensorId}`} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{sensor.sensorName}</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {sensor.building}
                            {sensor.location ? ` · ${sensor.location}` : ""}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${sensor.priority >= 75 ? urgencyTone.Today : urgencyTone["This Week"]}`}>
                          Priority {sensor.priority}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{sensor.issue}</p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{sensor.action}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {sensor.batteryLevel != null ? (
                          <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                            Battery {sensor.batteryLevel}%
                          </span>
                        ) : null}
                        {sensor.signalQuality != null ? (
                          <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                            Signal {sensor.signalQuality}%
                          </span>
                        ) : null}
                        <span className="rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
                          {sensor.owner}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Sensor health looks stable in the current operating window.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="p-5 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Building2 size={16} />
                Tracked buildings
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.portfolio?.trackedBuildings || 0}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.portfolio?.atRiskBuildings || 0} currently above the high-risk threshold.
              </p>
            </Card>
            <Card className="p-5 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <ShieldAlert size={16} />
                Alert pressure
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.portfolio?.activeAlertsCount || 0}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.portfolio?.criticalAlertsCount || 0} critical alerts remain unresolved.
              </p>
            </Card>
            <Card className="p-5 border border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <CheckCircle2 size={16} />
                Readiness
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                {topHotspot ? topHotspot.urgency : "Stable"}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {topHotspot
                  ? `${topHotspot.building} should be the first building the team touches today.`
                  : "The system is stable enough to stay in monitoring mode."}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Recommendations;
