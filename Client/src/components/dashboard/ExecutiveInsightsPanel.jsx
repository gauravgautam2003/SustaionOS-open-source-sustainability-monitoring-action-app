import React, { useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
import {
  AlertTriangle,
  BadgeCheck,
  ArrowUpRight,
  Cpu,
  IndianRupee,
  Leaf,
  Target,
} from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const toneStyles = {
  Low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  Moderate: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  High: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  Critical: "bg-red-500/15 text-red-500 border-red-500/20",
};

const ExecutiveInsightsPanel = ({ period = "week", compact = false }) => {
  const { darkMode } = useContext(ThemeContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadInsights = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();

        if (!token) {
          if (mounted) setData(null);
          return;
        }

        const res = await fetch(apiUrl(`/api/analytics/insights?period=${period}`), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error("Failed to load insights");

        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        console.error("Insights fetch error:", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInsights();

    return () => {
      mounted = false;
    };
  }, [period]);

  const metricCardClass = `rounded-xl border p-4 transition-all duration-300 ${
    darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-white"
  }`;

  return (
    <Card className={`${compact ? "p-5" : "p-6"} shadow-lg`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Executive Intelligence
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Converts live telemetry into savings and action priorities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
              data?.mlStatus?.active
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                : "bg-gray-500/15 text-gray-500 border-gray-500/20"
            }`}
          >
            <Cpu size={16} />
            {data?.mlStatus?.label || "JS Fallback"}
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
              toneStyles[data?.riskLevel || "Low"]
            }`}
          >
            <AlertTriangle size={16} />
            {data?.riskLevel || "Low"} risk
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={metricCardClass}>
            <div className="h-3 w-24 rounded bg-gray-300/40 animate-pulse" />
            <div className="mt-4 h-8 w-20 rounded bg-gray-300/40 animate-pulse" />
          </div>
          <div className={metricCardClass}>
            <div className="h-3 w-28 rounded bg-gray-300/40 animate-pulse" />
            <div className="mt-4 h-8 w-24 rounded bg-gray-300/40 animate-pulse" />
          </div>
          <div className={metricCardClass}>
            <div className="h-3 w-28 rounded bg-gray-300/40 animate-pulse" />
            <div className="mt-4 h-8 w-24 rounded bg-gray-300/40 animate-pulse" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <BadgeCheck size={16} />
                Sustainability Score
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                {data.score}%
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.statusLabel}
              </p>
            </div>

            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <IndianRupee size={16} />
                Monthly Savings Potential
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                Rs. {data.monthlySavingsPotential || 0}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                based on current waste delta
              </p>
            </div>

            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Leaf size={16} />
                Carbon Footprint
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                {data.carbon || 0} kg
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                latest monitored window
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Cpu size={16} />
                ML Engine
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {data.model?.name || data.mlStatus?.label || "JS Fallback"}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.model?.version ? `v${data.model.version}` : data.mlStatus?.source || "local"}
              </p>
            </div>

            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Target size={16} />
                Confidence
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                {data.confidence || 0}%
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.signalBreakdown?.usageConsistency != null
                  ? `Consistency ${data.signalBreakdown.usageConsistency}%`
                  : "Model certainty"}
              </p>
            </div>

            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <AlertTriangle size={16} />
                Root Cause
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {data.rootCause || "Mixed operational drift"}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.signalBreakdown?.offHoursRatio != null
                  ? `Off-hours usage ${data.signalBreakdown.offHoursRatio}%`
                  : "Explainable signal"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <BadgeCheck size={16} />
                Active Alerts
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                {data.activeAlertsCount ?? 0}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.criticalAlertsCount ? `${data.criticalAlertsCount} critical unresolved` : "No critical unresolved"}
              </p>
            </div>

            <div className={metricCardClass}>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <ArrowUpRight size={16} />
                Model Health
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {data.signalBreakdown?.usageConsistency != null
                  ? `${data.signalBreakdown.usageConsistency}% consistency`
                  : "Stable"}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {data.model?.version ? `Model ${data.model.version}` : "Latest model output"}
              </p>
            </div>
          </div>

          {data.whatIf ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={metricCardClass}>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <ArrowUpRight size={16} />
                  What-if Savings
                </div>
                <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  Rs. {data.whatIf.projectedSavings || 0}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  if you reduce waste by the suggested amount
                </p>
              </div>

              <div className={metricCardClass}>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Leaf size={16} />
                  Projected Score
                </div>
                <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {data.whatIf.projectedScore || 0}%
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  estimated after efficiency actions
                </p>
              </div>

              <div className={metricCardClass}>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Target size={16} />
                  Risk Improvement
                </div>
                <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {data.whatIf.riskImprovement || "N/A"}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  reduction scenario over the next {data.whatIf.horizonDays || 30} days
                </p>
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-xl border p-4 ${
              darkMode ? "border-gray-800 bg-gray-950/50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Target size={16} />
              Next Best Action
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {data.nextBestAction}
            </p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
              {data.summary}
            </p>
            {data.confidenceReasons?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.confidenceReasons.map((reason, index) => (
                  <span
                    key={index}
                    className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.priorityActions?.map((action, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 ${
                  darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {action.title}
                    </h4>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {action.reason}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs font-medium text-black">
                    <ArrowUpRight size={12} />
                    {action.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {data.buildingBenchmarks?.length ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Building Benchmark
              </h4>
              <div className="space-y-3">
                {data.buildingBenchmarks.map((item) => (
                  <div
                    key={item.building}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
                  >
                    <div className="text-gray-700 dark:text-gray-300">
                      {item.building}
                      {item.locations?.length ? (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({item.locations.join(", ")})
                        </span>
                      ) : null}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Score {item.efficiency}% | Energy {item.energy} | Water {item.water}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
          No insights available yet. Add live telemetry to unlock action plans.
        </div>
      )}
    </Card>
  );
};

export default ExecutiveInsightsPanel;
