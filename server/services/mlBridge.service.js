const { ML_SERVICE_URL } = require("../config/env");

const baseUrl = (ML_SERVICE_URL || "").replace(/\/$/, "");

const postJson = async (path, body) => {
  if (typeof fetch !== "function" || !baseUrl) return null;

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`ML service failed with status ${response.status}`);
  }

  return response.json();
};

const getHealth = async () => {
  if (typeof fetch !== "function" || !baseUrl) return null;

  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const getInsights = async (records = []) => {
  return postJson("/insights", { records });
};

const trainModel = async (records = []) => {
  return postJson("/train", { records });
};

const getModelStatus = async () => {
  if (typeof fetch !== "function" || !baseUrl) return null;

  try {
    const response = await fetch(`${baseUrl}/model`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const parseProfileVoice = async (text, draft = {}) => {
  return postJson("/profile-parse", { text, draft });
};

module.exports = {
  postJson,
  getHealth,
  getInsights,
  trainModel,
  getModelStatus,
  parseProfileVoice,
};
