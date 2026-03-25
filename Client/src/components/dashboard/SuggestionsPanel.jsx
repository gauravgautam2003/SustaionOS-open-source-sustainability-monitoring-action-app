import React, { useCallback, useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
import { Lightbulb, RotateCcw } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const fallbackSuggestions = [
  { title: "Shift loads", message: "Schedule heavy equipment to run during off-peak hours." },
  { title: "Inspect leaks", message: "Check buildings with repeated water spikes for leaks." },
  { title: "Reduce idle use", message: "Turn off unused appliances and idle systems." },
  { title: "Monitor alerts", message: "Resolve high-severity alerts before they repeat." },
];

const normalizeSuggestions = (data, fallback = fallbackSuggestions) => {
  if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
    return data.suggestions;
  }

  const answer = typeof data?.answer === "string" ? data.answer : "";
  if (answer.trim()) {
    const lines = answer
      .split(/\n+/)
      .map((line) => line.replace(/^[-\d.*\s]+/, "").trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.slice(0, 4).map((message, index) => ({
        title: `Tip ${index + 1}`,
        message,
      }));
    }
  }

  return fallback;
};

const SuggestionsPanel = () => {
  const { darkMode } = useContext(ThemeContext);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/ai/query"), {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          question:"Give me sustainability suggestions",
          skipLLM: true
        })
      });

      if (!res.ok) {
        setSuggestions(fallbackSuggestions);
        return;
      }

      const data = await res.json();
      setSuggestions(normalizeSuggestions(data, fallbackSuggestions));
    } catch (err) {
      console.error("Error fetching AI suggestions:", err);
      setSuggestions(fallbackSuggestions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
          AI Suggestions
        </h2>
        <button
          onClick={fetchSuggestions}
          className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
            darkMode ? "border-gray-700 text-gray-300" : "border-gray-300 text-gray-700"
          }`}
        >
          <RotateCcw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading && suggestions.length === 0 ? (
          <Card className="p-4">
            Generating AI suggestions...
          </Card>
        ) : (
          (suggestions.length > 0 ? suggestions : fallbackSuggestions).map((sug, index) => (
            <Card
              key={index}
              className={`flex items-start gap-4 p-4 transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg ${darkMode ? "bg-cardBg" : "bg-white"}`}
            >
              <div className="w-10 h-10 flex items-center justify-center bg-primary text-black rounded-full">
                <Lightbulb size={20} />
              </div>

              <div className="flex flex-col">
                <h3 className={`font-semibold ${darkMode ? "text-white" : "text-black"}`}>
                  {sug.title}
                </h3>

                <p className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {sug.message}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SuggestionsPanel;
