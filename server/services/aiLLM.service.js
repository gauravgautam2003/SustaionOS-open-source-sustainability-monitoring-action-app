const Data = require("../models/Data");
const Alert = require("../models/Alert");
const ConversationMemory = require("../models/ConversationMemory");
const executiveInsights = require("./executiveInsights.service");
const root = require("../ai/rootCause.engine");
const suggest = require("../ai/suggestion.engine");
const predictService = require("../services/prediction.service");
const intentEngine = require("../ai/intent.engine");
const {
  AI_PROVIDER,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_CHAT_URL,
  OLLAMA_URL,
  OLLAMA_MODEL,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_URL,
} = require("../config/env");

const convoMemory = new Map();
const MAX_MEMORY = 12;
const AI_PROVIDER_MODE = AI_PROVIDER || "auto";
const OPENAI_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const GEMINI_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
let openaiRetryUntil = 0;
let geminiRetryUntil = 0;

const isDatabaseReady = () => global.dbReady !== false;

const addToMemory = (userId, role, text) => {
  if (!userId) return;
  const key = String(userId);
  const arr = convoMemory.get(key) || [];
  arr.push({ role, text, time: Date.now() });
  if (arr.length > MAX_MEMORY) arr.shift();
  convoMemory.set(key, arr);
};

const knowledgeTopics = [
  { name: "energy", match: /\benergy|electricity|power|kwh|load|units\b/i },
  { name: "water", match: /\bwater|leak|pipeline|tank|flow|litre|liter\b/i },
  { name: "alerts", match: /\balert|warning|issue|fault|error\b/i },
  { name: "forecast", match: /\bpredict|forecast|tomorrow|next hour|next day\b/i },
  { name: "score", match: /\bscore|efficiency|sustainability|rating\b/i },
  { name: "carbon", match: /\bcarbon|co2|footprint|emission\b/i },
  { name: "buildings", match: /\bbuilding|campus|site|floor|property\b/i },
  { name: "map", match: /\bmap|location|lat|lng|latitude|longitude\b/i },
  { name: "sensors", match: /\bsensor|mqtt|gateway|iot|device\b/i },
  { name: "action", match: /\baction|fix|resolve|recommend|tip|optimize|save\b/i },
];

const detectLanguageStyle = (text = "") => {
  const q = String(text).toLowerCase();
  if (/[^\x00-\x7F]/.test(text)) return "hinglish";
  if (/\b(bhai|yaar|kya|kaise|kyu|kyo|nahi|haan|hai|hoga|karo|kar|bata|sun)\b/.test(q)) {
    return "hinglish";
  }
  return "english";
};

const extractTopics = (text = "", intent = "") => {
  const q = String(text).toLowerCase();
  const hits = [];
  knowledgeTopics.forEach((topic) => {
    if (topic.match.test(q) || intent === topic.name) hits.push(topic.name);
  });
  if (intent && !hits.includes(intent)) hits.unshift(intent);
  return Array.from(new Set(hits)).slice(0, 5);
};

