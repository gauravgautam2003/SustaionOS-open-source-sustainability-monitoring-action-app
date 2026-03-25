import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { getAuthToken } from "../utils/auth";
import { Brain, Lightbulb, RefreshCcw, Sparkles } from "lucide-react";
import { apiUrl } from "../utils/api";

const Recommendations = () => {
  const [insights, setInsights] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [insightsRes, reportRes] = await Promise.all([
        fetch(apiUrl("/api/analytics/insights?period=week"), { headers }),
        fetch(apiUrl("/api/report/data"), { headers }),
      ]);

      const insightsJson = await insightsRes.json();
      const reportJson = await reportRes.json();

      setInsights(insightsJson || {});
      setReport(reportJson || {});
    } catch (err) {
      console.error("Recommendations load failed:", err);
      setInsights(null);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const actions = insights?.priorityActions || report?.insights?.priorityActions || [];
  const nextBestAction = insights?.nextBestAction || report?.insights?.nextBestAction || "Keep monitoring current telemetry.";

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-violet-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
              <Brain size={14} />
              Recommendations
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Ask what to fix first, and the system shows the best next move.
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              This page combines live insights, report intelligence, and ranked actions so the team has one clear playbook.
            </p>
          </div>
          <button onClick={loadRecommendations} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">
            <RefreshCcw size={16} />
            {loading ? "Refreshing..." : "Refresh recommendations"}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles size={16} />
            Next best action
          </div>
          <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{nextBestAction}</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Keep this as the default priority for today’s operations review.
          </p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Lightbulb size={16} />
            Focus area
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {insights?.riskLevel || report?.insights?.riskLevel || "Moderate"}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Use this to decide if the team should fix, monitor, or escalate.
          </p>
        </Card>
      </div>

      {loading && (
        <Card className="p-4 text-sm text-gray-500 dark:text-gray-400">
          Loading recommendations...
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Priority actions</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No priority actions available yet.</div>
          ) : (
            actions.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                  <span className="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-800">{item.impact}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.reason}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {report?.recommendation && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Executive recommendation</h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{report.recommendation}</p>
        </Card>
      )}
    </div>
  );
};

export default Recommendations;
