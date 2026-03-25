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
import { lockBodyScroll, unlockBodyScroll } from "../../utils/scrollLock";

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

const compactText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanCapturedText = (value = "", stopWords = []) => {
  const text = normalizeText(value);
  if (!text) return "";

  const escapedStopWords = stopWords.map(escapeRegex).filter(Boolean);
  if (escapedStopWords.length > 0) {
    const stopPattern = new RegExp(`\\b(?:${escapedStopWords.join("|")})\\b.*$`, "i");
    const trimmed = text.replace(stopPattern, "").trim();
    if (trimmed) {
      return trimmed.replace(/[.,;:!?]+$/g, "").trim();
    }
  }

  return text.replace(/[.,;:!?।॥]+$/g, "").trim();
};

const NAME_STOP_WORDS = [
  "hai",
  "hain",
  "hoon",
  "hun",
  "hu",
  "है",
  "हैं",
  "हूँ",
  "हुं",
  "जी",
  "ji",
  "please",
  "plz",
  "bro",
  "buddy",
  "sir",
  "madam",
  "aur",
  "and",
  "or",
  "kaho",
  "bolo",
  "batao",
  "bulao",
  "call",
  "me",
  "my",
  "name",
  "nameis",
  "submit",
  "save",
  "done",
  "okay",
  "ok",
];

const BUILDING_HINT_WORDS = [
  "building",
  "site",
  "campus",
  "college",
  "office",
  "branch",
  "block",
  "place",
  "location",
  "venue",
  "bhavan",
  "bhawan",
  "flat",
  "tower",
  "wing",
  "floor",
  "centre",
  "center",
  "school",
  "institute",
  "university",
  "academy",
  "hostel",
  "lab",
  "department",
  "facility",
  "plant",
  "campus",
  "बिल्डिंग",
  "भवन",
  "कॉलेज",
  "कॉलेज",
  "ऑफिस",
  "कार्यालय",
  "ब्लॉक",
  "स्कूल",
  "संस्थान",
  "विश्वविद्यालय",
  "शाखा",
  "कैंपस",
  "स्थान",
  "लोकेशन",
];

const COMMON_NOISE_WORDS = new Set([
  "hi",
  "hello",
  "hey",
  "ok",
  "okay",
  "yes",
  "no",
  "mera",
  "meri",
  "mere",
  "मेरा",
  "मेरी",
  "मेरे",
  "thanks",
  "thank",
  "bye",
  "good",
  "morning",
  "evening",
  "night",
  "submit",
  "save",
  "done",
  "profile",
  "voice",
  "draft",
]);

const PROFILE_NAME_CUES = [
  /my name is/i,
  /call me/i,
  /i am/i,
  /i'm/i,
  /\bim\b/i,
  /mera naam/i,
  /mera name/i,
  /\bnaam\b/i,
  /\bname\b/i,
  /मेरा नाम/i,
  /\bनाम\b/i,
  /\bमैं\b/i,
  /\bmain\b/i,
  /\bमुझे\b/i,
];

const PROFILE_BUILDING_CUES = [
  /my building is/i,
  /mera building/i,
  /meri building/i,
  /building is/i,
  /\bbuilding\b/i,
  /\bcampus\b/i,
  /\bcollege\b/i,
  /\bकॉलेज\b/i,
  /\boffice\b/i,
  /\bऑफिस\b/i,
  /\bकार्यालय\b/i,
  /\bbranch\b/i,
  /\bblock\b/i,
  /\bब्लॉक\b/i,
  /\bsite\b/i,
  /\blocation\b/i,
  /\bvenue\b/i,
  /\bschool\b/i,
  /\bस्कूल\b/i,
  /\binstitute\b/i,
  /\bसंस्थान\b/i,
  /\buniversity\b/i,
  /\bविश्वविद्यालय\b/i,
  /बिल्डिंग/i,
  /भवन/i,
  /कॉलेज/i,
  /कैंपस/i,
  /लोकेशन/i,
  /स्थान/i,
];

const containsAnyHint = (text = "", hints = []) => {
  const source = compactText(text).toLowerCase();
  if (!source) return false;
  return hints.some((hint) => source.includes(String(hint).toLowerCase()));
};

const findEarliestCue = (text = "", cues = []) => {
  const source = String(text);
  let best = null;

  for (const cue of cues) {
    const match = source.match(cue);
    if (!match || match.index == null) continue;
    if (!best || match.index < best.index) {
      best = {
        index: match.index,
        length: match[0].length,
      };
    }
  }

  return best;
};

