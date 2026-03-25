import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import { Zap, Droplet, TrendingUp } from "lucide-react";

const AnimatedCounter = ({ value = 0, duration = 900, unit = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const steps = Math.max(1, Math.floor(duration / 30));
    const increment = value / steps;

    if (!value) return undefined;

    const timer = setInterval(() => {
      frame += 1;
      const next = Math.min(value, Math.round(increment * frame));
      setCount(next);

      if (frame >= steps || next >= value) {
        clearInterval(timer);
        setCount(value);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
      {value ? count : 0}
      <span className="ml-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{unit}</span>
    </span>
  );
};

const StatCard = ({ title, value, unit, icon: Icon, accent, note }) => {
  const StatIcon = Icon;

  return (
    <Card className="relative overflow-hidden p-0 border border-gray-200 dark:border-gray-800 bg-white dark:bg-cardBg">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="relative p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <div className="mt-2">
              <AnimatedCounter value={value} unit={unit} />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200">
            <StatIcon size={22} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <TrendingUp size={14} />
            {note}
          </div>
        </div>
      </div>
    </Card>
  );
};

const LiveStats = ({ water = 0, energy = 0 }) => {
  const stats = [
    {
      title: "Energy Usage",
      value: energy,
      unit: "kWh",
      icon: Zap,
      accent: "bg-gradient-to-r from-emerald-400 to-lime-500",
      note: energy > 400 ? "Above normal trend" : "Healthy operating range",
    },
    {
      title: "Water Usage",
      value: water,
      unit: "L",
      icon: Droplet,
      accent: "bg-gradient-to-r from-sky-400 to-blue-500",
      note: water > 2000 ? "Check for waste or leakage" : "Usage looks stable",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
};

export default LiveStats;
