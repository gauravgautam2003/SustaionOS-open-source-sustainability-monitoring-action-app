import React, { useContext } from "react";
import Card from "../ui/Card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ThemeContext } from "../../context/ThemeContext";
import { ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";

const SustainabilityGauge = ({ score = 0 }) => {
  const { darkMode } = useContext(ThemeContext);

  const getColor = () => {
    if (score >= 80) return "#22C55E";
    if (score >= 50) return "#FACC15";
    return "#EF4444";
  };

  const getLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 50) return "Moderate";
    return "Critical";
  };

  const getIcon = () => {
    if (score >= 80) return ShieldCheck;
    if (score >= 50) return Sparkles;
    return AlertTriangle;
  };
  const statusIcon = getIcon();

  return (
    <Card className="relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-amber-50/40 dark:from-gray-900 dark:to-gray-950">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${getColor()}, rgba(255,255,255,0.15))` }}
      />
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: getColor() }}
      />

      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {statusIcon === ShieldCheck ? (
            <ShieldCheck size={14} style={{ color: getColor() }} />
          ) : statusIcon === Sparkles ? (
            <Sparkles size={14} style={{ color: getColor() }} />
          ) : (
            <AlertTriangle size={14} style={{ color: getColor() }} />
          )}
          Sustainability Score
        </div>

        <div className="w-44 md:w-48 mt-5 drop-shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <CircularProgressbar
            value={score}
            text={`${score}%`}
            strokeWidth={10}
            styles={buildStyles({
              textColor: darkMode ? "#fff" : "#111827",
              pathColor: getColor(),
              trailColor: darkMode ? "#1F2937" : "#E5E7EB",
              textSize: "16px",
              pathTransitionDuration: 0.7,
            })}
          />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-4 py-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: getColor() }} />
          <span className="text-sm font-semibold" style={{ color: getColor() }}>
            {getLabel()}
          </span>
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
          Live sustainability health based on current usage, anomalies, and active alerts.
        </p>
      </div>
    </Card>
  );
};

export default SustainabilityGauge;