const extractSegmentAfterCue = (text = "", cue = null, stopCues = []) => {
  const source = compactText(text);
  if (!source || !cue) return "";

  const cueMatch = source.match(cue);
  if (!cueMatch || cueMatch.index == null) return "";

  const tail = source.slice(cueMatch.index + cueMatch[0].length).trim();
  if (!tail) return "";

  const stopper = findEarliestCue(tail, stopCues);
  const raw = stopper ? tail.slice(0, stopper.index) : tail;
  return normalizeText(raw);
};

const isLikelyDirectBuildingName = (text = "") => {
  const candidate = normalizeText(text);
  if (!candidate) return false;
  const lower = candidate.toLowerCase();
  if (COMMON_NOISE_WORDS.has(lower)) return false;
  if (containsAnyHint(candidate, BUILDING_HINT_WORDS)) return true;
  if (/\d/.test(candidate) && candidate.split(" ").filter(Boolean).length <= 6) return true;
  const words = candidate.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const latinTitleCase = words.every((word) => /^[A-Z][A-Za-z0-9.'-]*$/.test(word));
  return latinTitleCase;
};

const sanitizeProfileNameValue = (value = "") => {
  const cleaned = cleanCapturedText(
    normalizeText(value)
      .replace(/^(?:my name is|call me|i am|i'm|im|mera naam|mera name|naam|name|मेरा नाम|नाम|मैं|main|mujhe)\s*(?:is|hai|hoon|hun|hu|है|हूँ|हूं|हैं|जी|ji|:|=)?\s*/i, ""),
    NAME_STOP_WORDS
  )
    .replace(/^(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\s+/i, "")
    .replace(/\b(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\b$/i, "")
    .trim();
  if (!cleaned || COMMON_NOISE_WORDS.has(cleaned.toLowerCase())) return "";
  return cleaned;
};

const sanitizeProfileBuildingValue = (value = "") => {
  const cleaned = cleanCapturedText(
    normalizeText(value)
      .replace(/^(?:my building is|mera building|meri building|building is|building|site|campus|college|office|branch|block|place|location|venue|school|institute|university|बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\s*(?:is|hai|ho|है|हैं|=|:|का|की|में|me|par|pe)?\s*/i, ""),
    NAME_STOP_WORDS
  )
    .replace(/^(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\s+/i, "")
    .replace(/\b(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\b$/i, "")
    .trim();
  if (!cleaned || COMMON_NOISE_WORDS.has(cleaned.toLowerCase())) return "";
  return isLikelyDirectBuildingName(cleaned) || containsAnyHint(cleaned, BUILDING_HINT_WORDS) ? cleaned : "";
};

const sanitizeProfileDraft = (draft = emptyProfileDraft) => ({
  name: sanitizeProfileNameValue(draft.name),
  building: sanitizeProfileBuildingValue(draft.building),
});

const extractProfileName = (text = "") => {
  const source = compactText(text);
  if (!source) return "";

  const nameCue = findEarliestCue(source, PROFILE_NAME_CUES);
  if (!nameCue) return "";

  const nameCuePattern = PROFILE_NAME_CUES.find((cue) => source.match(cue)?.index === nameCue.index) || null;
  const stopCues = [...PROFILE_BUILDING_CUES, /submit/i, /save/i, /done/i];
  let candidate = extractSegmentAfterCue(source, nameCuePattern, stopCues);
  if (!candidate) {
    candidate = normalizeText(source.replace(nameCuePattern, ""));
  }

  return sanitizeProfileNameValue(candidate);
};

const extractProfileBuilding = (text = "") => {
  const source = compactText(text);
  if (!source) return "";

  const buildingCue = findEarliestCue(source, PROFILE_BUILDING_CUES);
  if (buildingCue) {
    const buildingCuePattern = PROFILE_BUILDING_CUES.find((cue) => source.match(cue)?.index === buildingCue.index) || null;
    const stopCues = [...PROFILE_NAME_CUES, /submit/i, /save/i, /done/i];
    let candidate = extractSegmentAfterCue(source, buildingCuePattern, stopCues);
    if (!candidate) {
      candidate = normalizeText(source.replace(buildingCuePattern, ""));
    }

    candidate = cleanCapturedText(candidate, NAME_STOP_WORDS);
    candidate = candidate.replace(/^(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\s+/i, "");
    candidate = candidate.replace(/\b(?:is|hai|ho|hoon|hun|hu|है|हैं|हूँ|हुं)\b$/i, "");
    if (candidate && !COMMON_NOISE_WORDS.has(candidate.toLowerCase())) return candidate;
  }

  if (containsAnyHint(source, BUILDING_HINT_WORDS) || isLikelyDirectBuildingName(source)) {
    const stripped = cleanCapturedText(
      source
        .replace(/^(?:my|mera|mere|meri|our|this|the|yeh|ye|yeh mera|ye mera)\s+/i, "")
        .replace(
          /^(?:building|site|campus|college|office|branch|block|place|location|venue|bhavan|bhawan|flat|tower|wing|floor|centre|center|school|institute|university|academy|hostel|lab|department|facility|plant|बिल्डिंग|भवन|कैंपस|स्थान|लोकेशन)\s*(?:is|hai|ho|=|:|का|की|में|me|par|pe)?\s*/i,
          ""
        ),
      NAME_STOP_WORDS
    );
    const sanitized = sanitizeProfileBuildingValue(stripped);
    if (sanitized) return sanitized;
  }

  return "";
};

const isSubmitCommand = (text = "") =>
  /^(submit|save|send|done|finish|ok|okay|haan|ha|ji|theek|thik|bas|bhej do|bhejdo|भेज दो|भेजो|save kar do|submit kar do|ho gaya|ho gya|हो गया|ठीक है)\b/i.test(
    String(text).trim().toLowerCase()
  );

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
  const name = extractProfileName(text);
  if (name) {
    next.name = name;
  }

  const building = extractProfileBuilding(text);
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

const toQuickTip = (value, index = 0) => {
  if (typeof value === "string") {
    return {
      label: value,
      prompt: value,
      description: "",
    };
  }

  const prompt = compactText(value?.prompt || value?.message || value?.text || value?.title || "");
  const label = compactText(value?.title || prompt || `Tip ${index + 1}`);

  return {
    label,
    prompt,
    description: value?.title && value?.message ? compactText(value.message) : "",
  };
};

const getQuickTipsForMode = (mode) =>
  (
    mode === ASSISTANT_MODES.telemetry
      ? ["शारदा कॉलेज, पानी 4500, ऊर्जा 2300", "लोकेशन ब्लॉक A", "submit"]
      : mode === ASSISTANT_MODES.profile
        ? ["मेरा नाम राहुल है", "मेरा building शारदा कॉलेज", "submit"]
        : seedSuggestions
  ).map((item, index) => toQuickTip(item, index));

const AIChatWidget = () => {
  const { darkMode } = useContext(ThemeContext);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantMode, setAssistantMode] = useState(() => loadJSON("sustainos-ai-mode", ASSISTANT_MODES.chat));
  const [quickTips, setQuickTips] = useState(() =>
    getQuickTipsForMode(loadJSON("sustainos-ai-mode", ASSISTANT_MODES.chat))
  );
  const [status, setStatus] = useState("Ready");
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [telemetryDraft, setTelemetryDraft] = useState(() => loadJSON("sustainos-telemetry-draft", emptyTelemetryDraft));
  const [profileDraft, setProfileDraft] = useState(() => sanitizeProfileDraft(loadJSON("sustainos-profile-draft", emptyProfileDraft)));
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const sendMessageRef = useRef(null);
  const inputRef = useRef(null);

  const lastAiMessage = useMemo(
    () => [...messages].reverse().find((msg) => msg.sender === "ai") || initialMessage,
    [messages]
  );

  const aiMode = lastAiMessage?.meta?.aiMode || "local";
  const aiProviderLabel = useMemo(() => {
    const provider = String(lastAiMessage?.meta?.ai?.provider || "").toLowerCase();
    if (provider === "ollama") return "Ollama";
    if (provider === "openai") return "OpenAI";
    if (provider === "gemini") return "Gemini";
    if (aiMode === "python-ml") return "Python ML";
    if (aiMode === "enhanced") return "Enhanced";
    return "Local";
  }, [aiMode, lastAiMessage]);

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
    if (!open) setShowTools(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      lockBodyScroll("ai-chat");
      return;
    }

    unlockBodyScroll("ai-chat");
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new CustomEvent("sustainos:ai-chat-state", { detail: { open } }));
  }, [open]);

  useEffect(() => {
    setProfileDraft((current) => {
      const cleaned = sanitizeProfileDraft(current);
      if (cleaned.name === current.name && cleaned.building === current.building) return current;
      return cleaned;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuickTips(getQuickTipsForMode(assistantMode));
  }, [open, assistantMode]);

  useEffect(() => {
    const inputNode = inputRef.current;
    if (!inputNode) return;

    inputNode.style.height = "0px";
    const nextHeight = Math.min(Math.max(inputNode.scrollHeight, 52), 144);
    inputNode.style.height = `${nextHeight}px`;
  }, [input, open, assistantMode]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
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
        sendMessageRef.current?.(transcript.trim());
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
    setQuickTips(getQuickTipsForMode(assistantMode));
    setStatus("Conversation cleared");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const parseProfileDraftRemote = async (text, draft) => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(apiUrl("/api/ai/profile-parse"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, draft }),
      });

      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      if (!json?.draft) return null;
      return json;
    } catch (err) {
      console.error("Profile parse request failed:", err);
      return null;
    }
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

  const buildProfileReply = (draft, parseResult = null) => {
    const missing = profileMissingFields(draft);
    const progress = draftProgress(draft, missing);
    const needs = new Set(parseResult?.needs || []);
    const lines = [];
    lines.push(`Profile draft note kar liya: ${progress.filled}/${progress.total} fields.`);
    lines.push(`Name: ${draft.name || "pending"}, Building: ${draft.building || "pending"}.`);
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.join(", ")}.`);
      if (missing.includes("name") && missing.includes("building")) {
        lines.push("Naam aur building ka exact bol. Example: 'Mera naam Rahul hai' aur 'Sharda College'.");
      } else if (missing.includes("name")) {
        lines.push("Naam bolo. Example: 'Mera naam Rahul hai'.");
      } else if (missing.includes("building")) {
        lines.push(
          needs.has("building")
            ? "Building ka exact naam clear nahi hua. Example: 'Sharda College' ya 'Block A' bolo."
            : "Building bolo. Example: 'Sharda College' ya 'Block A'."
        );
      } else {
        lines.push("Jab naam aur building ready ho jaye, 'submit' bolo.");
      }
      return {
        text: lines.join(" "),
        meta: { mode: "profile", draft, missing, needs: [...needs], ready: false },
      };
    }

    lines.push("Sab ready hai. Ab bolo 'submit' ya 'save' to profile update kar dunga.");
    return {
      text: lines.join(" "),
      meta: { mode: "profile", draft, missing: [], needs: [...needs], ready: true },
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const parsedProfile = await parseProfileDraftRemote(normalized, profileDraft);
      const nextDraft = sanitizeProfileDraft(
        parsedProfile?.draft
          ? { ...profileDraft, ...parsedProfile.draft }
          : { ...profileDraft, ...extractProfileDraft(normalized, profileDraft) }
      );

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
          const reply = buildProfileReply(nextDraft, parsedProfile);
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
      const reply = buildProfileReply(nextDraft, parsedProfile);
      return {
        sender: "ai",
        text: reply.text,
        meta: {
          aiMode: parsedProfile ? "python-ml" : "local",
          draftMode: "profile",
          profileParse: parsedProfile || undefined,
          ...reply.meta,
        },
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

  const sendMessage = React.useCallback(async (customText) => {
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const failureText =
          res.status === 401
            ? "Unauthorized - please login to use AI features."
            : data?.msg || data?.message || "Sorry, the AI request could not be completed right now.";

        setMessages((prev) =>
          [
            ...prev,
            {
              sender: "ai",
              text: failureText,
              meta: {
                aiMode: "local",
                ai: {
                  provider: "local",
                  model: null,
                  error: failureText,
                },
              },
            },
          ].slice(-20)
        );
        setStatus(res.status === 401 ? "Login required" : res.status === 503 ? "Data offline" : "Request failed");
        return;
      }

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
      if (data?.ai?.provider === "ollama") setStatus("Ollama AI");
      else if (data?.ai?.provider === "openai") setStatus("OpenAI AI");
      else if (data?.ai?.provider === "gemini") setStatus("Gemini AI");
      else if (data?.aiMode === "python-ml") setStatus("Python ML");
      else if (data?.aiMode === "enhanced") setStatus("Enhanced AI");
      else setStatus(data?.liveDataReady === false ? "Limited data" : "Local AI");
      if (autoSpeak) speakText(responseText);

      if (Array.isArray(data?.suggestions)) {
        setQuickTips(data.suggestions.slice(0, 4).map((item, index) => toQuickTip(item, index)));
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
  }, [input, loading, assistantMode, handleVoiceAssistantMode, autoSpeak, speakText]);

  // The ref keeps voice-recognition callbacks pointing at the latest sender.
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {open && (
        <button
          type="button"
          aria-label="Close AI overlay"
          onClick={() => setOpen(false)}
          className="absolute inset-0 pointer-events-auto bg-slate-950/18 backdrop-blur-[1px] dark:bg-slate-950/28"
        />
      )}

      {open && (
        <div className="absolute inset-0 flex items-end justify-center p-0 sm:p-4 md:justify-end">
          <div
            className={`pointer-events-auto flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl sm:h-[min(88dvh,46rem)] sm:max-w-[34rem] sm:rounded-[28px] md:mr-4 md:h-[min(82dvh,46rem)] md:w-[min(24rem,calc(100vw-2rem))] md:max-w-none md:rounded-[26px] md:shadow-[0_24px_80px_rgba(15,23,42,0.28)] ${
            darkMode
              ? "border-white/10 bg-slate-950/82 text-white"
              : "border-white/30 bg-white/84 text-slate-900"
          }`}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="relative shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.18),transparent_26%)]" />
            <div className="relative border-b border-white/10 px-3.5 py-3.5 sm:px-4">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-400/30 sm:hidden" />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">AI Sustainability Copilot</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          aiMode === "enhanced"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-slate-500/15 text-slate-500"
                        }`}
                        >
                        {aiMode === "enhanced" ? "Enhanced" : aiMode === "python-ml" ? "ML" : "Local"}
                      </span>
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                        {aiProviderLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTools((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-white/10 hover:text-slate-900 md:hidden dark:text-slate-300 dark:hover:text-white"
                  >
                    {showTools ? "Hide tools" : "Tools"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/10 p-2 text-slate-500 transition hover:bg-white/10 hover:text-red-500"
                    aria-label="Close AI chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.chat)}
                  className={`inline-flex min-w-[6.75rem] flex-none items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition sm:min-w-0 sm:flex-1 sm:text-xs ${
                    assistantMode === ASSISTANT_MODES.chat
                      ? "bg-cyan-500/20 text-cyan-700 shadow-sm dark:text-cyan-200"
                      : "border border-white/10 bg-black/5 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  <MessageCircle size={12} />
                  Chat
                </button>
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.telemetry)}
                  className={`inline-flex min-w-[8rem] flex-none items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition sm:min-w-0 sm:flex-1 sm:text-xs ${
                    assistantMode === ASSISTANT_MODES.telemetry
                      ? "bg-emerald-500/20 text-emerald-700 shadow-sm dark:text-emerald-200"
                      : "border border-white/10 bg-black/5 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  <Mic size={12} />
                  Voice Data
                </button>
                <button
                  onClick={() => setAssistantMode(ASSISTANT_MODES.profile)}
                  className={`inline-flex min-w-[8.5rem] flex-none items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition sm:min-w-0 sm:flex-1 sm:text-xs ${
                    assistantMode === ASSISTANT_MODES.profile
                      ? "bg-violet-500/20 text-violet-700 shadow-sm dark:text-violet-200"
                      : "border border-white/10 bg-black/5 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  <Sparkles size={12} />
                  Voice Profile
                </button>
              </div>

              <div className={`${showTools ? "block" : "hidden"} md:block`}>
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
                </div>

                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-600 dark:text-cyan-300">
                  <MessageCircle size={12} />
                  Memory on
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

                {messages.length === 1 && !loading && quickTips.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quickTips.map((tip, i) => (
                      <button
                        key={i}
                        onClick={() => tip.prompt && sendMessage(tip.prompt)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      >
                        <span className="block truncate text-[11px] font-semibold sm:text-xs">{tip.label}</span>
                        {tip.description ? (
                          <span className="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                            {tip.description}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3 py-3.5 sm:px-3.5">
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
                    className={`min-w-0 max-w-[min(92%,30rem)] overflow-hidden rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
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

          <div
            className="shrink-0 border-t border-white/10 p-3 sm:px-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                ref={inputRef}
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
                className={`min-h-[3.25rem] min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                  darkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
                }`}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-yellow-300 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-50 sm:w-12"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="min-w-0 flex-1 leading-4">
                Tip: voice input works best in Hindi/Hinglish modes, and chat mode now stays usable even with limited live data.
              </span>
              <button onClick={stopVoice} className="hover:text-slate-900 dark:hover:text-white">
                Stop voice
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute bottom-3 right-3 group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-emerald-400 to-yellow-300 text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.35)] transition hover:scale-105 md:bottom-6 md:right-6 md:h-[3.75rem] md:w-[3.75rem]"
          aria-label="Open AI chat"
        >
          <MessageCircle size={26} className="transition group-hover:scale-110" />
        </button>
      )}
    </div>,
    document.body
  );
};

export default AIChatWidget;
