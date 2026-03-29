import React, { useCallback, useContext, useEffect, useState } from "react";
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
  const [retraining, setRetraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState("");

  const loadInsights = useCallback(async (isMounted = () => true) => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        if (isMounted()) setData(null);
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
      if (isMounted()) setData(json);
    } catch (err) {
      console.error("Insights fetch error:", err);
      if (isMounted()) setData(null);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let mounted = true;
    loadInsights(() => mounted);

    return () => {
      mounted = false;
    };
  }, [loadInsights]);

  const retrainModel = async () => {
    try {
      setRetraining(true);
      setTrainMessage("");
      const token = getAuthToken();
      if (!token) {
        setTrainMessage("Login required for model training.");
        return;
      }

      const res = await fetch(apiUrl("/api/analytics/model/train"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 240 }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrainMessage(json.msg || "Model retraining failed.");
        return;
      }

      setTrainMessage(`Model retrained on ${json.trainedOn || 0} readings.`);
      await loadInsights(() => true);
    } catch (err) {
      console.error("Model retrain failed:", err);
      setTrainMessage("Model retraining failed.");
    } finally {
      setRetraining(false);
    }
  };

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
          <button
            onClick={retrainModel}
            disabled={retraining || loading}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-700 transition hover:bg-cyan-500/15 disabled:opacity-60 dark:text-cyan-300"
          >
            <Cpu size={16} />
            {retraining ? "Retraining..." : "Retrain ML"}
          </button>
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
      {trainMessage ? (
        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-700 dark:text-cyan-200">
          {trainMessage}
        </div>
      ) : null}

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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {data.training?.samples != null
                  ? `Trained on ${data.training.samples} samples`
                  : data.model?.trainedSamples != null
                    ? `Trained on ${data.model.trainedSamples} samples`
                    : "No training data yet"}
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {data.model?.fitScore != null
                  ? `Fit score ${data.model.fitScore}%`
                  : data.training?.metrics?.energy?.r2 != null
                    ? `Energy R-squared ${data.training.metrics.energy.r2}`
                    : "Training metrics pending"}
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
                    {(action.ownerHint || action.window) && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {action.ownerHint ? `Owner: ${action.ownerHint}` : ""}
                        {action.ownerHint && action.window ? " | " : ""}
                        {action.window ? `Window: ${action.window}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs font-medium text-black">
                    <ArrowUpRight size={12} />
                    {action.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(data.training?.featureImportance?.energy?.length || data.training?.featureImportance?.water?.length) ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Model Drivers
              </h4>
              <div className="space-y-3 text-sm">
                {data.training?.featureImportance?.energy?.length ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Energy
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.training.featureImportance.energy.slice(0, 4).map((item) => (
                        <span
                          key={`energy-${item.feature}`}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
                        >
                          {item.feature} {item.direction === "down" ? "down" : "up"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {data.training?.featureImportance?.water?.length ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Water
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.training.featureImportance.water.slice(0, 4).map((item) => (
                        <span
                          key={`water-${item.feature}`}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
                        >
                          {item.feature} {item.direction === "down" ? "down" : "up"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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
