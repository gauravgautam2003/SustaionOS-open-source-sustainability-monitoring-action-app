const Data = require("../models/Data");
const Alert = require("../models/Alert");
const scoreService = require("./sustainabilityScore.engine");
const mlBridge = require("./mlBridge.service");

const ENERGY_RATE = 8;
const WATER_RATE = 0.02;
const CARBON_FACTOR = 0.82;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getWindowDays = (period) => {
  if (!period) return 7;
  if (period === "week") return 7;
  if (period === "month") return 30;
  if (period === "year") return 365;

  const parsed = Number.parseInt(period, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed <= 12 ? parsed * 30 : parsed;
  }

  return 7;
};

const getWindowStart = (daysAgo) => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  return start;
};

const aggregateMetrics = (records = []) => {
  const totals = records.reduce(
    (acc, item) => {
      acc.energy += toNumber(item.energy);
      acc.water += toNumber(item.water);
      return acc;
    },
    { energy: 0, water: 0 }
  );

  const latest = records[0] || null;
  const count = records.length;
  const avgEnergy = count ? totals.energy / count : 0;
  const avgWater = count ? totals.water / count : 0;

  return { ...totals, count, avgEnergy, avgWater, latest };
};

const latestWithLocation = (records = []) => {
  return records.find((item) => item.location) || records[0] || null;
};

const buildBuildingBenchmarks = (records = []) => {
  const maxLoad = records.reduce((max, item) => {
    const load = toNumber(item.energy) + toNumber(item.water);
    return load > max ? load : max;
  }, 0) || 1;

  const byBuilding = records.reduce((acc, item) => {
    const key = item.building || "Unknown";
    if (!acc[key]) acc[key] = { building: key, energy: 0, water: 0, count: 0, locations: new Set() };
    acc[key].energy += toNumber(item.energy);
    acc[key].water += toNumber(item.water);
    acc[key].count += 1;
    if (item.location) acc[key].locations.add(item.location);
    return acc;
  }, {});

  return Object.values(byBuilding)
    .map((item) => {
      const totalLoad = item.energy + item.water;
      return {
        ...item,
        locations: Array.from(item.locations || []),
        totalLoad,
        efficiency: Math.max(15, Math.round(100 - (totalLoad / maxLoad) * 70)),
      };
    })
    .sort((a, b) => b.totalLoad - a.totalLoad)
    .slice(0, 5);
};

const percentChange = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const severityFromScore = (score) => {
  if (score >= 80) return "Stable";
  if (score >= 60) return "Watch";
  if (score >= 40) return "Risk";
  return "Critical";
};

const buildActions = ({ energyDelta, waterDelta, latest, score, avgEnergy, avgWater }) => {
  const actions = [];
  const latestEnergy = toNumber(latest?.energy);
  const latestWater = toNumber(latest?.water);
  const energyTriggered = energyDelta > 10 || (avgEnergy > 0 && latestEnergy > avgEnergy * 1.15);
  const waterTriggered = waterDelta > 10 || (avgWater > 0 && latestWater > avgWater * 1.15);

  if (energyTriggered) {
    actions.push({
      title: "Reduce peak energy load",
      impact: "High",
      reason:
        energyDelta > 10
          ? `Energy usage is up ${energyDelta.toFixed(1)}% against the previous window.`
          : "Latest reading indicates active energy draw that can be optimized.",
    });
  }

  if (waterTriggered) {
    actions.push({
      title: "Inspect for water leakage",
      impact: "High",
      reason:
        waterDelta > 10
          ? `Water usage is up ${waterDelta.toFixed(1)}% against the previous window.`
          : "Current water reading should be verified for unnecessary consumption.",
    });
  }

  if (score < 70) {
    actions.push({
      title: "Trigger preventive maintenance",
      impact: "Medium",
      reason: "The current sustainability score indicates avoidable waste or equipment drift.",
    });
  }

  actions.push({
    title: "Automate critical alerts",
    impact: "Medium",
    reason: "Escalate high-severity spikes to facility owners before they become repeat losses.",
  });

  return actions.slice(0, 4);
};

