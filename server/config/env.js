require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const normalizeServiceUrl = (value, fallback = "") => {
  const raw = String(value || fallback || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `http://${raw}`;
};

const normalizeOllamaUrl = (value, fallback = "http://localhost:11434/api/chat") => {
  const base = normalizeServiceUrl(value, fallback).replace(/\/$/, "");
  if (!base) return "";
  if (/\/api\/chat$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/chat`;
  if (/\/api\/[^/]+$/i.test(base)) return base;
  return `${base}/api/chat`;
};

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  AI_PROVIDER: (process.env.AI_PROVIDER || "auto").toLowerCase(),
  OLLAMA_URL: normalizeOllamaUrl(process.env.OLLAMA_URL),
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.2:1b",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  OPENAI_CHAT_URL:
    process.env.OPENAI_CHAT_URL || "https://api.openai.com/v1/chat/completions",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  GEMINI_URL:
    process.env.GEMINI_URL ||
    "https://generativelanguage.googleapis.com/v1beta/models",
  ML_SERVICE_URL: normalizeServiceUrl(process.env.ML_SERVICE_URL, "http://localhost:8000"),
};