const mergeTopicCounts = (existing = [], newTopics = []) => {
  const counts = new Map(existing.map((item) => [item.name, item.count || 0]));
  newTopics.forEach((topic) => {
    counts.set(topic, (counts.get(topic) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
};

const buildSummaryFromState = (state = {}) => {
  const topTopics = (state.topics || []).slice(0, 4).map((topic) => topic.name);
  const language = state.style?.language || "hinglish";
  const tone = state.style?.tone || "friendly";
  const parts = [];

  if (topTopics.length) parts.push(`Often discusses ${topTopics.join(", ")}.`);
  if (language === "hinglish") parts.push("Prefers Hinglish or casual mixed-language replies.");
  if (tone) parts.push(`Preferred tone: ${tone}.`);

  return parts.join(" ");
};

const normalizeName = (value = "") =>
  String(value)
    .replace(/[^\w\s.'-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

const extractNamePreference = (question = "") => {
  const text = String(question || "").trim();
  const patterns = [
    /(?:call me|my name is|i am called|i'm called|you can call me)\s+([a-z][a-z\s.'-]{1,40})/i,
    /(?:mera naam)\s+([a-z][a-z\s.'-]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const preferredName = normalizeName(match[1]);
      if (preferredName) return preferredName;
    }
  }

  return "";
};

const resolveDisplayName = ({ user = null, memoryState = {}, question = "" } = {}) => {
  const preferredFromMemory = normalizeName(memoryState?.profile?.preferredName || "");
  const displayFromMemory = normalizeName(memoryState?.profile?.displayName || "");
  const userName = normalizeName(user?.name || user?.firstName || user?.displayName || "");
  const explicitName = extractNamePreference(question);

  return {
    preferredName: explicitName || preferredFromMemory || displayFromMemory || userName || "",
    displayName: displayFromMemory || userName || preferredFromMemory || explicitName || "",
  };
};

const loadConversationState = async (userId) => {
  if (!userId || !isDatabaseReady()) return null;
  return ConversationMemory.findOne({ userId }).lean();
};

const persistConversationTurn = async ({
  userId,
  question,
  answer,
  intent,
  tone,
  followUp,
  topics,
  language,
  displayName,
  preferredName,
}) => {
  if (!userId || !isDatabaseReady()) return;

  try {
    const existing = await ConversationMemory.findOne({ userId });
    const recentTurns = Array.isArray(existing?.recentTurns) ? existing.recentTurns.slice(-18) : [];
    const nextTurns = [
      ...recentTurns,
      { role: "user", text: question, intent, createdAt: new Date() },
      { role: "assistant", text: answer, intent, createdAt: new Date() },
    ].slice(-20);

    const mergedTopics = mergeTopicCounts(existing?.topics || [], topics || []);
    const existingPreferred = normalizeName(existing?.profile?.preferredName || "");
    const existingDisplay = normalizeName(existing?.profile?.displayName || "");
    const nextPreferred = normalizeName(preferredName || existingPreferred || "");
    const nextDisplay = normalizeName(displayName || existingDisplay || nextPreferred || "");
    const summary = buildSummaryFromState({
      topics: mergedTopics,
      style: {
        language: language || existing?.style?.language || "hinglish",
        tone: tone || existing?.style?.tone || "friendly",
      },
    });

    await ConversationMemory.findOneAndUpdate(
      { userId },
      {
        $set: {
          summary,
          profile: {
            displayName: nextDisplay,
            preferredName: nextPreferred,
          },
          style: {
            language: language || existing?.style?.language || "hinglish",
            tone: tone || existing?.style?.tone || "friendly",
          },
          topics: mergedTopics,
          recentTurns: nextTurns,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

  } catch (err) {
    console.error("Conversation persistence failed:", err.message || err);
  }
};

const getMemory = (userId) => {
  if (!userId) return [];
  return convoMemory.get(String(userId)) || [];
};

const formatMemory = (memory = []) =>
  memory
    .slice(-6)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.text}`)
    .join("\n");

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const detectPeriod = (q) => {
  if (q.includes("year")) return "year";
  if (q.includes("month")) return "month";
  if (q.includes("week") || q.includes("last 7")) return "week";
  return "week";
};

const summarizeComparison = (insights) => {
  if (!insights?.previous) return null;
  const energyDelta = insights.deltas?.energy;
  const waterDelta = insights.deltas?.water;
  return {
    energyDelta,
    waterDelta,
    text: `Energy is ${energyDelta == null ? "not comparable" : `${Math.abs(energyDelta).toFixed(1)}% ${energyDelta >= 0 ? "higher" : "lower"}`} than the previous window, while water is ${waterDelta == null ? "not comparable" : `${Math.abs(waterDelta).toFixed(1)}% ${waterDelta >= 0 ? "higher" : "lower"}`}.`,
  };
};

const buildGeneralHelp = () => ({
  status: "success",
  intent: "general_help",
  answer:
    "I can read your latest data, compare periods, explain spikes, forecast usage, suggest actions, track sensors, map buildings, and support facility or operations questions. Try asking for a comparison, a diagnosis, a forecast, maintenance advice, or the top next step.",
});

const buildStaticSuggestions = () => [
  {
    title: "Check Leaks First",
    message: "Inspect valves, tanks, and pipelines before making bigger operational changes.",
  },
  {
    title: "Shift Heavy Loads",
    message: "Move non-critical high-energy activity to off-peak windows whenever possible.",
  },
  {
    title: "Tighten Alert Thresholds",
    message: "Catch abnormal water and energy spikes early so waste does not repeat.",
  },
  {
    title: "Review Building Hotspots",
    message: "Compare one building at a time and fix the worst offender before tuning the rest.",
  },
];

const describeLiveDataGap = ({ userId, dbReady }) => {
  const gaps = [];
  if (!userId) gaps.push("no signed-in campus account is attached");
  if (!dbReady) gaps.push("the database is temporarily unavailable");
  return gaps.join(" and ") || "live telemetry is not available";
};

const buildLimitedDataPayload = ({ question = "", userId, dbReady, detectedIntent, parsed, understanding }) => {
  const q = String(question || "").toLowerCase();
  const reason = describeLiveDataGap({ userId, dbReady });
  const reconnectLine = !userId
    ? "Sign in once and I will switch to live campus analytics."
    : "As soon as the database reconnects, I can use live dashboard telemetry again.";

  if (detectedIntent === "prediction" || /\bforecast|predict|next hour|next day\b/.test(q)) {
    return buildStructuredAnswer({
      intent: "data_unavailable",
      answer: `I can keep chatting in Ollama/local mode, but I cannot generate a telemetry forecast right now because ${reason}. ${reconnectLine}`,
      tone: "supportive",
      followUp: !userId
        ? "Ask me a general question, or sign in and I will forecast from your readings."
        : "Ask me something general for now, or retry the forecast once data is back.",
      parsed,
      understanding,
      liveDataReady: false,
    });
  }

  if (detectedIntent === "suggestion" || detectedIntent === "action" || /\bsuggest|tip|action|fix|optimize|improve|reduce|save\b/.test(q)) {
    return buildStructuredAnswer({
      intent: "suggestions",
      answer: `I do not have live telemetry because ${reason}, but I can still give strong best-practice actions. Start with leak checks, peak-load shifting, tighter alert thresholds, and fixing the highest-load building first. ${reconnectLine}`,
      tone: "supportive",
      followUp: "Want a quick checklist for energy savings or water savings first?",
      suggestions: buildStaticSuggestions(),
      parsed,
      understanding,
      liveDataReady: false,
    });
  }

  if (detectedIntent === "carbon" || /\bcarbon|co2|footprint|emission\b/.test(q)) {
    return buildStructuredAnswer({
      intent: "carbon",
      answer: `I cannot calculate your live carbon footprint because ${reason}, but the fastest carbon wins are reducing peak energy draw, shifting heavy loads off-peak, and removing repeated waste sources. ${reconnectLine}`,
      tone: "supportive",
      followUp: "Want a simple 3-step carbon reduction checklist?",
      carbon: {
        value: null,
        savings: 0,
      },
      parsed,
      understanding,
      liveDataReady: false,
    });
  }

  if (/\bscore|current|latest|today|now|compare|report|dashboard|alert|building|site|map|why|cause|problem\b/.test(q)) {
    return buildStructuredAnswer({
      intent: "data_unavailable",
      answer: `I can keep chatting in Ollama/local mode, but I cannot answer that with live campus data because ${reason}. ${reconnectLine}`,
      tone: "supportive",
      followUp: !userId
        ? "Ask me something general, or sign in for live score, alerts, and forecasts."
        : "Ask me something general for now, or retry once telemetry is available again.",
      parsed,
      understanding,
      liveDataReady: false,
    });
  }

  return buildStructuredAnswer({
    intent: "general_help",
    answer: `I can still help with general chat and sustainability guidance, but live campus analytics are limited because ${reason}. ${reconnectLine}`,
    tone: "supportive",
    followUp: !userId
      ? "Want a general sustainability tip, or do you want to sign in for live analytics?"
      : "Want a general sustainability tip while live data reconnects?",
    parsed,
    understanding,
    liveDataReady: false,
  });
};

const buildHumanConversationReply = ({ question, memoryState = {}, memoryTurns = [], user = null }) => {
  const q = String(question || "").toLowerCase();
  const userName = normalizeName(memoryState?.profile?.preferredName || memoryState?.profile?.displayName || user?.name || "");
  const lastAssistant = [...(memoryTurns || [])].reverse().find((m) => m.role === "assistant")?.text || "";
  const lastUser = [...(memoryTurns || [])].reverse().find((m) => m.role === "user")?.text || "";

  const say = (text, followUp = "") => ({
    reply: text,
    tone: "friendly",
    followUp,
  });

  if (/\b(good night|gn|good evening|good morning|good afternoon|hello|hi|hey|namaste|salaam)\b/.test(q)) {
    return say(
      userName ? `Hi ${userName}. I’m here — tell me what you need.` : "Hi. I’m here — tell me what you need.",
      "Want to chat casually or check your dashboard?"
    );
  }

  if (/\bhow are you\b|\bhru\b|\bhow r you\b/.test(q)) {
    return say(
      `I’m doing well. I’m keeping an eye on your campus data and trying to be useful, not noisy.`,
      "How are you doing today?"
    );
  }

  if (/\bwhat are you doing\b|\bwhat do you do\b|\bwhat can you do\b|\bwho are you\b|\bintroduce yourself\b/.test(q)) {
    return say(
      "I’m your assistant for both daily chat and sustainability ops. I can remember your name, explain data, take voice input, and save telemetry when you say submit.",
      "Want me to show the voice flow?"
    );
  }

  if (/\bthanks?\b|\bthank you\b|\bthx\b/.test(q)) {
    return say(
      userName ? `Anytime, ${userName}.` : "Anytime.",
      "If you want, I can also help with a quick data entry flow."
    );
  }

  if (/\bjoke\b|\bfunny\b|\blaugh\b/.test(q)) {
    return say(
      "Why don’t smart systems ever panic? Because they keep their cool until the next update.",
      "Want another joke or a serious tip?"
    );
  }

  if (/\bmotivat|encourage|tired|bored|sad|stress|anxiety|upset|angry\b/.test(q)) {
    return say(
      "Take one small step first. Big progress usually starts with one clear action, not one perfect plan.",
      "Do you want a simple plan for today?"
    );
  }

  if (/\badvice|suggest|opinion|what do you think|your thought|help me choose\b/.test(q)) {
    return say(
      "My honest take: keep it simple, act on the biggest issue first, and don’t overthink the rest.",
      lastUser ? `I’m also remembering you last mentioned: ${lastUser}.` : "If you want, I can make that more specific."
    );
  }

  if (/\bgood morning|morning|good afternoon|afternoon|good evening|evening\b/.test(q)) {
    return say(
      `Good to see you${userName ? `, ${userName}` : ""}. I’m ready whenever you are.`,
      "Want a quick check-in or a data entry mode?"
    );
  }

  if (/\bwhat's up\b|\bwhats up\b|\bwhat's new\b|\bwhat is new\b/.test(q)) {
    return say(
      `Not much noise here — just watching your latest system state. ${lastAssistant ? "I’m still following the last topic." : ""}`,
      "Want to continue where we left off?"
    );
  }

  if (/\bhow was your day\b|\bhow's your day\b|\bhow is your day\b/.test(q)) {
    return say(
      "My day has been mostly telemetry, context, and your requests — which is a pretty good day for me.",
      "How was your day?"
    );
  }

  return null;
};

const choose = (items, seed = 0) => {
  if (!Array.isArray(items) || items.length === 0) return "";
  const index = Math.abs(seed) % items.length;
  return items[index];
};

const getLocalGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const buildCasualConversationReply = ({ question, memory, latest, insights, user }) => {
  const q = String(question || "").toLowerCase();
  const greeting = getLocalGreeting();
  const building = latest?.building || insights?.buildingBenchmarks?.[0]?.building || "your site";
  const score = Number(insights?.score ?? 0);
  const lastTopic = [...(memory || [])].reverse().find((m) => m.role === "assistant")?.text || "";
  const userName = user?.name || user?.firstName || "";
  const salutation = userName ? `${greeting}, ${userName}` : greeting;

  if (/\b(good morning|morning|good afternoon|afternoon|good evening|evening)\b/.test(q)) {
    return {
      reply: `${salutation} — I'm live and tracking ${building}. ${score > 0 ? `Current score is ${score}/100.` : "I'm waiting on fresh telemetry."} What do you want to check first today?`,
      tone: "friendly",
      followUp: "Want a quick daily summary?",
    };
  }

  if (/\bhow are you\b|\bhow r you\b|\bhru\b/.test(q)) {
    return {
      reply: `I'm doing well — I'm watching the energy and water flow on ${building}. ${userName ? `${userName}, ` : ""}how's your day going?`,
      tone: "friendly",
      followUp: "Want me to show today's top issue?",
    };
  }

  if (/\bwhat are you doing\b|\bwhat do you do\b|\bwhat can you do\b|\bwhat's up\b|\bwhats up\b/.test(q)) {
    return {
      reply: `I'm keeping an eye on live telemetry, alerts, and forecasts. In simple words: I spot waste, explain it, and tell you what to do next.`,
      tone: "friendly",
      followUp: "Should I give you a quick campus status?",
    };
  }

  if (/\bthank(s| you)\b/.test(q)) {
    return {
      reply: `Anytime${userName ? `, ${userName}` : ""}. I'm here whenever you want a quick read on the campus or a next step.`,
      tone: "friendly",
      followUp: "Want to review the latest building now?",
    };
  }

  if (/\bwho are you\b|\bintroduce yourself\b|\bwho r you\b/.test(q)) {
    return {
      reply: `I'm SustainOS AI — your sustainability copilot for energy, water, alerts, forecasts, and map-based location tracking.`,
      tone: "friendly",
      followUp: "Want me to show what I can do in 30 seconds?",
    };
  }

  if (/\bhow was your day\b|\bhow's your day\b|\bhow is your day\b/.test(q)) {
    return {
      reply: `My day is basically a steady stream of telemetry and alerts — which is exactly how I like it. ${lastTopic ? `I'm still thinking about ${lastTopic}.` : ""}`,
      tone: "friendly",
      followUp: "How's yours going?",
    };
  }

  if (/\bjoke\b|\bfunny\b/.test(q)) {
    return {
      reply: `Why don’t assistants ever get tired? Because they run on questions and curiosity.`,
      tone: "light",
      followUp: "Want another joke or a real tip for today?",
    };
  }

  return null;
};

const buildCasualConversationReplyV2 = ({ question, memory, latest, insights, user, memoryState }) => {
  const q = String(question || "").toLowerCase();
  const greeting = getLocalGreeting();
  const building = latest?.building || insights?.buildingBenchmarks?.[0]?.building || "your site";
  const score = Number(insights?.score ?? 0);
  const lastTopic = [...(memory || [])].reverse().find((m) => m.role === "assistant")?.text || "";
  const userName = normalizeName(
    memoryState?.profile?.preferredName || memoryState?.profile?.displayName || user?.name || user?.firstName || user?.displayName || ""
  );
  const salutation = userName ? `${greeting}, ${userName}` : greeting;

  if (/\b(good morning|morning|good afternoon|afternoon|good evening|evening)\b/.test(q)) {
    return {
      reply: `${salutation} — I'm live and tracking ${building}. ${score > 0 ? `Current score is ${score}/100.` : "I'm waiting on fresh telemetry."} What do you want to check first today?`,
      tone: "friendly",
      followUp: "Want a quick daily summary?",
    };
  }

  if (/\bhow are you\b|\bhow r you\b|\bhru\b/.test(q)) {
    return {
      reply: `I'm doing well — I'm watching the energy and water flow on ${building}. ${userName ? `${userName}, ` : ""}how's your day going?`,
      tone: "friendly",
      followUp: "Want me to show today's top issue?",
    };
  }

  if (/\bwhat are you doing\b|\bwhat do you do\b|\bwhat can you do\b|\bwhat's up\b|\bwhats up\b/.test(q)) {
    return {
      reply: `I'm keeping an eye on live telemetry, alerts, and forecasts. In simple words: I spot waste, explain it, and tell you what to do next.`,
      tone: "friendly",
      followUp: "Should I give you a quick campus status?",
    };
  }

  if (/\bthank(s| you)\b/.test(q)) {
    return {
      reply: `Anytime${userName ? `, ${userName}` : ""}. I'm here whenever you want a quick read on the campus or a next step.`,
      tone: "friendly",
      followUp: "Want to review the latest building now?",
    };
  }

  if (/\bwho are you\b|\bintroduce yourself\b|\bwho r you\b/.test(q)) {
    return {
      reply: `I'm SustainOS AI — your sustainability copilot for energy, water, alerts, forecasts, and map-based location tracking.`,
      tone: "friendly",
      followUp: "Want me to show what I can do in 30 seconds?",
    };
  }

  if (/\bhow was your day\b|\bhow's your day\b|\bhow is your day\b/.test(q)) {
    return {
      reply: `My day is basically a steady stream of telemetry and alerts — which is exactly how I like it. ${lastTopic ? `I'm still thinking about ${lastTopic}.` : ""}`,
      tone: "friendly",
      followUp: "How's yours going?",
    };
  }

  if (/\bjoke\b|\bfunny\b/.test(q)) {
    return {
      reply: `I would make a joke about a leak, but I don't want it to go over your head. Better to catch it early.`,
      tone: "light",
      followUp: "Want a serious tip for reducing waste instead?",
    };
  }

  return null;
};

const buildIndustryCopilotReply = ({ question, latest, insights, alerts, prediction, rootCause, user }) => {
  const q = String(question || "").toLowerCase();
  const building = latest?.building || insights?.buildingBenchmarks?.[0]?.building || "your site";
  const score = Number(insights?.score ?? 0);
  const topIssue = alerts?.[0]?.message || rootCause || "a recent waste spike";
  const maintenanceHints = [
    latest?.sensorId ? `sensor ${latest.sensorId}` : null,
    latest?.batteryLevel != null ? `battery ${latest.batteryLevel}%` : null,
    latest?.signalQuality != null ? `signal ${latest.signalQuality}%` : null,
  ].filter(Boolean);

  const reply = (text, followUp = "", tone = "friendly") => ({
    reply: text,
    followUp,
    tone,
  });

  if (
    /\bwhat can you do\b|\bwhat do you solve\b|\bcapabilities\b|\buse cases\b|\bhow can you help\b|\breal world\b|\bindustry\b|\bwhat problems\b/.test(
      q
    )
  ) {
    return reply(
      "I can help with energy, water, carbon, alerts, forecasts, building comparison, map locations, sensor health, voice-based data entry, daily chat, reports, and next actions. For industry teams, I can also support facility ops, maintenance, compliance, budgets, occupancy, and workflow prioritization.",
      "Want the exact list by team: facility, sustainability, or operations?"
    );
  }

  if (/\bmaintenance\b|\basset\b|\bequipment\b|\bhvac\b|\buptime\b|\bdowntime\b|\bfailure\b|\bservice\b|\bcalibration\b/.test(q)) {
    return reply(
      `For ${building}, I can flag recurring spikes, weak sensor health, and likely equipment drift so maintenance teams inspect the right asset first. ${maintenanceHints.length ? `I also see ${maintenanceHints.join(", ")}.` : ""}`,
      "Want a maintenance checklist for the top issue?",
      "analytical"
    );
  }

  if (/\bcompliance\b|\baudit\b|\besg\b|\breport\b|\bpolicy\b|\bgovernance\b|\bmonthly review\b|\bexecutive\b/.test(q)) {
    return reply(
      "I can turn live telemetry into executive-ready reports, ESG-style summaries, alerts, and savings estimates. That makes audits, reviews, and compliance checks much faster.",
      "Want a report summary for this month?",
      "analytical"
    );
  }

  if (/\bbudget\b|\bcost\b|\bsavings\b|\bbill\b|\bexpense\b|\broi\b|\bprocurement\b/.test(q)) {
    return reply(
      `I can help reduce operating cost by showing the worst buildings, the biggest waste spikes, and the next best action. Current score ${score}/100 means there is room to save if you act on the top issue first.`,
      "Want me to prioritize cost-saving actions?",
      "supportive"
    );
  }

  if (/\boccupancy\b|\bafter-hours\b|\boff hours\b|\boff-hours\b|\bempty\b|\bshift\b|\bworking hours\b/.test(q)) {
    return reply(
      `I can use occupancy-aware logic to catch energy use when buildings should be empty. For ${building}, I would compare working hours vs off-hours and flag any abnormal draw.`,
      "Want me to show after-hours waste if available?",
      "analytical"
    );
  }

  if (/\bworkflow\b|\bsla\b|\bincident\b|\bescalat\b|\bteam\b|\btask\b|\bassign\b|\bapprove\b/.test(q)) {
    return reply(
      "I can support ops workflows by ranking incidents, marking severity, and surfacing the next action for the right team. Alerts can be acknowledged, resolved, and escalated without losing context.",
      "Want a team-by-team incident flow?",
      "supportive"
    );
  }

  if (/\biot\b|\bsensor\b|\bmqtt\b|\bgateway\b|\bdevice\b|\bhealth\b|\bbattery\b|\bsignal\b/.test(q)) {
    return reply(
      "I can handle sensor health, battery level, signal quality, calibration due dates, and future MQTT or webhook ingestion. That means the app is ready for real devices later, without changing the whole dashboard.",
      "Want a sample gateway payload?",
      "analytical"
    );
  }

  if (/\bsecurity\b|\bprivacy\b|\baccess\b|\buser roles\b|\bauthorization\b/.test(q)) {
    return reply(
      "I can work with auth-protected, user-scoped data, so each team sees only their own buildings, alerts, and reports.",
      "Want to separate admin and operator views?",
      "supportive"
    );
  }

  return null;
};

const humanizeLocalReply = ({ payload, parsed, insights, latest, alerts, prediction, rootCause, tips, question }) => {
  const intent = payload?.intent || "general_help";

  if (payload?.liveDataReady === false || intent === "data_unavailable") {
    return {
      reply:
        payload?.answer ||
        "Live telemetry is not available right now, but I can still help with general sustainability guidance.",
      tone: payload?.tone || "supportive",
      followUp: payload?.followUp || "Want a simple sustainability checklist while live data is unavailable?",
    };
  }

  const topBuilding = insights?.buildingBenchmarks?.[0]?.building || latest?.building || "your site";
  const score = Number(insights?.score ?? 0);
  const risk = String(insights?.riskLevel || "Low").toLowerCase();
  const energy = toNumber(latest?.energy);
  const water = toNumber(latest?.water);
  const memorySeed = `${question || ""}${payload?.answer || ""}${intent}`.length;

  const opening = choose(
    [
      "Here's the short version",
      "I checked the latest telemetry",
      "Based on current readings",
      "Looking at the live data",
      "From the current snapshot",
    ],
    memorySeed
  );

  const closers = choose(
    [
      "If you want, I can break this down by building next.",
      "I can also compare this with the last 7 days.",
      "If you want, I'll turn this into a 1-step action plan.",
      "I can also show the map view for the affected building.",
    ],
    memorySeed + 3
  );

  const summaryLine = (() => {
    if (intent === "forecast") {
      return `Forecast looks like this: next hour energy ${prediction?.predictedEnergyNextHour ?? prediction?.predictedEnergyAvg ?? "N/A"}, water ${prediction?.predictedWaterNextHour ?? prediction?.predictedWaterAvg ?? "N/A"}.`;
    }

    if (intent === "compare") {
      return payload.answer || "The comparison is available in the last time window.";
    }

    if (intent === "score") {
      return `Your sustainability score is ${score}/100, which is ${risk} risk right now.`;
    }

    if (intent === "carbon") {
      return `Your current carbon footprint is about ${insights?.carbon ?? 0} kg CO2.`;
    }

    if (intent === "benchmark") {
      return payload.answer || `The highest-load building right now is ${topBuilding}.`;
    }

    if (intent === "diagnosis") {
      return rootCause || payload.answer || "The usage pattern suggests a waste spike.";
    }

    if (intent === "action_plan") {
      const primary = insights?.nextBestAction || payload.answer || "Keep monitoring the live load.";
      return `Best next move: ${primary}`;
    }

    if (intent === "report_summary") {
      return `Quick summary: score ${score}/100, savings potential Rs. ${insights?.monthlySavingsPotential ?? 0}, carbon ${insights?.carbon ?? 0} kg.`;
    }

    if (intent === "small_talk") {
      return payload.answer || "I'm here and ready to help with energy, water, carbon, alerts, and forecasts.";
    }

    return payload.answer || "I can help with energy, water, carbon, alerts, forecasts, and action plans.";
  })();

  const detailLine = (() => {
    if (intent === "score" && latest) {
      return `Latest reading is ${latest.building || "Unknown"} with energy ${energy} and water ${water}.`;
    }

    if (intent === "diagnosis") {
      return `Most likely root cause: ${rootCause || "mixed operational drift"}.`;
    }

    if (intent === "action_plan" && Array.isArray(payload?.actionPlan) && payload.actionPlan.length > 0) {
      const first = payload.actionPlan[0];
      return `Start with ${first.title || "the first action"}: ${first.reason || "reduce waste at the source"}.`;
    }

    if (intent === "compare" && payload?.comparison?.text) {
      return payload.comparison.text;
    }

    if (intent === "forecast") {
      return `Use this to plan peak-load shifting before the next interval.`;
    }

    if (intent === "report_summary") {
      return `Top building right now: ${payload?.report?.building || topBuilding}.`;
    }

    if (intent === "carbon") {
      return `To reduce it, trim peak loads, move heavy usage off-peak, and inspect repeated spikes.`;
    }

    return payload?.tone === "supportive"
      ? "I'm keeping this concise so you can act on it quickly."
      : "I'm keeping the answer grounded in the live data.";
  })();

  const followUp =
    payload?.followUp ||
    (intent === "forecast"
      ? "Want me to compare this against the last week?"
      : intent === "diagnosis"
        ? "Should I also show the worst building on the map?"
        : intent === "action_plan"
          ? "Do you want a 3-step action checklist?"
          : intent === "score"
            ? "Should I explain why the score moved?"
            : intent === "compare"
              ? "Do you want the same comparison by building too?"
              : intent === "carbon"
                ? "Should I estimate savings if you cut usage by 10%?"
                : null);

  return {
    reply: [opening + ".", summaryLine, detailLine, closers].filter(Boolean).join(" "),
    tone: "friendly",
    followUp,
  };
};

const buildStructuredAnswer = (payload) => ({
  status: "success",
  ...payload,
});

const extractResponseText = (response) => {
  if (!response) return "";
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const item of response.output || []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const piece of item.content) {
      if (piece?.type === "output_text" && piece.text) {
        chunks.push(piece.text);
      }
    }
  }

  return chunks.join("\n").trim();
};

const parseJsonSafe = (text) => {
  if (typeof text !== "string") return null;
  const cleaned = text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const extractHumanizedReply = (parsed, rawText = "") => {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const preferredKeys = [
      "reply",
      "response",
      "answer",
      "message",
      "text",
      "content",
      "output",
      "result",
    ];

    for (const key of preferredKeys) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    const stringValues = Object.values(parsed).filter((value) => typeof value === "string" && value.trim());
    if (stringValues.length === 1) {
      return stringValues[0].trim();
    }
  }

  if (typeof rawText === "string" && rawText.trim()) {
    return rawText.trim();
  }

  return "";
};

const buildConversationPrompt = ({
  question,
  payload,
  insights,
  latest,
  alerts,
  memoryTurns = [],
  memoryState = {},
  understanding = null,
}) => {
  const safeInsights = {
    score: insights?.score ?? 0,
    riskLevel: insights?.riskLevel || "Low",
    carbon: insights?.carbon ?? 0,
    savings: insights?.monthlySavingsPotential ?? 0,
    nextBestAction: insights?.nextBestAction || "",
    summary: insights?.summary || "",
    latestReading: insights?.latestReading || null,
    buildingBenchmarks: (insights?.buildingBenchmarks || []).slice(0, 5),
  };

  const safeLatest = latest
    ? {
        building: latest.building || "Unknown",
        location: latest.location || "",
        energy: toNumber(latest.energy),
        water: toNumber(latest.water),
        timestamp: latest.timestamp || latest.createdAt || null,
      }
    : null;

  const safeAlerts = (alerts || []).slice(0, 3).map((a) => ({
    building: a.building || "System",
    severity: a.severity || "LOW",
    status: a.status || "OPEN",
    message: a.message || "",
  }));

  const memorySummary = memoryState?.summary || "";
  const memoryStyle = memoryState?.style || {};
  const memoryProfile = memoryState?.profile || {};
  const memoryTopics = Array.isArray(memoryState?.topics) ? memoryState.topics.slice(0, 5).map((t) => `${t.name}:${t.count}`) : [];
  const safeUnderstanding = understanding
    ? {
        intent: understanding.intent || "general_help",
        tone: understanding.tone || "friendly",
        language: understanding.language || "hinglish",
        entities: understanding.entities || {},
        rewrittenQuestion: understanding.rewrittenQuestion || "",
        memorySummary: understanding.memorySummary || "",
        topics: understanding.topics || [],
      }
    : null;

  return [
    `Question: ${question}`,
    `Intent guess: ${safeUnderstanding?.intent || payload?.intent || "general_help"}`,
    `Tone guess: ${safeUnderstanding?.tone || "friendly"}`,
    `Rewritten query: ${safeUnderstanding?.rewrittenQuestion || "N/A"}`,
    `Extracted entities: ${JSON.stringify(safeUnderstanding?.entities || {})}`,
    `Current response plan: ${JSON.stringify(payload)}`,
    `Latest reading: ${JSON.stringify(safeLatest)}`,
    `Insights: ${JSON.stringify(safeInsights)}`,
    `Recent alerts: ${JSON.stringify(safeAlerts)}`,
    `User memory summary: ${safeUnderstanding?.memorySummary || memorySummary || "No stored memory yet."}`,
    `User memory profile: ${JSON.stringify(memoryProfile)}`,
    `Preferred style: ${JSON.stringify(memoryStyle)}`,
    `Top remembered topics: ${memoryTopics.join(", ") || "None"}`,
    `Conversation history:\n${formatMemory(memoryTurns) || "No prior conversation."}`,
    "",
    "Return ONLY valid JSON with this shape:",
    JSON.stringify({
      reply: "friendly natural language reply",
      tone: "friendly|direct|analytical|supportive",
      follow_up: "optional short follow-up question",
    }, null, 2),
    "Rules:",
    "- Do not invent data.",
    "- Keep the reply conversational and human.",
    "- If the user asks a general or casual question, answer naturally and then relate it to the sustainability app when relevant.",
    "- If the user asks about metrics, explain them clearly using the provided data.",
    "- Reply in Hinglish if the user uses Hinglish.",
  ].join("\n");
};

const getProviderPreference = () => {
  const provider = String(AI_PROVIDER_MODE || "auto").toLowerCase();
  if (provider === "gemini" || provider === "openai" || provider === "ollama" || provider === "local") {
    return provider;
  }
  return "auto";
};

const providerMessage = (provider, model) => ({
  provider,
  model,
  label:
    provider === "gemini"
      ? `gemini (${model})`
      : provider === "openai"
        ? `openai (${model})`
        : provider === "ollama"
          ? `ollama (${model})`
          : "local",
});

const humanizeWithOpenAI = async ({ prompt, signal } = {}) => {
  if (!OPENAI_API_KEY || typeof fetch !== "function") return null;
  if (Date.now() < openaiRetryUntil) return null;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
    "You are SustainOS AI, a warm general-purpose conversational assistant with sustainability expertise. Answer naturally, like a helpful human. Use the provided data only when the question is about the campus or operations. For casual, personal, or unrelated questions, answer directly and naturally. Always return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: 400,
    }),
  });

  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      openaiRetryUntil = Date.now() + OPENAI_RETRY_COOLDOWN_MS;
    }
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const json = await response.json();
  const rawText = json?.choices?.[0]?.message?.content || extractResponseText(json);
  const parsed = parseJsonSafe(rawText);
  const reply = extractHumanizedReply(parsed, rawText);

  if (!reply) {
    throw new Error("OpenAI response did not return a usable reply");
  }

  return {
    reply,
    tone: parsed.tone || "friendly",
    followUp: parsed.follow_up || parsed.followUp || "",
    provider: "openai",
    model: OPENAI_MODEL,
  };
};

