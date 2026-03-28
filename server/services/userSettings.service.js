const Settings = require("../models/UserSettings");

const DEFAULT_USER_SETTINGS = Object.freeze({
  name: "",
  email: "",
  darkMode: false,
  aiSuggestions: true,
  predictiveInsights: true,
  energyLimit: 500,
  waterLimit: 200,
  energyAlerts: true,
  waterAlerts: true,
  weeklyReports: false,
  sustainabilityGoal: 20,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanText = (value, maxLength = 120) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizeUserSettings = (source = {}) => ({
  name: cleanText(source.name, 80),
  email: cleanText(source.email, 120),
  darkMode: toBoolean(source.darkMode, DEFAULT_USER_SETTINGS.darkMode),
  aiSuggestions: toBoolean(source.aiSuggestions, DEFAULT_USER_SETTINGS.aiSuggestions),
  predictiveInsights: toBoolean(source.predictiveInsights, DEFAULT_USER_SETTINGS.predictiveInsights),
  energyLimit: clamp(
    Math.round(toNumber(source.energyLimit, DEFAULT_USER_SETTINGS.energyLimit)),
    100,
    5000
  ),
  waterLimit: clamp(
    Math.round(toNumber(source.waterLimit, DEFAULT_USER_SETTINGS.waterLimit)),
    50,
    5000
  ),
  energyAlerts: toBoolean(source.energyAlerts, DEFAULT_USER_SETTINGS.energyAlerts),
  waterAlerts: toBoolean(source.waterAlerts, DEFAULT_USER_SETTINGS.waterAlerts),
  weeklyReports: toBoolean(source.weeklyReports, DEFAULT_USER_SETTINGS.weeklyReports),
  sustainabilityGoal: clamp(
    Math.round(toNumber(source.sustainabilityGoal, DEFAULT_USER_SETTINGS.sustainabilityGoal)),
    0,
    100
  ),
});

const sanitizeSettingsPayload = (payload = {}, fallback = DEFAULT_USER_SETTINGS) => {
  const normalizedFallback = normalizeUserSettings(fallback);
  const allowed = {};

  if ("name" in payload) allowed.name = payload.name;
  if ("email" in payload) allowed.email = payload.email;
  if ("darkMode" in payload) allowed.darkMode = payload.darkMode;
  if ("aiSuggestions" in payload) allowed.aiSuggestions = payload.aiSuggestions;
  if ("predictiveInsights" in payload) allowed.predictiveInsights = payload.predictiveInsights;
  if ("energyLimit" in payload) allowed.energyLimit = payload.energyLimit;
  if ("waterLimit" in payload) allowed.waterLimit = payload.waterLimit;
  if ("energyAlerts" in payload) allowed.energyAlerts = payload.energyAlerts;
  if ("waterAlerts" in payload) allowed.waterAlerts = payload.waterAlerts;
  if ("weeklyReports" in payload) allowed.weeklyReports = payload.weeklyReports;
  if ("sustainabilityGoal" in payload) allowed.sustainabilityGoal = payload.sustainabilityGoal;

  return normalizeUserSettings({ ...normalizedFallback, ...allowed });
};

const getUserSettings = async (userId) => {
  if (!userId || global.dbReady === false) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  try {
    const settings = await Settings.findOne({ user: userId }).lean();
    return settings ? normalizeUserSettings(settings) : { ...DEFAULT_USER_SETTINGS };
  } catch (err) {
    console.error("User Settings Load Error:", err.message || err);
    return { ...DEFAULT_USER_SETTINGS };
  }
};

module.exports = {
  DEFAULT_USER_SETTINGS,
  normalizeUserSettings,
  sanitizeSettingsPayload,
  getUserSettings,
};
