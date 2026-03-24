import React, { useState, useRef, useEffect, useContext } from "react";
import { MessageCircle, X } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const suggestions = [
  "Why energy usage high?",
  "Predict tomorrow energy usage",
  "Show sustainability score",
  "How reduce carbon footprint?"
];

const AIChatWidget = () => {

  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! I can give you tips to improve sustainability metrics." },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const { darkMode } = useContext(ThemeContext);
  const aiMode = [...messages].reverse().find((msg) => msg.sender === "ai" && msg.meta?.aiMode)?.meta?.aiMode || "local";

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear chat
  const clearChat = () => {
    setMessages([
      { sender: "ai", text: "Hi! I can give you tips to improve sustainability metrics." },
    ]);
  };

  const sendMessage = async (customText) => {

    const text = customText || input;

    if (!text.trim() || loading) return;

    const userMessage = { sender: "user", text };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      return updated.slice(-20);
    });

    setInput("");
    setLoading(true);

    try {
      const token = getAuthToken();

      const res = await fetch(apiUrl("/api/ai/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({ question: text })
      });

      if (res.status === 401) {
        const aiMessage401 = { sender: "ai", text: "Unauthorized — please login to use AI features." };
        setMessages(prev => [...prev, aiMessage401].slice(-20));
        return;
      }

      const data = await res.json();

      let responseText = "Sorry, I couldn't generate a response.";

      if (typeof data === "string") responseText = data;
      else if (data?.answer) responseText = data.answer;
      else if (data?.suggestions) {
        responseText = data.suggestions
          .map(s => (s.title ? `• ${s.title}: ${s.message}` : `• ${s.message}`))
          .join("\n");
      } else if (data?.status === "success" && data?.intent) {
        responseText = data.answer || `Answered intent: ${data.intent}`;
      }

      const aiMessage = {
        sender: "ai",
        text: responseText,
        meta: data
      };

      setMessages(prev => {
        const updated = [...prev, aiMessage];
        return updated.slice(-20);
      });

    } catch (err) {

      setMessages(prev => {
        const updated = [
          ...prev,
          { sender: "ai", text: "Error: Failed to reach AI server." }
        ];
        return updated.slice(-20);
      });

      console.error("AI Chat Error:", err);

    } finally {

      setLoading(false);

    }

  };

  const handleKeyPress = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

  };

  return (

    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {open && (

        <div
          className={`w-80 h-[420px] rounded-xl shadow-xl flex flex-col overflow-hidden
          ${darkMode ? "bg-gray-800" : "bg-white"}`}
        >

          {/* Header */}

          <div
            className={`flex justify-between items-center p-3
            ${darkMode ? "bg-gray-900/50" : "bg-gray-200/50"}`}
          >

            <h3 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
              AI Assistant
            </h3>

            <span
              className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${
                aiMode === "enhanced"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-gray-500/15 text-gray-500"
              }`}
            >
              {aiMode === "enhanced" ? "Enhanced AI" : "Local AI"}
            </span>

            <div className="flex gap-2">

              <button
                onClick={clearChat}
                className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Clear
              </button>

              <button
                onClick={async () => {
                  // fetch forecast and append result as AI message
                  const token = getAuthToken();
                  if (!token) {
                    setMessages(prev => [...prev, { sender: "ai", text: "Unauthorized — please login to fetch forecast." }].slice(-20));
                    return;
                  }

                  setLoading(true);
                  try {
                    const res = await fetch(apiUrl("/api/ai/forecast"), {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    });

                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      setMessages(prev => [...prev, { sender: "ai", text: body.msg || "Failed to fetch forecast." }].slice(-20));
                      return;
                    }

                    const json = await res.json();
                    const p = json.prediction || {};
                    const text = `Forecast — Next hour: Energy ${p.predictedEnergyNextHour || p.predictedEnergyAvg || "N/A"}, Water ${p.predictedWaterNextHour || p.predictedWaterAvg || "N/A"}\nNext day: Energy ${p.predictedEnergyNextDay || "N/A"}, Water ${p.predictedWaterNextDay || "N/A"}`;

                    setMessages(prev => [...prev, { sender: "ai", text }].slice(-20));
                  } catch (err) {
                    console.error("Forecast fetch error:", err);
                    setMessages(prev => [...prev, { sender: "ai", text: "Error fetching forecast." }].slice(-20));
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Forecast
              </button>

              <X
                className={`cursor-pointer hover:text-red-500 transition
                ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                onClick={() => setOpen(false)}
              />

            </div>

          </div>

          {/* Messages */}

          <div
            className={`flex-1 p-3 overflow-y-auto text-sm space-y-2
            ${darkMode ? "text-gray-300" : "text-gray-800"}`}
          >

            {messages.map((msg, idx) => (

              <div
                key={idx}
                className={`p-2 rounded-lg max-w-[80%] whitespace-pre-wrap
                ${
                  msg.sender === "user"
                    ? "bg-primary text-black ml-auto"
                    : darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-900"
                }`}
              >
                {msg.text}
                {msg.sender === "ai" && msg.meta?.comparison?.text && (
                  <div className="mt-2 text-xs opacity-80">
                    {msg.meta.comparison.text}
                  </div>
                )}
                {msg.sender === "ai" && Array.isArray(msg.meta?.actionPlan) && msg.meta.actionPlan.length > 0 && (
                  <div className="mt-2 text-xs space-y-1 opacity-90">
                    <div className="font-semibold">Top actions:</div>
                    {msg.meta.actionPlan.slice(0, 2).map((item, i) => (
                      <div key={i}>- {item.title}: {item.reason}</div>
                    ))}
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.report && (
                  <div className="mt-2 text-xs space-y-1 opacity-90">
                    <div className="font-semibold">Report snapshot:</div>
                    <div>Score: {msg.meta.report.score}%</div>
                    <div>Carbon: {msg.meta.report.carbon} kg</div>
                    <div>Savings: Rs. {msg.meta.report.savings}</div>
                    {msg.meta.report.building && <div>Top building: {msg.meta.report.building}</div>}
                  </div>
                )}
                {msg.sender === "ai" && Array.isArray(msg.meta?.benchmark) && msg.meta.benchmark.length > 0 && (
                  <div className="mt-2 text-xs space-y-1 opacity-90">
                    <div className="font-semibold">Benchmark:</div>
                    {msg.meta.benchmark.slice(0, 2).map((item, i) => (
                      <div key={i}>- {item.building}: {item.efficiency}%</div>
                    ))}
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.diagnosis?.cause && (
                  <div className="mt-2 text-xs space-y-1 opacity-90">
                    <div className="font-semibold">Diagnosis:</div>
                    <div>{msg.meta.diagnosis.cause}</div>
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.current && (
                  <div className="mt-2 text-xs space-y-1 opacity-90">
                    <div className="font-semibold">Current snapshot:</div>
                    <div>Building: {msg.meta.current.building}</div>
                    <div>Energy: {msg.meta.current.energy}</div>
                    <div>Water: {msg.meta.current.water}</div>
                  </div>
                )}
                {msg.sender === "ai" && typeof msg.meta?.confidence === "number" && (
                  <div className="mt-2 text-xs opacity-70">
                    Confidence: {msg.meta.confidence}%
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.followUp && (
                  <div className="mt-2 text-xs opacity-80">
                    Follow-up: {msg.meta.followUp}
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.ai?.provider && (
                  <div className="mt-2 text-xs opacity-60">
                    AI: {msg.meta.ai.provider} {msg.meta.ai.model ? `(${msg.meta.ai.model})` : ""}
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.aiMode && (
                  <div className="mt-2 text-xs opacity-60">
                    Mode: {msg.meta.aiMode}
                  </div>
                )}
                {msg.sender === "ai" && msg.meta?.ai?.error && (
                  <div className="mt-2 text-xs opacity-70 text-amber-600">
                    Enhanced AI temporarily unavailable. Using local fallback.
                  </div>
                )}
              </div>

            ))}

            {loading && (
              <div
                className={`p-2 rounded-lg max-w-[80%]
                ${darkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-900"}`}
              >
                AI is thinking...
              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* Suggested Questions - Only First Time */}

          {messages.length === 1 && !loading && (

            <div className="px-3 pb-2 flex flex-wrap gap-2">

              {suggestions.map((q, i) => (

                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-2 py-1 rounded bg-primary/20 hover:bg-primary/40"
                >
                  {q}
                </button>

              ))}

            </div>

          )}

          {/* Input */}

          <div
            className={`p-3 flex gap-2 border-t
            ${darkMode ? "border-gray-700" : "border-gray-300"}`}
          >

            <input
              type="text"
              placeholder="Ask about energy, water, carbon..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none
              ${
                darkMode
                  ? "bg-gray-900 text-white border border-gray-700"
                  : "bg-white text-black border border-gray-300"
              }`}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading}
              className="bg-primary px-3 py-2 rounded-lg text-black font-medium hover:scale-105 transition disabled:opacity-50"
            >
              Send
            </button>

          </div>

        </div>

      )}

      {/* Floating Button */}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-black hover:scale-110 transition"
      >
        <MessageCircle size={28} />
      </button>

    </div>

  );
};

export default AIChatWidget;
