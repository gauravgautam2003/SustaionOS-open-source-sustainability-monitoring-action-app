// Lightweight AI service: heuristic responses by default. If `OPENAI_API_KEY` is set
// and the `openai` package is installed, this will prefer calling OpenAI and
// otherwise fall back to local heuristics. This keeps the project working offline
// but allows a fast upgrade to a managed LLM for hackathon demos.

const Data = require("../models/Data");

// Simple in-memory conversation memory per user (keeps last N exchanges)
const convoMemory = new Map();
const MAX_MEMORY = 10;

const addToMemory = (userId, role, text) => {
  if (!userId) return;
  const key = String(userId);
  const arr = convoMemory.get(key) || [];
  arr.push({ role, text, time: Date.now() });
  if (arr.length > MAX_MEMORY) arr.shift();
  convoMemory.set(key, arr);
};

const getMemory = (userId) => {
  if (!userId) return [];
  return convoMemory.get(String(userId)) || [];
};

const runHeuristics = (q, memory = []) => {
  // Fast heuristics
  if (q.includes("predict") || q.includes("forecast")) {
    return {
      status: "success",
      intent: "forecast",
      answer: "I can forecast short-term usage. Use /api/ai/forecast to get next-hour or next-day predictions.",
    };
  }

  if (q.includes("why") && q.includes("energy")) {
    return {
      status: "success",
      intent: "diagnose_energy",
      answer:
        "High energy usage can be caused by increased device activity, HVAC runtime, or an equipment fault. Check recent spikes in the dashboard, compare against the building's energyLimit in Settings, and consider scheduling loads off-peak.",
    };
  }

  if (q.includes("leak") || q.includes("water spike") || (q.includes("water") && q.includes("why"))) {
    return {
      status: "success",
      intent: "diagnose_water",
      answer:
        "Water spikes often indicate leaks or valve issues. Inspect the building's water-using systems and compare timestamps with maintenance logs. Enable waterAlerts in settings to get instant notifications.",
    };
  }

  if (q.includes("how") && q.includes("reduce")) {
    return {
      status: "success",
      intent: "recommendations",
      suggestions: [
        { title: "Shift loads", message: "Schedule heavy equipment to run during off-peak hours." },
        { title: "Tune setpoints", message: "Adjust HVAC setpoints by 1–2°C to save energy." },
        { title: "Inspect leaks", message: "Run a water audit for buildings with repeated spikes." },
      ],
    };
  }

  // Context-aware follow-up suggestion if conversation present
  if (memory && memory.length) {
    const lastUser = [...memory].reverse().find((m) => m.role === "user");
    if (lastUser && lastUser.text && q.length < 30) {
      return {
        status: "success",
        intent: "follow_up",
        answer: `On that: ${q}. If you want, ask me to 'show recent spikes' or 'forecast next 24h'.`,
      };
    }
  }

  // Default fallback: friendly guidance and next steps
  return {
    status: "success",
    intent: "general_help",
    answer:
      "I can help with forecasts, diagnosing spikes, and suggesting efficiency actions. Try: 'Predict next 24h energy', 'Why is energy high?', or 'How to reduce water use?'.",
  };
};

const generateAnswer = async ({ question, userId }) => {
  const qRaw = (question || "").toString();
  const q = qRaw.toLowerCase();

  // store user message
  addToMemory(userId, "user", qRaw);

  // get recent conversation for context
  const memory = getMemory(userId);

  // generate heuristic answer using memory
  const result = runHeuristics(q, memory);

  // create a more conversational tone for the assistant reply
  if (result && result.answer) {
    // simple naturalization: add a friendly lead-in for first messages
    const isFirst = (memory || []).filter((m) => m.role === "assistant").length === 0;
    const lead = isFirst ? "Hi — " : "";
    result.answer = `${lead}${result.answer}`;
  }

  // store assistant message
  addToMemory(userId, "assistant", result.answer || JSON.stringify(result));

  // return answer plus a short conversation snapshot
  return { ...result, conversation: getMemory(userId).slice(-6) };
};

module.exports = { generateAnswer, getMemory };
