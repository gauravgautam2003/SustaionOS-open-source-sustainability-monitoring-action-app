const Data = require("../models/Data");
const Alert = require("../models/Alert");
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
    "I can read your latest data, compare periods, explain spikes, forecast usage, or suggest actions. Try asking for a comparison, a diagnosis, a forecast, or the top next step.",
});

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
    return null;
  }
};

const buildConversationPrompt = ({ question, payload, insights, latest, alerts, memory }) => {
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

  return [
    `Question: ${question}`,
    `Current response plan: ${JSON.stringify(payload)}`,
    `Latest reading: ${JSON.stringify(safeLatest)}`,
    `Insights: ${JSON.stringify(safeInsights)}`,
    `Recent alerts: ${JSON.stringify(safeAlerts)}`,
    `Conversation history:\n${formatMemory(memory) || "No prior conversation."}`,
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
  if (provider === "gemini" || provider === "openai" || provider === "local") {
    return provider;
  }
  return "auto";
};

const providerMessage = (provider, model) => ({
  provider,
  model,
  label: provider === "gemini" ? `gemini (${model})` : provider === "openai" ? `openai (${model})` : "local",
});

const humanizeWithOpenAI = async ({ prompt }) => {
  if (!OPENAI_API_KEY || typeof fetch !== "function") return null;
  if (Date.now() < openaiRetryUntil) return null;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are SustainOS AI, a friendly sustainability copilot. Keep answers concise, natural, grounded in the provided data, and short. Always return valid JSON only.",
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

  if (!parsed || !parsed.reply) {
    throw new Error("OpenAI response did not return valid JSON");
  }

  return {
    reply: String(parsed.reply).trim(),
    tone: parsed.tone || "friendly",
    followUp: parsed.follow_up || parsed.followUp || "",
    provider: "openai",
    model: OPENAI_MODEL,
  };
};

const humanizeWithGemini = async ({ prompt }) => {
  if (!GEMINI_API_KEY || typeof fetch !== "function") return null;
  if (Date.now() < geminiRetryUntil) return null;

  const response = await fetch(
    `${GEMINI_URL}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are SustainOS AI, a friendly sustainability copilot. Keep answers concise, natural, grounded in the provided data, and short. Always return valid JSON only.",
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

  if (!parsed || !parsed.reply) {
    throw new Error("Gemini response did not return valid JSON");
  }

  return {
    reply: String(parsed.reply).trim(),
    tone: parsed.tone || "friendly",
    followUp: parsed.follow_up || parsed.followUp || "",
    provider: "gemini",
    model: GEMINI_MODEL,
  };
};

const humanizeWithLLM = async ({ question, payload, insights, latest, alerts, memory }) => {
  if (typeof fetch !== "function") return null;

  const prompt = buildConversationPrompt({
    question,
    payload,
    insights,
    latest,
    alerts,
    memory,
  });

  const mode = getProviderPreference();
  const attempts = [];

  if (mode === "gemini" || mode === "auto") {
    attempts.push(() => humanizeWithGemini({ prompt }));
  }
  if (mode === "openai" || mode === "auto") {
    attempts.push(() => humanizeWithOpenAI({ prompt }));
  }

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result?.reply) return result;
    } catch (err) {
      const msg = String(err?.message || "");
      if (/429|rate limit|quota|insufficient/i.test(msg)) {
        if (msg.toLowerCase().includes("gemini")) {
          geminiRetryUntil = Date.now() + GEMINI_RETRY_COOLDOWN_MS;
        } else {
          openaiRetryUntil = Date.now() + OPENAI_RETRY_COOLDOWN_MS;
        }
      }
      console.error(`${msg.includes("Gemini") ? "Gemini" : "OpenAI"} refinement failed:`, err.message || err);
    }
  }

  return null;
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

const generateAnswer = async ({ question, userId, context = {} }) => {
  const qRaw = (question || "").toString();
  const q = qRaw.toLowerCase().trim();
  const detectedIntent = intentEngine.detectIntent ? intentEngine.detectIntent(qRaw) : "unknown";
  const parsed = parseQuery(q);

  addToMemory(userId, "user", qRaw);
  const memory = getMemory(userId);

  if (!userId) {
    return buildStructuredAnswer({
      intent: "unauthorized",
      answer: "Unauthorized: user context missing.",
    });
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

  const isFollowUp = q.length < 25 && memory.length > 1;
  const comparison = summarizeComparison(insights);
  const topBuilding = insights?.buildingBenchmarks?.[0];
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
    });
  } else if (detectedIntent === "prediction" || q.includes("forecast") || q.includes("predict")) {
    payload = buildStructuredAnswer({
      intent: "forecast",
      answer:
        `Forecast snapshot: next hour energy ${prediction.predictedEnergyNextHour ?? prediction.predictedEnergyAvg ?? "N/A"}, water ${prediction.predictedWaterNextHour ?? prediction.predictedWaterAvg ?? "N/A"}. Next day energy ${prediction.predictedEnergyNextDay ?? "N/A"}, water ${prediction.predictedWaterNextDay ?? "N/A"}.`,
      forecast: prediction,
      suggestion: "Use this to plan peak-load shifting before the next interval.",
      parsed,
    });
  } else if (detectedIntent === "compare" || q.includes("compare") || q.includes("vs") || q.includes("versus")) {
    payload = buildStructuredAnswer({
      intent: "compare",
      answer: comparison?.text || "Not enough historical data to compare periods yet.",
      comparison,
      insights,
      parsed,
    });
  } else if (detectedIntent === "action" || q.includes("what should i do") || q.includes("next best action") || q.includes("action") || q.includes("fix")) {
    payload = buildStructuredAnswer({
      intent: "action_plan",
      answer: `Priority action: ${insights?.nextBestAction || "Continue monitoring"}`,
      actionPlan: insights?.priorityActions || [],
      riskLevel: insights?.riskLevel || "Low",
      parsed,
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
    });
  } else if (detectedIntent === "building" || q.includes("building") || q.includes("site") || q.includes("worst")) {
    payload = buildStructuredAnswer({
      intent: "benchmark",
      answer: topBuilding
        ? `${topBuilding.building} is the highest-load building in the current window with score ${topBuilding.efficiency}%.`
        : "No building benchmark available yet.",
      benchmark: insights?.buildingBenchmarks || [],
      parsed,
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
    });
  } else if (parsed.hasSmallTalk && !parsed.hasEnergy && !parsed.hasWater && !parsed.hasCarbon && !parsed.hasScore) {
    payload = buildStructuredAnswer({
      intent: "small_talk",
      answer:
        "Hey! I can help with live sustainability questions, forecasts, comparisons, alerts, reports, and next actions. Ask me in a natural way and I’ll figure it out.",
      parsed,
    });
  } else if (isFollowUp) {
    const lastAssistant = [...memory].reverse().find((m) => m.role === "assistant");
    payload = buildStructuredAnswer({
      intent: "follow_up",
      answer: `Following up on the previous point: ${lastAssistant?.text || "I can expand on the current analytics or recommend the top action."}`,
      parsed,
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
    });
  }

  if (payload?.answer) {
    const isFirstAssistant = (memory || []).filter((m) => m.role === "assistant").length === 0;
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
        memory,
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

  payload.aiMode = payload.ai?.provider === "openai" ? "enhanced" : "local";

  payload.confidence = computeConfidence(payload.intent, parsed, insights, memory.length > 0);

  addToMemory(userId, "assistant", payload.answer || JSON.stringify(payload));

  return { ...payload, conversation: getMemory(userId).slice(-6), insights };
};

module.exports = { generateAnswer, getMemory };
