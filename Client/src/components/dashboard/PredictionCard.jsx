import React, { useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
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
      <h3 className="text-lg font-semibold mb-2">📈 Quick Forecast</h3>
      {loading && <div className="text-sm opacity-70">Loading predictions...</div>}
      {err && <div className="text-sm text-red-500">{err}</div>}
      {pred && (
        <div className="space-y-2 text-sm">
          <div>Next hour — Energy: <strong>{pred.predictedEnergyNextHour}</strong>, Water: <strong>{pred.predictedWaterNextHour}</strong></div>
          <div>Next day — Energy: <strong>{pred.predictedEnergyNextDay}</strong>, Water: <strong>{pred.predictedWaterNextDay}</strong></div>
          <div className="text-xs opacity-70">Averages shown as fallback: Energy {pred.predictedEnergyAvg}, Water {pred.predictedWaterAvg}</div>
        </div>
      )}
    </Card>
  );
};

export default PredictionCard;
