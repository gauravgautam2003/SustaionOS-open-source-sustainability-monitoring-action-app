import React, { useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
import { Cpu, Gauge, Droplets, Zap } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const PredictionCard = () => {
  const { darkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [pred, setPred] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const fetchPred = async () => {
      setErr(null);
      try {
        const token = getAuthToken();
        if (!token) {
          setErr("Unauthorized");
          setLoading(false);
          return;
        }

        const res = await fetch(apiUrl("/api/ai/forecast"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(body.msg || "Failed to fetch predictions");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setPred(data.prediction || null);
      } catch (e) {
        console.error("Prediction fetch error", e);
        setErr("Prediction error");
      } finally {
        setLoading(false);
      }
    };

    fetchPred();
  }, []);

  return (
    <Card className={`p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Gauge size={18} className="text-primary" />
          Quick Forecast
        </h3>
        {pred?.model?.name ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
            <Cpu size={12} />
            {pred.model.name}
          </span>
        ) : null}
      </div>

      {loading && <div className="text-sm opacity-70">Loading predictions...</div>}
      {err && <div className="text-sm text-red-500">{err}</div>}
      {pred && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              <span>Next hour</span>
              <strong>{pred.predictedEnergyNextHour}</strong>
              <span>kWh</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-sky-500" />
              <span>{pred.predictedWaterNextHour}</span>
              <span>L water</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              <span>Next day</span>
              <strong>{pred.predictedEnergyNextDay}</strong>
              <span>kWh</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-sky-500" />
              <span>{pred.predictedWaterNextDay}</span>
              <span>L water</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs opacity-70">
            <span>Avg energy {pred.predictedEnergyAvg}</span>
            <span>Avg water {pred.predictedWaterAvg}</span>
            {pred.confidence != null ? <span>Confidence {pred.confidence}%</span> : null}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PredictionCard;