const humanizeWithGemini = async ({ prompt, signal } = {}) => {
  if (!GEMINI_API_KEY || typeof fetch !== "function") return null;
  if (Date.now() < geminiRetryUntil) return null;

  const response = await fetch(
    `${GEMINI_URL}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
    "You are SustainOS AI, a warm general-purpose conversational assistant with sustainability expertise. Answer naturally, like a helpful human. Use the provided data only when the question is about the campus or operations. For casual, personal, or unrelated questions, answer directly and naturally. Always return valid JSON only.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      geminiRetryUntil = Date.now() + GEMINI_RETRY_COOLDOWN_MS;
    }
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const json = await response.json();
  const rawText =
    json?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n")
      .trim() || "";
  const parsed = parseJsonSafe(rawText);
  const reply = extractHumanizedReply(parsed, rawText);

  if (!reply) {
    throw new Error("Gemini response did not return a usable reply");
  }

  return {
    reply,
    tone: parsed.tone || "friendly",
    followUp: parsed.follow_up || parsed.followUp || "",
    provider: "gemini",
    model: GEMINI_MODEL,
  };
};

const humanizeWithOllama = async ({ prompt, signal } = {}) => {
  if (!OLLAMA_URL || typeof fetch !== "function") return null;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      keep_alive: "30m",
      messages: [
        {
          role: "system",
          content:
            "You are SustainOS AI. Answer like a natural human assistant. Keep replies concise, warm, and direct. If the question is casual, answer casually. If it is about campus data, use the supplied context. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      options: {
        temperature: 0.25,
        top_p: 0.9,
        num_ctx: 1024,
        num_predict: 96,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const json = await response.json();
  const rawText = json?.message?.content || "";
  const parsed = parseJsonSafe(rawText);
  const reply = extractHumanizedReply(parsed, rawText);

  if (!reply) {
    throw new Error("Ollama response did not return a usable reply");
  }

  return {
    reply,
    tone: parsed.tone || "friendly",
    followUp: parsed.follow_up || parsed.followUp || "",
    provider: "ollama",
    model: OLLAMA_MODEL,
  };
};

const humanizeWithLLM = async ({
  question,
  payload,
  insights,
  latest,
  alerts,
  memory,
  memoryState,
  understanding,
  promptOverride,
  timeoutMs = 5000,
}) => {
  if (typeof fetch !== "function") return null;

  const prompt =
    promptOverride ||
    buildConversationPrompt({
      question,
      payload,
      insights,
      latest,
      alerts,
      memoryTurns: memory,
      memoryState,
      understanding,
    });

  const mode = getProviderPreference();
  const attempts = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1500, timeoutMs || 5000));

  if (mode === "ollama" || mode === "auto") {
    attempts.push({
      name: "Ollama",
      run: () => humanizeWithOllama({ prompt, signal: controller.signal }),
    });
  }
  if (mode === "gemini" || mode === "auto") {
    attempts.push({
      name: "Gemini",
      run: () => humanizeWithGemini({ prompt, signal: controller.signal }),
    });
  }
  if (mode === "openai" || mode === "auto") {
    attempts.push({
      name: "OpenAI",
      run: () => humanizeWithOpenAI({ prompt, signal: controller.signal }),
    });
  }

  try {
    for (const attempt of attempts) {
      try {
        const result = await attempt.run();
        if (result?.reply) return result;
      } catch (err) {
        if (err?.name === "AbortError") {
          return null;
        }
        const msg = String(err?.message || "");
        if (/429|rate limit|quota|insufficient/i.test(msg)) {
          if (msg.toLowerCase().includes("gemini")) {
            geminiRetryUntil = Date.now() + GEMINI_RETRY_COOLDOWN_MS;
          } else {
            openaiRetryUntil = Date.now() + OPENAI_RETRY_COOLDOWN_MS;
          }
        }
        console.error(`${attempt.name} refinement failed:`, err.message || err);
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  return null;
};

const warmupLocalModel = async () => {
  if (!OLLAMA_URL || typeof fetch !== "function") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    await humanizeWithOllama({
      prompt:
        'Reply with valid JSON only: {"reply":"ready","tone":"friendly","follow_up":""}',
      signal: controller.signal,
    });
  } catch (err) {
    const message = String(err?.message || "");
    if (!/AbortError/i.test(message)) {
      console.error("Ollama warmup failed:", err.message || err);
    }
  } finally {
    clearTimeout(timeout);
  }

  return null;
};

const buildGeneralConversationPrompt = ({ question, memoryTurns = [], memoryState = {}, understanding = null }) => {
  const safeUnderstanding = understanding
    ? {
        intent: understanding.intent || "general_chat",
        tone: understanding.tone || "friendly",
        language: understanding.language || "hinglish",
        entities: understanding.entities || {},
        rewrittenQuestion: understanding.rewrittenQuestion || "",
      }
    : null;

  const memorySummary = memoryState?.summary || "";
  const memoryStyle = memoryState?.style || {};
  const memoryProfile = memoryState?.profile || {};

  return [
    `Question: ${question}`,
    `Intent guess: ${safeUnderstanding?.intent || "general_chat"}`,
    `Tone guess: ${safeUnderstanding?.tone || "friendly"}`,
    `Rewritten query: ${safeUnderstanding?.rewrittenQuestion || "N/A"}`,
    `Entities: ${JSON.stringify(safeUnderstanding?.entities || {})}`,
    `Memory summary: ${memorySummary || "No stored memory yet."}`,
    `Memory profile: ${JSON.stringify(memoryProfile)}`,
    `Preferred style: ${JSON.stringify(memoryStyle)}`,
    `Recent conversation:\n${formatMemory(memoryTurns.slice(-2)) || "No prior conversation."}`,
    "",
    "Return ONLY valid JSON with this shape:",
    JSON.stringify(
      {
        reply: "friendly natural language reply",
        tone: "friendly|direct|analytical|supportive|light",
        follow_up: "optional short follow-up question",
      },
      null,
      2
    ),
    "Rules:",
    "- Be conversational and human.",
    "- Do not mention sustainability unless relevant.",
    "- Answer general questions directly.",
    "- Keep it short and natural.",
  ].join("\n");
};

const computeConfidence = (intent, parsed, insights, hasHistory) => {
  let score = 55;
  if (intent && intent !== "general_help" && intent !== "unknown") score += 15;
  if (parsed?.hasEnergy || parsed?.hasWater || parsed?.hasCarbon || parsed?.hasScore) score += 10;
  if (parsed?.hasCompare || parsed?.hasAction || parsed?.hasBuilding || parsed?.hasAlert) score += 10;
  if (insights?.totalRecords > 0) score += 5;
  if (hasHistory) score += 5;
  return Math.min(95, Math.max(50, score));
};

const parseQuery = (q) => {
  const hasEnergy = /\benergy|electricity|power|kwh|load|units\b/.test(q);
  const hasWater = /\bwater|leak|pipeline|tank|flow|litre|liter\b/.test(q);
  const hasCarbon = /\bcarbon|co2|footprint|emission\b/.test(q);
  const hasScore = /\bscore|efficiency|sustainability|rating\b/.test(q);
  const hasAlert = /\balert|warning|issue|fault|error\b/.test(q);
  const hasCompare = /\bcompare|versus|vs|better|worse|trend\b/.test(q);
  const hasAction = /\baction|next step|what should i do|fix|resolve|recommend\b/.test(q);
  const hasBuilding = /\bbuilding|site|campus|floor|property\b/.test(q);
  const hasCurrent = /\bcurrent|latest|now|today|current data|my data|abhi|aaj\b/.test(q);
  const hasSuggestion = /\bsuggest|suggestion|recommend|tip|improve|optimize|save\b/.test(q);
  const hasSmallTalk = /\bhi|hello|hey|thanks|thank you|who are you|what can you do|how are you\b/.test(q);

  let timeframe = "current";
  if (q.includes("today")) timeframe = "today";
  else if (q.includes("tomorrow")) timeframe = "tomorrow";
  else if (q.includes("yesterday")) timeframe = "yesterday";
  else if (q.includes("week")) timeframe = "week";
  else if (q.includes("month")) timeframe = "month";
  else if (q.includes("year")) timeframe = "year";

  let comparisonTarget = null;
  const compareMatch = q.match(/\b(vs|versus|compare)\b(.*)$/);
  if (compareMatch?.[2]) comparisonTarget = compareMatch[2].trim().slice(0, 60);

  return {
    hasEnergy,
    hasWater,
    hasCarbon,
    hasScore,
    hasAlert,
    hasCompare,
    hasAction,
    hasBuilding,
    hasCurrent,
    hasSuggestion,
    hasSmallTalk,
    timeframe,
    comparisonTarget,
  };
};

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractLabeledValue = (text = "", labels = [], { numeric = false } = {}) => {
  const source = String(text || "");
  const labelGroup = labels.map((label) => escapeRegExp(label)).join("|");
  const valuePattern = numeric ? "(-?\\d+(?:\\.\\d+)?)" : "([^,.;\\n|]+)";
  const regex = new RegExp(`(?:${labelGroup})\\s*(?:is|hai|=|:|का|की|में|me|par|pe)?\\s*${valuePattern}`, "i");
  const match = source.match(regex);
  return match?.[1] ? normalizeName(match[1]) : "";
};

const detectTone = (question = "", parsed = {}, intent = "") => {
  const q = String(question).toLowerCase();
  if (parsed.hasAction || /\b(asap|urgent|critical|immediately|now|help|please help)\b/.test(q)) return "urgent";
  if (parsed.hasCompare || parsed.hasAlert || parsed.hasBuilding || intent === "diagnosis" || intent === "action_plan") {
    return "analytical";
  }
  if (parsed.hasSmallTalk || /\b(hi|hello|hey|thanks|thank you|joke|how are you)\b/.test(q)) return "friendly";
  return "supportive";
};

const extractEntities = (question = "", parsed = {}) => {
  const q = String(question || "");
  const lower = q.toLowerCase();
  const entity = {
    building: extractLabeledValue(q, ["building", "site", "campus", "floor", "property", "building name", "bldg"]),
    location: extractLabeledValue(q, ["location", "area", "zone", "place", "map", "लोकेशन", "स्थान"]),
    sensorId: extractLabeledValue(q, ["sensor id", "sensorid", "sensor", "device id", "id"], { numeric: false }),
    sensorName: extractLabeledValue(q, ["sensor name", "device name", "name"]),
    sensorType: extractLabeledValue(q, ["sensor type", "type"]),
    protocol: extractLabeledValue(q, ["protocol", "mode"]),
    energy: extractLabeledValue(q, ["energy", "electricity", "power", "kwh", "load", "units", "bijli", "ऊर्जा"], {
      numeric: true,
    }),
    water: extractLabeledValue(q, ["water", "paani", "litre", "liter", "usage", "consumption", "पानी"], {
      numeric: true,
    }),
    latitude: extractLabeledValue(q, ["latitude", "lat", "अक्षांश"], { numeric: true }),
    longitude: extractLabeledValue(q, ["longitude", "lng", "lon", "देशांतर"], { numeric: true }),
    batteryLevel: extractLabeledValue(q, ["battery", "battery level", "battery%", "बैटरी"], { numeric: true }),
    signalQuality: extractLabeledValue(q, ["signal", "signal quality", "quality", "सिग्नल"], { numeric: true }),
    timeframe: parsed.timeframe || "current",
    comparisonTarget: parsed.comparisonTarget || "",
  };

  if (!entity.building) {
    const buildingMatch = q.match(
      /\b(?:for|in|at|of|on|from)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{2,48})(?:\s+(?:building|campus|site|floor|property))?/i
    );
    if (buildingMatch?.[1]) entity.building = normalizeName(buildingMatch[1]);
  }

  if (!entity.location && /(?:location|area|zone|map)\s*(?:is|hai|=|:)?\s*([A-Za-z0-9][A-Za-z0-9\s.'-]{1,48})/i.test(q)) {
    entity.location = normalizeName(q.match(/(?:location|area|zone|map)\s*(?:is|hai|=|:)?\s*([A-Za-z0-9][A-Za-z0-9\s.'-]{1,48})/i)?.[1] || "");
  }

  return entity;
};

const rewriteQuestion = ({ question = "", intent = "general_help", parsed = {}, entities = {}, memoryState = {} } = {}) => {
  const pieces = [];
  const name = normalizeName(memoryState?.profile?.preferredName || memoryState?.profile?.displayName || "");
  if (name) pieces.push(`User: ${name}`);
  pieces.push(`Intent: ${intent}`);
  if (entities.building) pieces.push(`Building: ${entities.building}`);
  if (entities.location) pieces.push(`Location: ${entities.location}`);
  if (entities.sensorId) pieces.push(`Sensor: ${entities.sensorId}`);
  if (entities.timeframe) pieces.push(`Timeframe: ${entities.timeframe}`);
  if (parsed.hasCompare && entities.comparisonTarget) pieces.push(`Compare target: ${entities.comparisonTarget}`);
  pieces.push(`Question: ${String(question || "").replace(/\s+/g, " ").trim()}`);
  return pieces.join(" | ");
};

const buildUnderstanding = ({ question = "", intent = "general_help", parsed = {}, memoryState = {} } = {}) => {
  const entities = extractEntities(question, parsed);
  const tone = detectTone(question, parsed, intent);
  const rewrittenQuestion = rewriteQuestion({ question, intent, parsed, entities, memoryState });
  const memorySummary = memoryState?.summary || "";

  return {
    intent,
    tone,
    language: detectLanguageStyle(question),
    entities,
    rewrittenQuestion,
    memorySummary,
    topics: extractTopics(question, intent),
  };
};

const generateAnswer = async ({ question, userId, context = {} }) => {
  const qRaw = (question || "").toString();
  const q = qRaw.toLowerCase().trim();
  const detectedIntent = intentEngine.detectIntent ? intentEngine.detectIntent(qRaw) : "unknown";
  const parsed = parseQuery(q);
  const dbReady = context?.dbReady !== false && isDatabaseReady();
  const conversationState = await loadConversationState(userId);
  const memory = getMemory(userId);
  const identity = resolveDisplayName({ user: context?.user || null, memoryState: conversationState || {}, question: qRaw });
  const explicitPreferredName = extractNamePreference(qRaw);
  const memoryTurns = [
    ...((conversationState?.recentTurns || []).slice(-6)),
    ...memory,
  ].slice(-8);
  const understanding = buildUnderstanding({
    question: qRaw,
    intent: detectedIntent,
    parsed,
    memoryState: conversationState || {},
  });

  addToMemory(userId, "user", qRaw);

  if (explicitPreferredName) {
    const payload = buildStructuredAnswer({
      intent: "small_talk",
      answer: `Got it — I'll call you ${explicitPreferredName} from now on.`,
      tone: "friendly",
      followUp: "Want me to remember anything else?",
      parsed,
      understanding,
    });

    payload.aiMode = "local";
    payload.confidence = 68;

    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "small_talk",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName || explicitPreferredName,
      preferredName: explicitPreferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights: null };
  }

  const hasAppSignal =
    parsed.hasEnergy ||
    parsed.hasWater ||
    parsed.hasCarbon ||
    parsed.hasScore ||
    parsed.hasAlert ||
    parsed.hasCompare ||
    parsed.hasAction ||
    parsed.hasBuilding ||
    parsed.hasCurrent ||
    parsed.hasSuggestion;
  const appQueryPattern =
    /facility|maintenance|compliance|audit|budget|occupancy|hvac|iot|sensor|workflow|sla|uptime|downtime|asset|procurement|industry|telemetry|profile|voice|energy|water|carbon|score|building|campus|location|map|forecast|predict|report|alert|compare|action|save|optimize|improve/i;
  const generalConversationCandidate = !hasAppSignal && !appQueryPattern.test(q);

  if (generalConversationCandidate) {
    const quickPrompt = buildGeneralConversationPrompt({
      question: qRaw,
      memoryTurns: memoryTurns.slice(-2),
      memoryState: conversationState || {},
      understanding,
    });

    let humanized = null;
    try {
      humanized = await humanizeWithLLM({
        question: qRaw,
        payload: { intent: "general_chat" },
        insights: null,
        latest: null,
        alerts: [],
        memory: memoryTurns,
        memoryState: conversationState || {},
        understanding,
        promptOverride: quickPrompt,
        timeoutMs: 15000,
      });
    } catch (err) {
      console.error("General chat refinement failed:", err.message || err);
    }

    if (!humanized?.reply) {
      const localGeneral = buildHumanConversationReply({
        question: qRaw,
        memoryState: conversationState || {},
        memoryTurns,
        user: context?.user || null,
      });
      humanized = {
        reply: localGeneral?.reply || "I can help with casual chat, questions, or campus data if you want.",
        tone: localGeneral?.tone || "friendly",
        followUp: localGeneral?.followUp || "Want to ask something else?",
        provider: "local",
        model: null,
      };
    }

    const payload = buildStructuredAnswer({
      intent: "general_chat",
      answer: humanized.reply,
      tone: humanized.tone || "friendly",
      followUp: humanized.followUp || "Want to ask something else?",
      parsed,
      understanding,
    });

    payload.ai = providerMessage(humanized.provider, humanized.model);
    payload.aiMode = payload.ai?.provider && payload.ai.provider !== "local" ? "enhanced" : "local";
    payload.confidence = computeConfidence(payload.intent, parsed, null, memoryTurns.length > 0);

    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "general_chat",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights: null };
  }

  const hasLiveDataContext =
    Boolean(context?.latest) ||
    (Array.isArray(context?.history) && context.history.length > 0) ||
    (Array.isArray(context?.alerts) && context.alerts.length > 0);

  if (!userId || !dbReady || !hasLiveDataContext) {
    const payload = buildLimitedDataPayload({
      question: qRaw,
      userId,
      dbReady,
      detectedIntent,
      parsed,
      understanding,
    });

    payload.aiMode = "local";
    payload.confidence = userId ? 62 : 58;

    try {
      if (!context?.skipLLM) {
        const humanized = await humanizeWithLLM({
          question: qRaw,
          payload,
          insights: null,
          latest: context?.latest || null,
          alerts: Array.isArray(context?.alerts) ? context.alerts : [],
          memory: memoryTurns,
          memoryState: conversationState || {},
          understanding,
          timeoutMs: 12000,
        });

        if (humanized?.reply) {
          payload.answer = humanized.reply;
          payload.ai = providerMessage(humanized.provider, humanized.model);
          payload.aiMode = payload.ai?.provider && payload.ai.provider !== "local" ? "enhanced" : "local";
          if (humanized.tone) payload.tone = humanized.tone;
          if (humanized.followUp) payload.followUp = humanized.followUp;
        }
      }
    } catch (err) {
      console.error("Limited-data AI refinement failed:", err.message || err);
      payload.ai = {
        provider: "local",
        model: null,
        error: err.message || "Unknown AI error",
      };
    }

    if (!payload.ai?.provider || payload.ai.provider === "local") {
      const localHuman = humanizeLocalReply({
        payload,
        parsed,
        insights: null,
        latest: context?.latest || null,
        alerts: Array.isArray(context?.alerts) ? context.alerts : [],
        prediction: null,
        rootCause: "",
        tips: [],
        question: qRaw,
      });

      if (localHuman?.reply) {
        payload.answer = localHuman.reply;
        payload.tone = localHuman.tone || payload.tone || "friendly";
        if (localHuman.followUp) payload.followUp = localHuman.followUp;
      }
    }

    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "general_help",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights: null };
  }

  const period = detectPeriod(q);
  const summaryPromise = executiveInsights.getExecutiveInsights(userId, period);
  const latestPromise = context.latest || Data.findOne({ userId }).sort({ timestamp: -1, createdAt: -1 });
  const alertsPromise = context.alerts || Alert.find({ userId }).sort({ time: -1 }).limit(5);
  const historyPromise = context.history || Data.find({ userId }).sort({ timestamp: -1 }).limit(48);
  const [insights, latest, alerts, recentHistory] = await Promise.all([
    summaryPromise,
    Promise.resolve(latestPromise),
    Promise.resolve(alertsPromise),
    Promise.resolve(historyPromise),
  ]);

  const prediction = (await predictService.predictNext(recentHistory)) || {};
  const rootCause = await root.findCause(userId);
  const tips = await suggest.getSuggestions(userId);

  const isFollowUp = q.length < 25 && memoryTurns.length > 1;
  const comparison = summarizeComparison(insights);
  const topBuilding = insights?.buildingBenchmarks?.[0];

  const humanReply = buildHumanConversationReply({
    question: qRaw,
    memoryState: conversationState || {},
    memoryTurns,
    user: context?.user || null,
  });
  const shouldUseLLMRefinement = !context?.skipLLM && getProviderPreference() !== "local";
  const refinePayloadWithLLM = async (payload) => {
    if (!shouldUseLLMRefinement || !payload) return payload;

    try {
      const humanized = await humanizeWithLLM({
        question: qRaw,
        payload,
        insights,
        latest,
        alerts,
        memory: memoryTurns,
        memoryState: conversationState || {},
        understanding,
        timeoutMs: 15000,
      });

      if (humanized?.reply) {
        payload.answer = humanized.reply;
        payload.ai = providerMessage(humanized.provider, humanized.model);
        payload.aiMode = payload.ai?.provider && payload.ai.provider !== "local" ? "enhanced" : "local";
        if (humanized.tone) payload.tone = humanized.tone;
        if (humanized.followUp) payload.followUp = humanized.followUp;
      }
    } catch (err) {
      console.error("AI refinement failed:", err.message || err);
      payload.ai = {
        provider: "local",
        model: null,
        error: err.message || "Unknown AI error",
      };
    }

    return payload;
  };

  if (humanReply && !parsed.hasEnergy && !parsed.hasWater && !parsed.hasCarbon && !parsed.hasScore && !parsed.hasAlert && !parsed.hasCompare && !parsed.hasAction && !parsed.hasBuilding && !parsed.hasCurrent && !parsed.hasSuggestion) {
    const payload = buildStructuredAnswer({
      intent: "small_talk",
      answer: humanReply.reply,
      tone: humanReply.tone || "friendly",
      followUp: humanReply.followUp || "",
      parsed,
      understanding,
    });

    payload.aiMode = "local";
    payload.confidence = 70;
    await refinePayloadWithLLM(payload);

    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "small_talk",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights };
  }

  const casualReply = buildCasualConversationReplyV2({
    question: qRaw,
    memory: memoryTurns,
    latest,
    insights,
    user: context?.user || null,
    memoryState: conversationState || {},
  });

  if (casualReply && parsed.hasSmallTalk) {
    const payload = buildStructuredAnswer({
      intent: "small_talk",
      answer: casualReply.reply,
      tone: casualReply.tone || "friendly",
      followUp: casualReply.followUp || "",
      parsed,
      understanding,
    });

    payload.aiMode = "local";
    payload.confidence = computeConfidence(payload.intent, parsed, insights, memoryTurns.length > 0);
    await refinePayloadWithLLM(payload);

    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "small_talk",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights };
  }

  const industryReply = buildIndustryCopilotReply({
    question: qRaw,
    latest,
    insights,
    alerts,
    prediction,
    rootCause,
    user: context?.user || null,
  });

  if (industryReply && (detectedIntent === "operations" || /facility|maintenance|compliance|audit|budget|occupancy|hvac|iot|sensor|workflow|sla|uptime|downtime|asset|procurement|industry/i.test(q))) {
    const payload = buildStructuredAnswer({
      intent: "industry_support",
      answer: industryReply.reply,
      tone: industryReply.tone || "friendly",
      followUp: industryReply.followUp || "",
      parsed,
      understanding,
    });

    payload.aiMode = "local";
    payload.confidence = computeConfidence(payload.intent, parsed, insights, memoryTurns.length > 0);
    addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "industry_support",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

    return { ...payload, conversation: getMemory(userId).slice(-6), insights };
  }

  const shouldUseCurrentSnapshot =
    parsed.hasCurrent ||
    ((parsed.hasEnergy || parsed.hasWater || parsed.hasScore || parsed.hasCarbon) &&
      !parsed.hasCompare &&
      !q.includes("history") &&
      !q.includes("forecast") &&
      !q.includes("predict") &&
      !q.includes("report"));

  let payload = null;

  if (shouldUseCurrentSnapshot || q.includes("current") || q.includes("latest") || q.includes("now") || q.includes("today")) {
    payload = buildStructuredAnswer({
      intent: "current_snapshot",
      answer:
        latest
          ? `Latest reading: ${latest.building || "Unknown"} - energy ${toNumber(latest.energy)}, water ${toNumber(latest.water)}. Current score ${insights?.score ?? "N/A"}/100.`
          : "No current reading is available yet.",
      source: "current_data",
      current: latest
        ? {
            building: latest.building || "Unknown",
            energy: toNumber(latest.energy),
            water: toNumber(latest.water),
            timestamp: latest.timestamp || latest.createdAt || null,
          }
        : null,
      report: {
        score: insights?.score ?? 0,
        carbon: insights?.carbon ?? 0,
        savings: insights?.monthlySavingsPotential ?? 0,
      },
      parsed,
      understanding,
    });
  } else if (detectedIntent === "prediction" || q.includes("forecast") || q.includes("predict")) {
    payload = buildStructuredAnswer({
      intent: "forecast",
      answer:
        `Forecast snapshot: next hour energy ${prediction.predictedEnergyNextHour ?? prediction.predictedEnergyAvg ?? "N/A"}, water ${prediction.predictedWaterNextHour ?? prediction.predictedWaterAvg ?? "N/A"}. Next day energy ${prediction.predictedEnergyNextDay ?? "N/A"}, water ${prediction.predictedWaterNextDay ?? "N/A"}.`,
      forecast: prediction,
      suggestion: "Use this to plan peak-load shifting before the next interval.",
      parsed,
      understanding,
    });
  } else if (detectedIntent === "compare" || q.includes("compare") || q.includes("vs") || q.includes("versus")) {
    payload = buildStructuredAnswer({
      intent: "compare",
      answer: comparison?.text || "Not enough historical data to compare periods yet.",
      comparison,
      insights,
      parsed,
      understanding,
    });
  } else if (detectedIntent === "action" || q.includes("what should i do") || q.includes("next best action") || q.includes("action") || q.includes("fix")) {
    payload = buildStructuredAnswer({
      intent: "action_plan",
      answer: `Priority action: ${insights?.nextBestAction || "Continue monitoring"}`,
      actionPlan: insights?.priorityActions || [],
      riskLevel: insights?.riskLevel || "Low",
      parsed,
      understanding,
    });
  } else if (detectedIntent === "report" || q.includes("report") || q.includes("summary") || q.includes("overview") || q.includes("dashboard")) {
    payload = buildStructuredAnswer({
      intent: "report_summary",
      answer:
        `Current sustainability score is ${insights?.score ?? "N/A"}/100 with ${insights?.riskLevel || "Low"} risk. Estimated monthly savings: Rs. ${insights?.monthlySavingsPotential || 0}.`,
      report: {
        score: insights?.score ?? 0,
        carbon: insights?.carbon ?? 0,
        savings: insights?.monthlySavingsPotential ?? 0,
        building: topBuilding?.building || null,
      },
      parsed,
      understanding,
    });
  } else if (parsed.hasSuggestion || detectedIntent === "suggestion" || q.includes("suggest") || q.includes("tip") || q.includes("optimize") || q.includes("improve")) {
    payload = buildStructuredAnswer({
      intent: "suggestions",
      answer: tips.length
        ? tips.join("\n")
        : "Keep monitoring the current window. System is operating within normal range.",
      suggestions: (tips.length ? tips : [
        "Check for small leaks or idle draws.",
        "Shift heavy loads to off-peak hours.",
        "Review buildings with repeated spikes first.",
        "Use alerts to catch waste before it repeats.",
      ]).map((message, index) => ({
        title: `Tip ${index + 1}`,
        message,
      })),
      parsed,
      understanding,
    });
  } else if (detectedIntent === "score" || q.includes("score") || q.includes("sustainability score") || q.includes("efficiency")) {
    payload = buildStructuredAnswer({
      intent: "score",
      answer:
        `Sustainability score: ${insights?.score ?? "N/A"}/100. Risk level: ${insights?.riskLevel || "Low"}. ${insights?.nextBestAction ? `Next action: ${insights.nextBestAction}` : ""}`,
      score: {
        value: insights?.score ?? 0,
        riskLevel: insights?.riskLevel || "Low",
        savings: insights?.monthlySavingsPotential ?? 0,
      },
      parsed,
      understanding,
    });
  } else if (detectedIntent === "carbon" || q.includes("carbon") || q.includes("co2") || q.includes("footprint")) {
    payload = buildStructuredAnswer({
      intent: "carbon",
      answer:
        `Estimated carbon footprint is ${insights?.carbon ?? 0} kg CO2 for the current window. To reduce it, cut peak energy usage, shift heavy loads off-peak, and inspect repeated spikes.`,
      carbon: {
        value: insights?.carbon ?? 0,
        savings: insights?.monthlySavingsPotential ?? 0,
      },
      parsed,
      understanding,
    });
  } else if (detectedIntent === "building" || q.includes("building") || q.includes("site") || q.includes("worst")) {
    payload = buildStructuredAnswer({
      intent: "benchmark",
      answer: topBuilding
        ? `${topBuilding.building} is the highest-load building in the current window with score ${topBuilding.efficiency}%.`
        : "No building benchmark available yet.",
      benchmark: insights?.buildingBenchmarks || [],
      parsed,
      understanding,
    });
  } else if (detectedIntent === "cause" || q.includes("why") || q.includes("cause") || q.includes("root") || q.includes("problem")) {
    payload = buildStructuredAnswer({
      intent: "diagnosis",
      answer: rootCause,
      diagnosis: {
        cause: rootCause,
        latest: latest
          ? { energy: toNumber(latest.energy), water: toNumber(latest.water), building: latest.building }
          : null,
      },
      parsed,
      understanding,
    });
  } else if (detectedIntent === "alert" || q.includes("alert")) {
    payload = buildStructuredAnswer({
      intent: "alert",
      answer:
        alerts.length > 0
          ? `Latest alert: ${alerts[0].message}`
          : "No active alerts in your account right now.",
      alerts: alerts.map((a) => ({
        message: a.message,
        severity: a.severity,
        status: a.status,
      })),
      parsed,
      understanding,
    });
  } else if (parsed.hasSmallTalk && !parsed.hasEnergy && !parsed.hasWater && !parsed.hasCarbon && !parsed.hasScore) {
    payload = buildStructuredAnswer({
      intent: "small_talk",
      answer:
        "Hey! I can help with live sustainability questions, forecasts, comparisons, alerts, reports, and next actions. Ask me in a natural way and I'll figure it out.",
      parsed,
      understanding,
    });
  } else if (isFollowUp) {
    const lastAssistant = [...memoryTurns].reverse().find((m) => m.role === "assistant");
    payload = buildStructuredAnswer({
      intent: "follow_up",
      answer: `Following up on the previous point: ${lastAssistant?.text || "I can expand on the current analytics or recommend the top action."}`,
      parsed,
      understanding,
    });
  } else {
    const hints = [];
    if (q.includes("current") || q.includes("latest") || q.includes("today") || q.includes("now")) hints.push("current data snapshot");
    if (parsed.hasScore) hints.push("sustainability score");
    if (parsed.hasEnergy) hints.push("energy usage");
    if (parsed.hasWater) hints.push("water usage");
    if (parsed.hasCarbon) hints.push("carbon footprint");
    if (parsed.hasCompare) hints.push("period comparison");
    if (parsed.hasAction) hints.push("next best action");
    if (parsed.hasBuilding) hints.push("building benchmark");

    payload = buildStructuredAnswer({
      intent: "general_help",
      answer:
        hints.length > 0
          ? `I can help with ${hints.join(", ")}. Ask me to compare periods, explain a spike, or show the next best action.`
          : `Ask me about score, carbon footprint, building comparison, forecast, or actions.`,
      hints,
      parsed,
      understanding,
    });
  }

  if (payload?.answer) {
    const isFirstAssistant = (memoryTurns || []).filter((m) => m.role === "assistant").length === 0;
    if (!OPENAI_API_KEY && isFirstAssistant && !/^hi\b/i.test(payload.answer)) {
      payload.answer = `Hi - ${payload.answer}`;
    }
  }

  try {
    const shouldSkipLLM = Boolean(context?.skipLLM);
    if (!shouldSkipLLM) {
      const humanized = await humanizeWithLLM({
        question: qRaw,
        payload,
        insights,
        latest,
        alerts,
        memory: memoryTurns,
        memoryState: conversationState,
        understanding,
      });

      if (humanized?.reply) {
        payload.answer = humanized.reply;
        payload.ai = providerMessage(humanized.provider, humanized.model);

        if (humanized.tone) payload.tone = humanized.tone;
        if (humanized.followUp) payload.followUp = humanized.followUp;
      }
    }
  } catch (err) {
    console.error("AI refinement failed:", err.message || err);
    payload.ai = {
      provider: "local",
      model: null,
      error: err.message || "Unknown OpenAI error",
    };
  }

  if (!payload.ai?.provider || payload.ai.provider === "local") {
    const localHuman = humanizeLocalReply({
      payload,
      parsed,
      insights,
      latest,
      alerts,
      prediction,
      rootCause,
      tips,
      question: qRaw,
    });

    if (localHuman?.reply) {
      payload.answer = localHuman.reply;
      payload.tone = localHuman.tone || payload.tone || "friendly";
      if (localHuman.followUp) payload.followUp = localHuman.followUp;
    }
  }

  payload.aiMode = payload.ai?.provider && payload.ai.provider !== "local" ? "enhanced" : "local";

  payload.confidence = computeConfidence(payload.intent, parsed, insights, memoryTurns.length > 0);

  addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));
    await persistConversationTurn({
      userId,
      question: qRaw,
      answer: payload.answer || "",
      intent: payload.intent || "general_help",
      tone: payload.tone || "friendly",
      followUp: payload.followUp || "",
      topics: extractTopics(qRaw, payload.intent),
      language: detectLanguageStyle(qRaw),
      displayName: identity.displayName,
      preferredName: identity.preferredName,
    });

  return { ...payload, conversation: getMemory(userId).slice(-6), insights };
};

module.exports = { generateAnswer, getMemory, warmupLocalModel };
