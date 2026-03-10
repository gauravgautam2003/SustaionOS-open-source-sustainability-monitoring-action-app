import React, { useEffect, useState, useContext } from "react";
import Card from "../ui/Card";
import { Lightbulb } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

const SuggestionsPanel = () => {
  const { darkMode } = useContext(ThemeContext);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/ai/query",{
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body: JSON.stringify({
            question:"Give sustainability improvement suggestions"
          })
        });

        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error("Error fetching AI suggestions:", err);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
        AI Suggestions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {suggestions.length === 0 ? (
          <Card className="p-4">
            Generating AI suggestions...
          </Card>
        ) : (
          suggestions.map((sug, index) => (
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