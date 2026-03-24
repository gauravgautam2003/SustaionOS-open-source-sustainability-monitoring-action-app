import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Bot,
  Cpu,
  Mic,
  MessageCircle,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  X,
} from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { getAuthToken } from "../../utils/auth";
import { apiUrl } from "../../utils/api";

const seedSuggestions = [
  "What can you do?",
  "Tell me a joke",
  "How are you?",
  "Why energy usage high?",
];

const ASSISTANT_MODES = {
  chat: "chat",
  telemetry: "telemetry",
  profile: "profile",
};

const emptyTelemetryDraft = {
  building: "",
  location: "",
  latitude: "",
  longitude: "",
  sensorId: "",
  sensorName: "",
  sensorType: "manual",
  protocol: "manual",
  batteryLevel: "",
  signalQuality: "",
  water: "",
  energy: "",
};

const emptyProfileDraft = {
  name: "",
  building: "",
};

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const normalizeText = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .trim();

const isHindiLike = (text = "") =>
  /[\u0900-\u097F]/.test(text) ||
  /(bhai|yaar|kya|kaise|kyu|kyon|nahi|nahin|haan|hai|karo|kar|bata|batao|bhej|submit|save|naam|paani|water|bijli|energy|location|building|sensor)/i.test(
    String(text).toLowerCase()
  );

const isSubmitCommand = (text = "") =>
  /^(submit|save|send|done|finish|ok|okay|haan|ha|ji|theek|thik|bas|bhej do|bhejdo|भेज दो|भेजो|save kar do|submit kar do|ho gaya|ho gya|हो गया|ठीक है)\b/i.test(
    String(text).trim().toLowerCase()
  );

const extractFirstNumber = (text = "") => {
  const match = String(text).match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : "";
};

const extractByLabel = (text = "", labels = []) => {
  const source = String(text);
  const labelGroup = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:${labelGroup})\\s*(?:is|hai|=|:|का|की|में|me|par|pe)?\\s*(-?\\d+(?:\\.\\d+)?)`, "i");
  const match = source.match(regex);
  if (match?.[1]) return match[1];
  return "";
};

const extractTextByLabel = (text = "", labels = []) => {
  const source = String(text);
  const labelGroup = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:${labelGroup})\\s*(?:is|hai|=|:|का|की|में|me|par|pe)?\\s*([^,.;]+)`, "i");
  const match = source.match(regex);
  return match?.[1] ? normalizeText(match[1]) : "";
};

const extractDraftBuilding = (text = "") => {
  const labeled = extractTextByLabel(text, ["building", "site", "campus", "building name", "bldg", "भवन", "बिल्डिंग", "कैंपस"]);
  if (labeled) return labeled;

  const cleaned = normalizeText(text)
    .replace(/^(data|telemetry|record|save|submit|add|update|mera|mere|meri|mujhe|please|pls|krdo|kar do|kar do)\s+/i, "")
    .replace(/(water|paani|पानी|energy|bijli|बिजली|location|लोकेशन|latitude|longitude|sensor|नाम|name).*/i, "")
    .split(/[,;/|]/)[0]
    .trim();

  return cleaned && cleaned.length >= 3 ? cleaned : "";
};

const extractTelemetryDraft = (text = "", previous = emptyTelemetryDraft) => {
  const next = { ...previous };
  const building = extractDraftBuilding(text);
  if (building) next.building = building;

  const location = extractTextByLabel(text, ["location", "area", "zone", "लोकेशन", "स्थान", "इलाका"]);
  if (location) next.location = location;

  const energy = extractByLabel(text, ["energy", "electricity", "power", "kwh", "load", "units", "bijli", "बिजली", "ऊर्जा", "उर्जा"]);
  if (energy) next.energy = energy;

  const water = extractByLabel(text, ["water", "paani", "पानी", "water usage", "flow", "consumption", "जल"]);
  if (water) next.water = water;

  const latitude = extractByLabel(text, ["latitude", "lat", "अक्षांश"]);
  if (latitude) next.latitude = latitude;

  const longitude = extractByLabel(text, ["longitude", "lng", "lon", "देशांतर"]);
  if (longitude) next.longitude = longitude;

  const battery = extractByLabel(text, ["battery", "battery level", "battery%", "बैटरी"]);
  if (battery) next.batteryLevel = battery;

  const signal = extractByLabel(text, ["signal", "signal quality", "quality", "सिग्नल"]);
  if (signal) next.signalQuality = signal;

  const sensorId = extractTextByLabel(text, ["sensor id", "sensor", "id", "सेंसर"]);
  if (sensorId) next.sensorId = sensorId.split(/\s+/)[0];

  const sensorName = extractTextByLabel(text, ["sensor name", "device name", "name", "नाम"]);
  if (sensorName) next.sensorName = sensorName;

  const sensorType = extractTextByLabel(text, ["sensor type", "type"]);
  if (sensorType) next.sensorType = sensorType;

  const protocol = extractTextByLabel(text, ["protocol", "mode"]);
  if (protocol) next.protocol = protocol;

  return next;
};

