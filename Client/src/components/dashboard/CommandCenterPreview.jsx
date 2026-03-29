import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, IndianRupee, ShieldAlert, Sparkles, TimerReset } from "lucide-react";

import Card from "../ui/Card";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const metricTone = {
  Low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  Moderate: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  High: "border-orange-500/20 bg-orange-500/10 text-orange-600",
  Critical: "border-red-500/20 bg-red-500/10 text-red-500",
};

const CommandCenterPreview = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          if (mounted) setData(null);
          return;
        }

        const res = await fetch(apiUrl("/api/analytics/command-center?period=week"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load command center");
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        console.error("Command center preview failed:", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const topHotspot = data?.hotspots?.[0] || null;
  const balancedScenario = data?.scenarios?.find((item) => item.key === "balanced") || data?.scenarios?.[0] || null;

  return (
    <Card className="relative overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_28%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles size={14} />
              Mission control preview
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
              {loading
                ? "Building your daily action brief..."
                : data?.story?.headline || "Daily operational command center"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              {loading
                ? "Telemetry, incidents, and savings opportunities are being stitched into one operator-ready story."
                : data?.story?.brief || "Open mission control to see where waste is building up and what to do next."}
            </p>
          </div>

          <button
            onClick={() => navigate("/recommendations")}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
          >
            Open mission control
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <ShieldAlert size={14} />
              Risk state
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${metricTone[data?.portfolio?.riskLevel || "Low"] || metricTone.Low}`}>
                {data?.portfolio?.riskLevel || "Low"} risk
              </span>
              <span className="text-sm text-slate-300">
                {data?.portfolio?.atRiskBuildings || 0} buildings need focus
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <IndianRupee size={14} />
              Savings at stake
            </div>
            <p className="mt-3 text-2xl font-bold">
              Rs. {data?.portfolio?.monthlySavingsOpportunity || 0}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              monthly opportunity from ranked interventions
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <TimerReset size={14} />
              Incident pressure
            </div>
            <p className="mt-3 text-2xl font-bold">
              {data?.portfolio?.overdueIncidents || 0}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              overdue incidents blocking clean operations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Top hotspot
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              {topHotspot ? `${topHotspot.building} · ${topHotspot.issue}` : "No hotspot detected yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {topHotspot?.recommendedAction || data?.story?.nextBestAction || "Once telemetry builds up, the system will rank the sharpest intervention here."}
            </p>
            {topHotspot ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  {topHotspot.riskScore}/100 risk
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Rs. {topHotspot.opportunity?.monthlySavings || 0}/month
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  {topHotspot.responseWindow}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Best adoption path
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              {balancedScenario ? `${balancedScenario.label} plan` : "Balanced rollout"}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {balancedScenario?.summary || "Adopt the first two ranked interventions to show measurable savings in demo mode."}
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <span>Projected savings</span>
                <span className="font-semibold">Rs. {balancedScenario?.projectedSavings || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Projected score</span>
                <span className="font-semibold">{balancedScenario?.projectedScore || 0}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Carbon reduction</span>
                <span className="font-semibold">{balancedScenario?.projectedCarbonReduction || 0} kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CommandCenterPreview;
