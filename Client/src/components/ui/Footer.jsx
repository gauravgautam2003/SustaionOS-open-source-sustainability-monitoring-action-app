import React, { useContext } from "react";
import { Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";

const quickLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Reports", path: "/reports" },
  { label: "Alerts", path: "/alerts" },
  { label: "Impact", path: "/impact" },
];

const Footer = () => {
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  return (
    <footer
      className={`w-full border-t transition-colors duration-300 ${
        darkMode ? "border-gray-800 bg-darkBg/95" : "border-gray-200 bg-white/95"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Leaf size={18} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                <span className="text-primary">Sustain</span>OS
              </p>
              <p className={`mt-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Live dashboard for energy, water, alerts, and smarter campus decisions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                  darkMode
                    ? "border-gray-700 text-gray-300 hover:border-primary hover:text-primary"
                    : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`mt-4 flex flex-col gap-2 border-t pt-4 text-sm md:flex-row md:items-center md:justify-between ${
            darkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-600"
          }`}
        >
          <p>{new Date().getFullYear()} SustainOS. Smart sustainability monitoring for modern campuses.</p>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live monitoring active
          </div>
        </div>
      </div>

      <div
        className={`h-1 w-full ${
          darkMode
            ? "bg-gradient-to-r from-primary/45 via-transparent to-primary/45"
            : "bg-gradient-to-r from-primary/25 via-transparent to-primary/25"
        }`}
      />
    </footer>
  );
};

export default Footer;
