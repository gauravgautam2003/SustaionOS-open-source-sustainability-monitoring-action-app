import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Cpu,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const seedSuggestions = [
  "Why energy usage high?",
  "Predict tomorrow energy usage",
  "Show sustainability score",
  "How reduce carbon footprint?",
];

const initialMessage = {
  sender: "ai",
  text: "Hi, I can analyze energy, water, alerts, forecasts, and action plans.",
  meta: { aiMode: "local" },
};

const normalizeSuggestions = (data) => {
  if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
    return data.suggestions;
  }

  const answer = typeof data?.answer === "string" ? data.answer : "";
  if (answer.trim()) {
    const lines = answer
      .split(/\n+/)
      .map((line) => line.replace(/^[\-\d.*\s]+/, "").trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.slice(0, 4).map((message, index) => ({
        title: `Tip ${index + 1}`,
        message,
      }));
    }
  }

  return [
    { title: "Check energy spikes", message: "Focus on heavy equipment and after-hours loads first." },
    { title: "Inspect water loops", message: "Repeated water spikes usually mean leakage or waste." },
    { title: "Review alerts", message: "Close critical incidents before they repeat." },
  ];
};

const AIChatWidget = () => {
  const { darkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickTips, setQuickTips] = useState([]);
  const [status, setStatus] = useState("Ready");
  const messagesEndRef = useRef(null);

  const aiMode = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((msg) => msg.sender === "ai" && msg.meta?.aiMode)?.meta?.aiMode || "local",
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setQuickTips(seedSuggestions);
  }, [open]);

  const clearChat = () => {
    setMessages([initialMessage]);
    setStatus("Conversation cleared");
  };

  const fetchForecast = async () => {
    const token = getAuthToken();
    if (!token) {
      setMessages((prev) => [...prev, { sender: "ai", text: "Please login to fetch forecast." }].slice(-20));
      return;
    }

    setLoading(true);
    setStatus("Fetching forecast");
    try {
      const res = await fetch(apiUrl("/api/ai/forecast"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessages((prev) => [...prev, { sender: "ai", text: body.msg || "Failed to fetch forecast." }].slice(-20));
        return;
      }

      const json = await res.json();
      const p = json.prediction || {};
      const text = [
        `Next hour: Energy ${p.predictedEnergyNextHour || p.predictedEnergyAvg || "N/A"}, Water ${p.predictedWaterNextHour || p.predictedWaterAvg || "N/A"}`,
        `Next day: Energy ${p.predictedEnergyNextDay || "N/A"}, Water ${p.predictedWaterNextDay || "N/A"}`,
      ].join("\n");

      setMessages((prev) => [...prev, { sender: "ai", text, meta: json }].slice(-20));
      setStatus("Forecast ready");
    } catch (err) {
      console.error("Forecast fetch error:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: "Error fetching forecast." }].slice(-20));
      setStatus("Forecast failed");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (customText) => {
    const text = (customText || input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { sender: "user", text }].slice(-20));
    setInput("");
    setLoading(true);
    setStatus("Thinking");

    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/ai/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ question: text }),
      });

      if (res.status === 401) {
        setMessages((prev) =>
          [...prev, { sender: "ai", text: "Unauthorized - please login to use AI features." }].slice(-20)
        );
        setStatus("Login required");
        return;
      }

      const data = await res.json();
      let responseText = "Sorry, I couldn't generate a response.";

      if (typeof data === "string") responseText = data;
      else if (data?.answer) responseText = data.answer;
      else if (data?.suggestions) {
        responseText = data.suggestions
          .map((s) => (s.title ? `• ${s.title}: ${s.message}` : `• ${s.message}`))
          .join("\n");
      } else if (data?.status === "success" && data?.intent) {
        responseText = data.answer || `Answered intent: ${data.intent}`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: responseText, meta: data }].slice(-20));
      setStatus(data?.aiMode === "enhanced" ? "Enhanced AI" : "Local AI");

      if (Array.isArray(data?.suggestions)) {
        setQuickTips(data.suggestions.slice(0, 4).map((item, index) => ({
          title: item.title || `Tip ${index + 1}`,
          message: item.message || "",
        })));
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) =>
        [...prev, { sender: "ai", text: "Error: Failed to reach AI server." }].slice(-20)
      );
      setStatus("Offline");
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
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end md:bottom-6 md:right-6">
      {open && (
        <div
          className={`mb-3 w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl ${
            darkMode
              ? "border-white/10 bg-slate-950/90 text-white"
              : "border-white/40 bg-white/92 text-slate-900"
          }`}
        >
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.18),transparent_26%)]" />
            <div className="relative border-b border-white/10 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">AI Sustainability Copilot</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          aiMode === "enhanced"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-slate-500/15 text-slate-500"
                        }`}
                      >
                        {aiMode === "enhanced" ? "Enhanced" : "Local"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {status} | Ask about energy, water, carbon, alerts, or map context.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-slate-500 transition hover:bg-white/10 hover:text-red-500"
                  aria-label="Close AI chat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={fetchForecast}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                >
                  <ArrowUpRight size={12} />
                  Forecast
                </button>
                <button
                  onClick={clearChat}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                  <Sparkles size={12} />
                  Live command center
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === "user";
              return (
                <div key={idx} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950">
                      <Bot size={15} />
                    </div>
                  ) : null}

                  <div
                    className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                      isUser
                        ? "rounded-br-md bg-gradient-to-br from-primary to-yellow-300 text-slate-950"
                        : darkMode
                          ? "rounded-bl-md border border-white/10 bg-white/5 text-slate-100"
                          : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.sender === "ai" && msg.meta?.comparison?.text && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/10 p-2 text-xs">
                        {msg.meta.comparison.text}
                      </div>
                    )}

                    {msg.sender === "ai" && Array.isArray(msg.meta?.actionPlan) && msg.meta.actionPlan.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="font-semibold">Top actions</div>
                        {msg.meta.actionPlan.slice(0, 2).map((item, i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-black/10 px-2 py-1">
                            {item.title}: {item.reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.report && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-white/10 bg-black/10 px-2 py-2">
                          <div className="text-[10px] uppercase tracking-wide opacity-70">Score</div>
                          <div className="font-semibold">{msg.meta.report.score}%</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/10 px-2 py-2">
                          <div className="text-[10px] uppercase tracking-wide opacity-70">Carbon</div>
                          <div className="font-semibold">{msg.meta.report.carbon} kg</div>
                        </div>
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.diagnosis?.cause && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/10 px-2 py-2 text-xs">
                        <span className="font-semibold">Diagnosis:</span> {msg.meta.diagnosis.cause}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.current && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-white/10 bg-black/10 px-2 py-2">
                          <div className="text-[10px] uppercase tracking-wide opacity-70">Building</div>
                          <div className="font-semibold">{msg.meta.current.building}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/10 px-2 py-2">
                          <div className="text-[10px] uppercase tracking-wide opacity-70">Energy</div>
                          <div className="font-semibold">{msg.meta.current.energy}</div>
                        </div>
                      </div>
                    )}

                    {msg.sender === "ai" && typeof msg.meta?.confidence === "number" && (
                      <div className="mt-2 text-[11px] uppercase tracking-wide opacity-70">
                        Confidence: {msg.meta.confidence}%
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.followUp && (
                      <div className="mt-2 text-xs opacity-80">Follow-up: {msg.meta.followUp}</div>
                    )}

                    {msg.sender === "ai" && msg.meta?.ai?.provider && (
                      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] opacity-60">
                        AI: {msg.meta.ai.provider} {msg.meta.ai.model ? `(${msg.meta.ai.model})` : ""}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.aiMode && (
                      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] opacity-60">
                        Mode: {msg.meta.aiMode}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.ai?.error && (
                      <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-300">
                        Enhanced AI temporarily unavailable. Using local fallback.
                      </div>
                    )}
                  </div>

                  {isUser ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                      <Cpu size={14} />
                    </div>
                  ) : null}
                </div>
              );
            })}

            {loading ? (
              <div className="flex items-center gap-2 rounded-[22px] rounded-bl-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                  <Bot size={15} />
                </div>
                AI is thinking...
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && !loading && quickTips.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {quickTips.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                placeholder="Ask about energy, water, carbon, alerts..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className={`max-h-28 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                  darkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
                }`}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-yellow-300 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-emerald-400 to-yellow-300 text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.35)] transition hover:scale-105 md:h-15 md:w-15"
        aria-label="Open AI chat"
      >
        <MessageCircle size={26} className="transition group-hover:scale-110" />
      </button>
    </div>
  );
};

export default AIChatWidget;