const normalizeRisk = (score, remoteRisk) => {
  const risk = (remoteRisk || "").toString().toUpperCase();
  if (risk === "LOW") return "Low";
  if (risk === "MEDIUM") return "Moderate";
  if (risk === "HIGH") return "High";
  if (risk === "SEVERE") return "Critical";
  return score >= 80 ? "Low" : score >= 60 ? "Moderate" : score >= 40 ? "High" : "Critical";
};

const normalizeRootCause = (remote) => {
  const rootCause = (remote?.rootCause || "").toString().trim();
  if (rootCause) return rootCause;
  if (remote?.anomalies?.length) {
    const metric = remote.anomalies[0]?.metric;
    if (metric === "water") return "Likely leakage or uncontrolled water draw";
    if (metric === "energy") return "Peak load or equipment cycle drift";
  }
  return "Mixed operational drift";
};

const buildFallbackInsights = ({ current, previous, windowDays, scoreSnapshot, records, period }) => {
  const buildingBenchmarks = buildBuildingBenchmarks(records);
  const currentDailyEnergy = current.count ? current.energy / Math.max(1, windowDays) : 0;
  const previousDailyEnergy = previous.count ? previous.energy / Math.max(1, windowDays) : 0;
  const currentDailyWater = current.count ? current.water / Math.max(1, windowDays) : 0;
  const previousDailyWater = previous.count ? previous.water / Math.max(1, windowDays) : 0;

  const energyDelta = percentChange(currentDailyEnergy, previousDailyEnergy);
  const waterDelta = percentChange(currentDailyWater, previousDailyWater);

  const score = scoreSnapshot?.score ?? Math.max(
    0,
    Math.min(100, Math.round(100 - currentDailyEnergy / 10 - currentDailyWater / 50))
  );
  const carbon = Math.round(current.energy * CARBON_FACTOR);
  const estimatedCost = Math.round(current.energy * ENERGY_RATE + current.water * WATER_RATE);
  const excessEnergy = Math.max(0, currentDailyEnergy - previousDailyEnergy);
  const excessWater = Math.max(0, currentDailyWater - previousDailyWater);
  const rawMonthlySavings = Math.round(excessEnergy * 30 * ENERGY_RATE + excessWater * 30 * WATER_RATE);
  const savingsCap = Math.max(1000, Math.round(estimatedCost * 1.5));
  const monthlySavings = Math.max(0, Math.min(rawMonthlySavings, savingsCap));
  const riskLevel = normalizeRisk(score, scoreSnapshot?.risk);
  const latest = current.latest;
  const locationSource = latestWithLocation(records);
  const actions = buildActions({
    energyDelta: energyDelta || 0,
    waterDelta: waterDelta || 0,
    latest,
    score,
    avgEnergy: current.avgEnergy,
    avgWater: current.avgWater,
  });

  const describeDelta = (value) => {
    if (value == null) return "not comparable";
    const direction = value >= 0 ? "above" : "below";
    return `${Math.abs(value).toFixed(1)}% ${direction}`;
  };

  const summary = current.count
    ? `Monitoring ${current.count} records across the last ${windowDays} days. Energy is ${describeDelta(energyDelta)} the previous window, while water is ${describeDelta(waterDelta)} the baseline.`
    : "No telemetry is available yet for this time window.";

  const nextBestAction =
    riskLevel === "Critical"
      ? "Escalate immediately and inspect the active load or leakage source."
      : energyDelta > 10 || waterDelta > 10
        ? "Tune consumption thresholds and review the largest spike first."
        : "Keep current settings and continue monitoring for drift.";

  const rootCause =
    waterDelta > 10 && (current.latest?.water || 0) > current.avgWater * 1.15
      ? "Likely leakage or uncontrolled water draw"
      : energyDelta > 10 && (current.latest?.energy || 0) > current.avgEnergy * 1.15
        ? "Peak load or equipment cycle drift"
        : "Mixed operational drift";

  return {
    period: period || "week",
    windowDays,
    totalRecords: current.count,
    mlStatus: {
      active: false,
      source: "js-fallback",
      label: "JS Fallback",
    },
    current: {
      energy: current.energy,
      water: current.water,
      avgEnergy: Math.round(current.avgEnergy),
      avgWater: Math.round(current.avgWater),
    },
    latestReading: scoreSnapshot?.usage
      ? {
          building: locationSource?.building || latest?.building || "Unknown",
          location: locationSource?.location || latest?.location || "",
          energy: toNumber(scoreSnapshot.usage.energy),
          water: toNumber(scoreSnapshot.usage.water),
          timestamp: locationSource?.timestamp || latest?.timestamp || latest?.createdAt || null,
        }
      : null,
    previous: {
      energy: previous.energy,
      water: previous.water,
      avgEnergy: Math.round(previous.avgEnergy),
      avgWater: Math.round(previous.avgWater),
    },
    deltas: {
      energy: energyDelta == null ? null : Number(energyDelta.toFixed(1)),
      water: waterDelta == null ? null : Number(waterDelta.toFixed(1)),
    },
    score,
    riskLevel,
    statusLabel: severityFromScore(score),
    carbon,
    estimatedCost,
    monthlySavingsPotential: monthlySavings,
    summary,
    rootCause,
    nextBestAction,
    priorityActions: actions,
    buildingBenchmarks,
    signalBreakdown: {
      energyTrend: Number((energyDelta || 0).toFixed(2)),
      waterTrend: Number((waterDelta || 0).toFixed(2)),
      usageConsistency: score,
    },
  };
};