const extractProfileDraft = (text = "", previous = emptyProfileDraft) => {
  const next = { ...previous };
  const nameMatch =
    String(text).match(/(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z\s.'-]{1,40})/i) ||
    String(text).match(/(?:मेरा नाम(?: है)?|नाम(?: है)?|मैं\s+([^\d,.;]{1,40})\s*(?:हूँ|हूं|hun|hoon)|मुझे\s+([^\d,.;]{1,40})\s*(?:कहो|bolo|बोलो|बुलाओ))/i);
  if (nameMatch?.[1]) {
    next.name = normalizeText(nameMatch[1]);
  } else if (nameMatch?.[2]) {
    next.name = normalizeText(nameMatch[2]);
  } else if (nameMatch?.[3]) {
    next.name = normalizeText(nameMatch[3]);
  }

  const building = extractDraftBuilding(text);
  if (building) next.building = building;

  return next;
};

const telemetryMissingFields = (draft = emptyTelemetryDraft) => {
  const missing = [];
  if (!normalizeText(draft.building)) missing.push("building");
  if (draft.water === "" || draft.water == null) missing.push("water");
  if (draft.energy === "" || draft.energy == null) missing.push("energy");
  return missing;
};

const profileMissingFields = (draft = emptyProfileDraft) => {
  const missing = [];
  if (!normalizeText(draft.name)) missing.push("name");
  if (!normalizeText(draft.building)) missing.push("building");
  return missing;
};

const draftProgress = (draft, missing) => {
  const filled = Object.values(draft).filter((value) => normalizeText(value) && value !== "manual").length;
  const total = Object.keys(draft).length;
  return {
    filled,
    total,
    missing,
  };
};

const initialMessage = {
  sender: "ai",
  text: "Hi, I can chat casually, answer general questions, explain campus data, and help with voice updates or operations.",
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickTips, setQuickTips] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);
  const [assistantMode, setAssistantMode] = useState(() => loadJSON("sustainos-ai-mode", ASSISTANT_MODES.chat));
  const [telemetryDraft, setTelemetryDraft] = useState(() => loadJSON("sustainos-telemetry-draft", emptyTelemetryDraft));
  const [profileDraft, setProfileDraft] = useState(() => loadJSON("sustainos-profile-draft", emptyProfileDraft));
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    saveJSON("sustainos-ai-mode", assistantMode);
  }, [assistantMode]);

  useEffect(() => {
    saveJSON("sustainos-telemetry-draft", telemetryDraft);
  }, [telemetryDraft]);

  useEffect(() => {
    saveJSON("sustainos-profile-draft", profileDraft);
  }, [profileDraft]);

  useEffect(() => {
    if (!open) return;
    setQuickTips(
      assistantMode === ASSISTANT_MODES.telemetry
        ? ["शारदा कॉलेज, पानी 4500, ऊर्जा 2300", "लोकेशन ब्लॉक A", "submit"]
        : assistantMode === ASSISTANT_MODES.profile
          ? ["मेरा नाम राहुल है", "मेरा building शारदा कॉलेज", "submit"]
          : seedSuggestions
    );
  }, [open, assistantMode]);

  useEffect(() => {
    const onAssistantMode = (event) => {
      const nextMode = event?.detail?.mode;
      if (nextMode && Object.values(ASSISTANT_MODES).includes(nextMode)) {
        setAssistantMode(nextMode);
      }
      if (event?.detail?.open) {
        setOpen(true);
      }
    };

    window.addEventListener("sustainos:ai-mode", onAssistantMode);
    return () => window.removeEventListener("sustainos:ai-mode", onAssistantMode);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceReady(false);
      return;
    }

    setVoiceReady(true);
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang =
      assistantMode === ASSISTANT_MODES.telemetry || assistantMode === ASSISTANT_MODES.profile ? "hi-IN" : "en-IN";
    recognitionRef.current.interimResults = false;
    recognitionRef.current.continuous = false;

    recognitionRef.current.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (transcript.trim()) {
        setInput(transcript.trim());
        setStatus("Voice input captured");
        sendMessage(transcript.trim());
      }
    };

    recognitionRef.current.onend = () => {
      setListening(false);
    };

    recognitionRef.current.onerror = () => {
      setListening(false);
      setStatus("Voice input unavailable");
    };

    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, [assistantMode]);

  const clearChat = () => {
    setMessages([initialMessage]);
    setStatus("Conversation cleared");
  };

  const speakText = (text) => {
    if (!text || !window?.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.lang = assistantMode === ASSISTANT_MODES.chat ? "en-IN" : "hi-IN";
      utterance.onstart = () => setStatus("Speaking");
      utterance.onend = () => setStatus("Ready");
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
    }
  };

  const stopSpeaking = () => {
    try {
      window?.speechSynthesis?.cancel?.();
    } catch {
      // ignore
    }
    setStatus("Ready");
  };

  const startListening = () => {
    if (!voiceReady || !recognitionRef.current) {
      setStatus("Voice input unsupported");
      return;
    }

    try {
      setListening(true);
      setStatus("Listening");
      recognitionRef.current.start();
    } catch (err) {
      console.error("Voice start failed:", err);
      setListening(false);
      setStatus("Voice input unavailable");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
  };

  const stopVoice = () => {
    stopListening();
    stopSpeaking();
  };

  const resetAssistantDraft = () => {
    setTelemetryDraft(emptyTelemetryDraft);
    setProfileDraft(emptyProfileDraft);
    setStatus("Draft cleared");
  };

  const submitTelemetryDraft = async (draft) => {
    const token = getAuthToken();
    if (!token) {
      return { ok: false, message: "Please login to submit telemetry." };
    }

    const payload = {
      building: normalizeText(draft.building),
      location: normalizeText(draft.location),
      water: Number(draft.water),
      energy: Number(draft.energy),
      latitude: draft.latitude === "" ? null : Number(draft.latitude),
      longitude: draft.longitude === "" ? null : Number(draft.longitude),
      sensorId: normalizeText(draft.sensorId),
      sensorName: normalizeText(draft.sensorName),
      sensorType: normalizeText(draft.sensorType) || "manual",
      protocol: normalizeText(draft.protocol) || "manual",
      batteryLevel: draft.batteryLevel === "" ? null : Number(draft.batteryLevel),
      signalQuality: draft.signalQuality === "" ? null : Number(draft.signalQuality),
    };

    const res = await fetch(apiUrl("/api/data"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json.msg || "Telemetry submit failed" };
    }

    return { ok: true, message: "Telemetry saved to dashboard.", data: json };
  };

  const submitProfileDraft = async (draft) => {
    const token = getAuthToken();
    if (!token) {
      return { ok: false, message: "Please login to update profile." };
    }

    const res = await fetch(apiUrl("/api/user/update"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: normalizeText(draft.name),
        building: normalizeText(draft.building),
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      return { ok: false, message: json.msg || "Profile update failed" };
    }

    return { ok: true, message: "Profile updated successfully.", data: json };
  };

  const buildTelemetryReply = (draft) => {
    const missing = telemetryMissingFields(draft);
    const progress = draftProgress(draft, missing);
    const lines = [];
    lines.push(`Okay, I noted ${progress.filled}/${progress.total} fields.`);
    lines.push(
      `Building: ${draft.building || "pending"}, Water: ${draft.water || "pending"}, Energy: ${draft.energy || "pending"}.`
    );
    if (draft.location) lines.push(`Location: ${draft.location}.`);
    if (draft.sensorId) lines.push(`Sensor: ${draft.sensorId}.`);
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.join(", ")}.`);
      lines.push("Bata do, phir main submit bolne par save kar dunga.");
      return {
        text: lines.join(" "),
        meta: { mode: "telemetry", draft, missing, ready: false },
      };
    }

    lines.push("Sab ready hai. Ab bolo 'submit' ya 'save' to dashboard par bhej dunga.");
    return {
      text: lines.join(" "),
      meta: { mode: "telemetry", draft, missing: [], ready: true },
    };
  };

  const buildProfileReply = (draft) => {
    const missing = profileMissingFields(draft);
    const progress = draftProgress(draft, missing);
    const lines = [];
    lines.push(`Profile draft note kar liya: ${progress.filled}/${progress.total} fields.`);
    lines.push(`Name: ${draft.name || "pending"}, Building: ${draft.building || "pending"}.`);
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.join(", ")}.`);
      lines.push("Jab naam aur building ready ho jaye, 'submit' bolo.");
      return {
        text: lines.join(" "),
        meta: { mode: "profile", draft, missing, ready: false },
      };
    }

    lines.push("Sab ready hai. Ab bolo 'submit' ya 'save' to profile update kar dunga.");
    return {
      text: lines.join(" "),
      meta: { mode: "profile", draft, missing: [], ready: true },
    };
  };

  const handleVoiceAssistantMode = async (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return null;

    if (assistantMode === ASSISTANT_MODES.telemetry) {
      const nextDraft = extractTelemetryDraft(normalized, telemetryDraft);

      if (/^(clear|reset|naya|new|fresh|delete draft)\b/i.test(normalized)) {
        resetAssistantDraft();
        return {
          sender: "ai",
          text: "Telemetry draft cleared. Dubara bol do: building, water, energy.",
          meta: { aiMode: "local" },
        };
      }

      if (isSubmitCommand(normalized)) {
        setTelemetryDraft(nextDraft);
        const missing = telemetryMissingFields(nextDraft);
        if (missing.length > 0) {
          const reply = buildTelemetryReply(nextDraft);
          return {
            sender: "ai",
            text: reply.text,
            meta: { aiMode: "local", draftMode: "telemetry", ...reply.meta },
          };
        }

        const result = await submitTelemetryDraft(nextDraft);
        if (!result.ok) {
          return { sender: "ai", text: result.message, meta: { aiMode: "local" } };
        }

        resetAssistantDraft();
        return {
          sender: "ai",
          text: `${result.message} Dashboard auto-update ho jayega.`,
          meta: { aiMode: "local", submitted: true },
        };
      }

      setTelemetryDraft(nextDraft);
      const reply = buildTelemetryReply(nextDraft);
      return {
        sender: "ai",
        text: reply.text,
        meta: { aiMode: "local", draftMode: "telemetry", ...reply.meta },
      };
    }

    if (assistantMode === ASSISTANT_MODES.profile) {
      const nextDraft = extractProfileDraft(normalized, profileDraft);

      if (/^(clear|reset|naya|new|fresh|delete draft)\b/i.test(normalized)) {
        resetAssistantDraft();
        return {
          sender: "ai",
          text: "Profile draft cleared. Ab naam aur building dubara bolo.",
          meta: { aiMode: "local" },
        };
      }

      if (isSubmitCommand(normalized)) {
        setProfileDraft(nextDraft);
        const missing = profileMissingFields(nextDraft);
        if (missing.length > 0) {
          const reply = buildProfileReply(nextDraft);
          return {
            sender: "ai",
            text: reply.text,
            meta: { aiMode: "local", draftMode: "profile", ...reply.meta },
          };
        }

        const result = await submitProfileDraft(nextDraft);
        if (!result.ok) {
          return { sender: "ai", text: result.message, meta: { aiMode: "local" } };
        }

        resetAssistantDraft();
        return {
          sender: "ai",
          text: `${result.message} Main updated profile ke hisaab se chal raha hoon.`,
          meta: { aiMode: "local", submitted: true },
        };
      }

      setProfileDraft(nextDraft);
      const reply = buildProfileReply(nextDraft);
      return {
        sender: "ai",
        text: reply.text,
        meta: { aiMode: "local", draftMode: "profile", ...reply.meta },
      };
    }

    return null;
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
      if (autoSpeak) speakText(text);
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
      if (assistantMode !== ASSISTANT_MODES.chat) {
        const localReply = await handleVoiceAssistantMode(text);
        if (localReply) {
          setMessages((prev) => [...prev, localReply].slice(-20));
          setStatus(
            localReply.meta?.submitted
              ? "Saved"
              : assistantMode === ASSISTANT_MODES.profile
                ? "Profile draft"
                : "Telemetry draft"
          );
          if (autoSpeak) speakText(localReply.text);
          return;
        }
      }

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
      if (autoSpeak) speakText(responseText);

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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end md:bottom-6 md:right-6">
      {open && (
        <div
          className={`mb-3 flex w-[min(336px,calc(100vw-1rem))] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-[26px] border shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl ${
            darkMode
              ? "border-white/10 bg-slate-950/90 text-white"
              : "border-white/40 bg-white/92 text-slate-900"
          }`}
        >
          <div className="relative shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.18),transparent_26%)]" />
            <div className="relative border-b border-white/10 px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
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
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{status}</p>
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

              <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/5 p-1 dark:bg-white/5">
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.chat)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    assistantMode === ASSISTANT_MODES.chat
                      ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-200"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  <MessageCircle size={12} />
                  Chat
                </button>
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.telemetry)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    assistantMode === ASSISTANT_MODES.telemetry
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  <Mic size={12} />
                  Voice Data
                </button>
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.profile)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    assistantMode === ASSISTANT_MODES.profile
                      ? "bg-violet-500/20 text-violet-700 dark:text-violet-200"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  <Sparkles size={12} />
                  Voice Profile
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  onClick={fetchForecast}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                >
                  <ArrowUpRight size={12} />
                  Forecast
                </button>
                <button
                  onClick={clearChat}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
                <button
                  onClick={listening ? stopListening : startListening}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    listening
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-200"
                      : "border border-white/10 bg-white/5 text-slate-500 dark:text-slate-300"
                  }`}
                >
                  <Mic size={12} />
                  {listening
                    ? "Listening..."
                    : voiceReady
                      ? assistantMode === ASSISTANT_MODES.chat
                        ? "Voice input"
                        : "Hindi voice"
                      : "Voice unavailable"}
                </button>
                <button
                  onClick={() => setAutoSpeak((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {autoSpeak ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  {autoSpeak ? "Speak on" : "Speak off"}
                </button>
                <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-300 sm:col-span-2">
                  <MessageCircle size={12} />
                  Memory on
                </div>
              </div>

              {assistantMode !== ASSISTANT_MODES.chat && (
                <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-xs text-cyan-700 dark:text-cyan-200">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">
                      {assistantMode === ASSISTANT_MODES.telemetry ? "Voice Telemetry Draft" : "Voice Profile Draft"}
                    </span>
                    <button onClick={resetAssistantDraft} className="font-semibold underline decoration-dotted">
                      Clear draft
                    </button>
                  </div>

                  {assistantMode === ASSISTANT_MODES.telemetry ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-cyan-950 dark:text-cyan-50">
                      <span className="rounded-full bg-white/70 px-2.5 py-1 dark:bg-black/20">
                        <span className="opacity-70">Building</span>{" "}
                        <span className="font-semibold">{telemetryDraft.building || "pending"}</span>
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 dark:bg-black/20">
                        <span className="opacity-70">Water</span>{" "}
                        <span className="font-semibold">{telemetryDraft.water || "pending"}</span>
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 dark:bg-black/20">
                        <span className="opacity-70">Energy</span>{" "}
                        <span className="font-semibold">{telemetryDraft.energy || "pending"}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-cyan-950 dark:text-cyan-50">
                      <span className="rounded-full bg-white/70 px-2.5 py-1 dark:bg-black/20">
                        <span className="opacity-70">Name</span>{" "}
                        <span className="font-semibold">{profileDraft.name || "pending"}</span>
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 dark:bg-black/20">
                        <span className="opacity-70">Building</span>{" "}
                        <span className="font-semibold">{profileDraft.building || "pending"}</span>
                      </span>
                    </div>
                  )}

                  <p className="mt-2 text-[11px] leading-5 opacity-80">
                    {assistantMode === ASSISTANT_MODES.telemetry
                      ? "Hindi ya Hinglish me bolo: building, water, energy. Sab ready ho to 'submit' bolo."
                      : "Hindi ya Hinglish me bolo: apna naam aur building. Ready ho to 'submit' bolo."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3.5 py-3.5">
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
                    className={`min-w-0 max-w-[min(84%,30rem)] overflow-hidden rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                      isUser
                        ? "rounded-br-md bg-gradient-to-br from-primary to-yellow-300 text-slate-950"
                        : darkMode
                          ? "rounded-bl-md border border-white/10 bg-white/5 text-slate-100"
                          : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</div>

                    {msg.sender === "ai" && msg.meta?.comparison?.text && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/10 p-2 text-xs break-words [overflow-wrap:anywhere]">
                        {msg.meta.comparison.text}
                      </div>
                    )}

                    {msg.sender === "ai" && Array.isArray(msg.meta?.actionPlan) && msg.meta.actionPlan.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs min-w-0">
                        <div className="font-semibold">Top actions</div>
                        {msg.meta.actionPlan.slice(0, 2).map((item, i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 break-words [overflow-wrap:anywhere]">
                            {item.title}: {item.reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.report && (
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
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
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/10 px-2 py-2 text-xs break-words [overflow-wrap:anywhere]">
                        <span className="font-semibold">Diagnosis:</span> {msg.meta.diagnosis.cause}
                      </div>
                    )}

                    {msg.sender === "ai" && msg.meta?.current && (
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
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

                    {msg.sender === "ai" &&
                      (msg.meta?.confidence != null || msg.meta?.understanding || msg.meta?.ai) && (
                        <details className="mt-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/10 p-2 text-[11px] leading-5 text-cyan-700 dark:text-cyan-200">
                          <summary className="cursor-pointer list-none font-semibold uppercase tracking-[0.18em]">
                            More details
                          </summary>
                          <div className="mt-2 space-y-1">
                            {typeof msg.meta?.confidence === "number" && (
                              <div>Confidence: {msg.meta.confidence}%</div>
                            )}
                            {msg.meta?.understanding && (
                              <>
                                <div>Intent: {msg.meta.understanding.intent || "general_help"}</div>
                                <div>Tone: {msg.meta.understanding.tone || "friendly"}</div>
                                {msg.meta.understanding.entities?.building ? (
                                  <div>Building: {msg.meta.understanding.entities.building}</div>
                                ) : null}
                                {msg.meta.understanding.entities?.location ? (
                                  <div>Location: {msg.meta.understanding.entities.location}</div>
                                ) : null}
                                {msg.meta.understanding.entities?.sensorId ? (
                                  <div>Sensor: {msg.meta.understanding.entities.sensorId}</div>
                                ) : null}
                                {msg.meta.understanding.rewrittenQuestion ? (
                                  <div className="break-words [overflow-wrap:anywhere]">
                                    Rewrite: {msg.meta.understanding.rewrittenQuestion}
                                  </div>
                                ) : null}
                              </>
                            )}
                            {msg.meta?.ai?.provider ? (
                              <div>
                                AI: {msg.meta.ai.provider} {msg.meta.ai.model ? `(${msg.meta.ai.model})` : ""}
                              </div>
                            ) : null}
                            {msg.meta?.aiMode ? <div>Mode: {msg.meta.aiMode}</div> : null}
                          </div>
                        </details>
                      )}

                    {msg.sender === "ai" && msg.meta?.followUp && (
                      <button
                        onClick={() => sendMessage(msg.meta.followUp)}
                        className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-600 transition hover:bg-cyan-500/15 dark:text-cyan-300"
                      >
                        <Sparkles size={10} />
                        <span className="min-w-0 break-words text-left [overflow-wrap:anywhere]">{msg.meta.followUp}</span>
                      </button>
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
            <div className="shrink-0 grid grid-cols-1 gap-2 px-3.5 pb-3 sm:grid-cols-2">
              {quickTips.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <span className="block truncate">{q}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                placeholder={
                  assistantMode === ASSISTANT_MODES.chat
                    ? "Ask about energy, water, carbon, alerts..."
                    : assistantMode === ASSISTANT_MODES.telemetry
                      ? "Hindi/Hinglish me bolo: building, water, energy..."
                      : "Hindi/Hinglish me bolo: name, building..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className={`max-h-28 min-w-0 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${
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
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">Tip: voice input works best in Hindi/Hinglish modes.</span>
              <button onClick={stopVoice} className="hover:text-slate-900 dark:hover:text-white">
                Stop voice
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
    </div>,
    document.body
  );
};

export default AIChatWidget;
