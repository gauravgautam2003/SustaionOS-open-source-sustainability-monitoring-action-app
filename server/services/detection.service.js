const mlBridge = require("./mlBridge.service");

const fallbackDetect = (water, energy, history = []) => {
  try {
    const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const w = safeNum(water);
    const e = safeNum(energy);

    const thresholdFromHistory = () => {
      if (!Array.isArray(history) || history.length === 0) return null;
      const recent = history.slice(0, 10);
      const avg = (arr) => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
      const waterVals = recent.map((r) => safeNum(r.water));
      const energyVals = recent.map((r) => safeNum(r.energy));
      return {
        waterAvg: avg(waterVals),
        energyAvg: avg(energyVals),
      };
    };

    if (Array.isArray(history) && history.length >= 3) {
      const waterVals = history.map((r) => safeNum(r.water));
      const energyVals = history.map((r) => safeNum(r.energy));

      const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
      const std = (arr, m) => {
        const v = arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / arr.length;
        return Math.sqrt(v);
      };

      const wMean = mean(waterVals);
      const eMean = mean(energyVals);
      const wStd = std(waterVals, wMean) || 1;
      const eStd = std(energyVals, eMean) || 1;

      const wZ = (w - wMean) / wStd;
      const eZ = (e - eMean) / eStd;

      if (Math.abs(wZ) > Math.abs(eZ) && Math.abs(wZ) >= 2) {
        return { status: true, reason: "Water Spike", severity: Math.abs(wZ) >= 3 ? "high" : "medium", score: Math.round(wZ * 100) / 100 };
      }

      if (Math.abs(eZ) > Math.abs(wZ) && Math.abs(eZ) >= 2) {
        return { status: true, reason: "Energy Spike", severity: Math.abs(eZ) >= 3 ? "high" : "medium", score: Math.round(eZ * 100) / 100 };
      }
    }

    const fallback = thresholdFromHistory();
    if (fallback) {
      const waterTrigger = fallback.waterAvg > 0 && w >= fallback.waterAvg * 1.2;
      const energyTrigger = fallback.energyAvg > 0 && e >= fallback.energyAvg * 1.2;

      if (waterTrigger && w > e) {
        return { status: true, reason: "Water Spike", severity: w >= fallback.waterAvg * 1.5 ? "high" : "medium", score: null };
      }

      if (energyTrigger && e >= w) {
        return { status: true, reason: "Energy Spike", severity: e >= fallback.energyAvg * 1.5 ? "high" : "medium", score: null };
      }
    }

    if (w > 180) return { status: true, reason: "Water Spike", severity: "high", score: null };
    if (e > 140) return { status: true, reason: "Energy Spike", severity: "medium", score: null };

    return { status: false, score: 0 };
  } catch (err) {
    console.error("Detection Service Error:", err);
    return { status: false };
  }
};

exports.detect = async (water, energy, history = []) => {
  const simplifiedHistory = Array.isArray(history)
    ? history.map((r) => ({
        timestamp: r.timestamp || r.createdAt || null,
        water: Number(r.water) || 0,
        energy: Number(r.energy) || 0,
      }))
    : [];

  try {
    const remote = await mlBridge.postJson("/anomaly", {
      water: Number(water) || 0,
      energy: Number(energy) || 0,
      history: simplifiedHistory,
    });

    if (remote && typeof remote === "object") {
      return {
        status: Boolean(remote.anomaly || remote.status),
        reason: remote.reason || remote.summary || "No anomaly detected",
        severity: remote.priority || remote.severity || "low",
        score: remote.score ?? null,
      };
    }
  } catch (err) {
    console.error("Python ML anomaly unavailable, using local fallback:", err.message || err);
  }

  return fallbackDetect(water, energy, history);
};
