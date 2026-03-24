require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  AI_PROVIDER: (process.env.AI_PROVIDER || "auto").toLowerCase(),
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434/api/chat",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.2:3b",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  OPENAI_CHAT_URL:
    process.env.OPENAI_CHAT_URL || "https://api.openai.com/v1/chat/completions",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  GEMINI_URL:
    process.env.GEMINI_URL ||
    "https://generativelanguage.googleapis.com/v1beta/models",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
};
