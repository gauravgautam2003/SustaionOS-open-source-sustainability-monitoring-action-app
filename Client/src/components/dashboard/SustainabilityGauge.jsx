import React, { useContext, useEffect, useState } from "react";
import Card from "../ui/Card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ThemeContext } from "../../context/ThemeContext";

const SustainabilityGauge = () => {
  const { darkMode } = useContext(ThemeContext);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/score");
        const data = await res.json();
        setScore(data.score || 0);
      } catch (err) {
        console.error("Error fetching score:", err);
      }
    };
    fetchScore();
  }, []);

  const getColor = () => {
    if (score >= 80) return "#22C55E";
    if (score >= 50) return "#FACC15";
    return "#EF4444";
  };
  const getLabel = () => (score >= 80 ? "Excellent" : score >= 50 ? "Moderate" : "Critical");

  return (
    <Card className="flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div className="absolute w-52 h-52 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: getColor() }} />
      <div className="w-40 z-10">
        <CircularProgressbar value={score} text={`${score}%`} strokeWidth={10} styles={buildStyles({ textColor: darkMode ? "#fff" : "#111827", pathColor: getColor(), trailColor: darkMode ? "#1F2937" : "#E5E7EB", textSize: "16px" })} />
      </div>
      <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">Sustainability Score</p>
      <span className="mt-1 text-sm font-semibold animate-pulse" style={{ color: getColor() }}>{getLabel()}</span>
    </Card>
  );
};

export default SustainabilityGauge;