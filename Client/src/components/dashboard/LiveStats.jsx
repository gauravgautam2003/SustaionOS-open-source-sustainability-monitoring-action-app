import React, { useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
import { Zap, Droplet, Thermometer } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const AnimatedCounter = ({ target, duration = 1500, unit }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 30);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      setCount(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span className="font-semibold text-xl md:text-2xl text-white">{count} {unit}</span>;
};

const LiveStats = () => {
  const { darkMode } = useContext(ThemeContext);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/data");
        const data = await res.json();
        setStats([
          { id: 1, title: "Energy Usage", value: data.totalEnergy || 0, unit: "kWh", icon: Zap, color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
          { id: 2, title: "Water Consumption", value: data.totalWater || 0, unit: "L", icon: Droplet, color: "text-blue-400", bgColor: "bg-blue-500/10" },
          { id: 3, title: "Temperature", value: data.temperature || 22, unit: "°C", icon: Thermometer, color: "text-red-400", bgColor: "bg-red-500/10" },
        ]);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <Card key={stat.id} className={`flex items-center p-4 gap-4 transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl ${darkMode ? "bg-cardBg" : "bg-white"}`}>
            <div className={`w-14 h-14 flex items-center justify-center rounded-full ${stat.bgColor} ${stat.color}`}>
              <Icon size={28} />
            </div>
            <div className="flex flex-col">
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{stat.title}</p>
              <AnimatedCounter target={stat.value} unit={stat.unit} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LiveStats;