exports.getExecutiveInsights = async (userId, period = "week") => {
  const windowDays = getWindowDays(period);
  const currentStart = getWindowStart(windowDays);
  const previousStart = getWindowStart(windowDays * 2);

  const records = await Data.find({
    userId,
    timestamp: { $gte: previousStart },
  }).sort({ timestamp: -1 });

  const currentRecords = records.filter((item) => new Date(item.timestamp || item.createdAt) >= currentStart);
  const previousRecords = records.filter((item) => {
    const ts = new Date(item.timestamp || item.createdAt);
    return ts >= previousStart && ts < currentStart;
  });

  const current = aggregateMetrics(currentRecords);
  const previous = aggregateMetrics(previousRecords);
  const scoreSnapshot = await scoreService.calculateScore(userId);
  const activeAlertsCount = await Alert.countDocuments({ userId, status: { $ne: "RESOLVED" } });
  const criticalAlertsCount = await Alert.countDocuments({
    userId,
    severity: "HIGH",
    status: { $ne: "RESOLVED" },
  });
  const latestActiveAlert = await Alert.findOne({ userId, status: { $ne: "RESOLVED" } }).sort({
    time: -1,
    createdAt: -1,
  });

  const currentDailyEnergy = current.count ? current.energy / Math.max(1, windowDays) : 0;
  const previousDailyEnergy = previous.count ? previous.energy / Math.max(1, windowDays) : 0;
  const currentDailyWater = current.count ? current.water / Math.max(1, windowDays) : 0;
  const previousDailyWater = previous.count ? previous.water / Math.max(1, windowDays) : 0;

  const energyDelta = percentChange(currentDailyEnergy, previousDailyEnergy);
  const waterDelta = percentChange(currentDailyWater, previousDailyWater);
  const fallbackScore = scoreSnapshot?.score ?? Math.max(
    0,
    Math.min(100, Math.round(100 - currentDailyEnergy / 10 - currentDailyWater / 50))
  );

  let remote = null;
  try {
    remote = await mlBridge.getInsights(currentRecords.length ? currentRecords : records);
  } catch (err) {
    console.error("Python ML insights unavailable, using local fallback:", err.message || err);
  }

  if (remote && typeof remote === "object") {
    const buildingBenchmarks = Array.isArray(remote.hotspots) && remote.hotspots.length > 0
      ? remote.hotspots
      : buildBuildingBenchmarks(currentRecords.length ? currentRecords : records);
    const score = Number.isFinite(Number(scoreSnapshot?.score)) ? Number(scoreSnapshot.score) : fallbackScore;
    const riskLevel = normalizeRisk(score, remote.riskLevel);
    const actions = Array.isArray(remote.recommendations) && remote.recommendations.length > 0
      ? remote.recommendations.map((message, index) => ({
          title: `ML Action ${index + 1}`,
          impact: index === 0 ? "High" : "Medium",
          reason: message,
        }))
      : buildActions({
          energyDelta: energyDelta || 0,
          waterDelta: waterDelta || 0,
          latest: current.latest,
          score,
          avgEnergy: current.avgEnergy,
          avgWater: current.avgWater,
        });

    const alertPressure = activeAlertsCount > 0 ? `${activeAlertsCount} active alert${activeAlertsCount > 1 ? "s" : ""}` : "no active alerts";
    const summary =
      remote.summary ||
      `ML analysis suggests ${riskLevel.toLowerCase()} risk over the current window with ${alertPressure}.`;
    const nextBestAction =
      remote.recommendations?.[0] ||
      (riskLevel === "Critical"
        ? "Escalate immediately and inspect the active load or leakage source."
        : "Continue monitoring and address the highest-ranked hotspot.");
    const rootCause =
      (latestActiveAlert?.rootCause || "").trim() ||
      remote.rootCause ||
      normalizeRootCause(remote);

    return {
      period,
      windowDays,
      totalRecords: current.count,
      model: remote.model || null,
      mlStatus: {
        active: true,
        source: "python-ml",
        label: "Python ML Active",
      },
      current: {
        energy: current.energy,
        water: current.water,
        avgEnergy: Math.round(current.avgEnergy),
        avgWater: Math.round(current.avgWater),
      },
      latestReading: remote.latest
        ? {
            building: remote.latest.building || current.latest?.building || "Unknown",
            location: remote.latest.location || current.latest?.location || "",
            energy: toNumber(remote.latest.energy),
            water: toNumber(remote.latest.water),
            timestamp: current.latest?.timestamp || current.latest?.createdAt || null,
          }
        : null,
      previous: {
        energy: previous.energy,
        water: previous.water,
        avgEnergy: Math.round(previous.avgEnergy),
        avgWater: Math.round(previous.avgWater),
      },
      deltas: {
        energy: energyDelta == null ? null : Number(energyDelta.toFixed(1)),
        water: waterDelta == null ? null : Number(waterDelta.toFixed(1)),
      },
      score,
      riskLevel,
      statusLabel: severityFromScore(score),
      carbon: Math.round(current.energy * CARBON_FACTOR),
      estimatedCost: Math.round(current.energy * ENERGY_RATE + current.water * WATER_RATE),
      monthlySavingsPotential: Math.max(0, Math.round((remote.forecast?.predictedEnergyNextDay || 0) * 0.1)),
      summary,
      rootCause,
      nextBestAction,
      priorityActions: actions.slice(0, 4),
      buildingBenchmarks,
      confidence: Number.isFinite(Number(remote.confidence)) ? Number(remote.confidence) : 80,
      anomalies: Array.isArray(remote.anomalies) ? remote.anomalies : [],
      forecast: remote.forecast || null,
      signalBreakdown: remote.signalBreakdown || null,
      confidenceReasons: Array.isArray(remote.confidenceReasons) ? remote.confidenceReasons : [],
      activeAlertsCount,
      criticalAlertsCount,
    };
  }

  return buildFallbackInsights({ current, previous, windowDays, scoreSnapshot, records, period });
};
