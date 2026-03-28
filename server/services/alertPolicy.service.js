const { normalizeUserSettings } = require("./userSettings.service");

const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSeverity = (value = "LOW") => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "HIGH") return "HIGH";
  if (normalized === "MEDIUM") return "MEDIUM";
  return "LOW";
};

const maxSeverity = (...values) =>
  values
    .map((value) => normalizeSeverity(value))
    .sort((a, b) => severityRank[b] - severityRank[a])[0] || "LOW";

const inferMetric = ({ detection = {}, reading = {} } = {}) => {
  const reason = `${detection.reason || ""} ${detection.summary || ""}`.toLowerCase();
  if (/water|leak|pipeline|tank|flow/.test(reason)) return "water";
  if (/energy|electric|power|load|hvac|voltage|current/.test(reason)) return "energy";

  const water = toNumber(reading.water);
  const energy = toNumber(reading.energy);
  if (water > 0 || energy > 0) {
    return water >= energy ? "water" : "energy";
  }

  return null;
};

const averageFromHistory = (history = [], field) => {
  const baseline = Array.isArray(history) ? history.slice(1, 11) : [];
  if (!baseline.length) return 0;
  return baseline.reduce((sum, item) => sum + toNumber(item[field]), 0) / baseline.length;
};

const buildThresholdSignal = ({ metric, reading, settings }) => {
  if (!metric) return null;

  const actual = toNumber(reading?.[metric]);
  const limit = metric === "water" ? toNumber(settings.waterLimit) : toNumber(settings.energyLimit);
  if (actual <= 0 || limit <= 0 || actual < limit) return null;

  const ratio = actual / limit;
  return {
    metric,
    limit,
    ratio,
    severity: ratio >= 1.25 ? "HIGH" : "MEDIUM",
    reason: metric === "water" ? "Water limit exceeded" : "Energy limit exceeded",
  };
};

const chooseThresholdSignal = ({ reading, settings }) => {
  const waterSignal = buildThresholdSignal({ metric: "water", reading, settings });
  const energySignal = buildThresholdSignal({ metric: "energy", reading, settings });

  if (waterSignal && energySignal) {
    return waterSignal.ratio >= energySignal.ratio ? waterSignal : energySignal;
  }

  return waterSignal || energySignal || null;
};

const defaultRootCause = ({ metric, actual, average, limitExceeded }) => {
  if (metric === "water") {
    if (limitExceeded) return "Configured water threshold exceeded. Possible leakage or uncontrolled draw.";
    if (actual > average * 1.2) return "Likely leakage or uncontrolled water draw compared to recent baseline.";
    return "Unusual water usage pattern detected against recent history.";
  }

  if (limitExceeded) return "Configured energy threshold exceeded. Possible HVAC or equipment overload.";
  if (actual > average * 1.2) return "Likely HVAC, lighting, or equipment load increase beyond normal baseline.";
  return "Unusual energy usage pattern detected against recent history.";
};

const defaultAction = ({ metric, limit }) =>
  metric === "water"
    ? `Inspect valves, tanks, and pipeline joints. Verify usage stays below ${Math.round(limit)} L.`
    : `Review heavy appliances, HVAC schedules, and idle loads. Keep usage below ${Math.round(limit)} kWh when possible.`;

const buildResourceAlertContext = ({
  detection = null,
  reading = {},
  history = [],
  settings = {},
} = {}) => {
  const policy = normalizeUserSettings(settings);
  const thresholdSignal = chooseThresholdSignal({ reading, settings: policy });
  const metric = inferMetric({ detection, reading }) || thresholdSignal?.metric;
  if (!metric) return null;

  if (metric === "water" && !policy.waterAlerts) return null;
  if (metric === "energy" && !policy.energyAlerts) return null;
  const metricThresholdSignal =
    thresholdSignal?.metric === metric
      ? thresholdSignal
      : buildThresholdSignal({ metric, reading, settings: policy });
  const detectionActive = Boolean(detection?.status);

  if (!detectionActive && !metricThresholdSignal) return null;

  const actual = toNumber(reading?.[metric]);
  const waterAverage = averageFromHistory(history, "water");
  const energyAverage = averageFromHistory(history, "energy");
  const average = metric === "water" ? waterAverage : energyAverage;

  const waterDelta = Math.max(
    0,
    Math.max(toNumber(reading.water) - waterAverage, toNumber(reading.water) - policy.waterLimit)
  );
  const energyDelta = Math.max(
    0,
    Math.max(toNumber(reading.energy) - energyAverage, toNumber(reading.energy) - policy.energyLimit)
  );

  const reason = detectionActive
    ? detection.reason || metricThresholdSignal?.reason || (metric === "water" ? "Water Spike" : "Energy Spike")
    : metricThresholdSignal.reason;
  const severity = maxSeverity(detection?.severity, metricThresholdSignal?.severity);
  const rootCause =
    String(detection?.rootCause || "").trim() ||
    defaultRootCause({
      metric,
      actual,
      average,
      limitExceeded: Boolean(metricThresholdSignal),
    });
  const recommendedAction =
    String(detection?.recommendation || "").trim() ||
    defaultAction({
      metric,
      limit: metricThresholdSignal?.limit || (metric === "water" ? policy.waterLimit : policy.energyLimit),
    });

  const building = String(reading.building || "System").trim() || "System";
  const metricLabel = metric === "water" ? "Water" : "Energy";
  const reasonSlug = String(reason || metricLabel)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || metric;

  return {
    metric,
    reason,
    severity,
    rootCause,
    recommendedAction,
    estimatedLoss: Math.round(energyDelta * 8 + waterDelta * 0.02),
    message: `${reason}${detection?.score != null ? ` (score:${detection.score})` : ""}`,
    notification: {
      title: `${metricLabel} alert detected`,
      message: `${building} needs attention. ${recommendedAction}`,
      priority: severity,
      dedupeKey: `alert:${building}:${metric}:${reasonSlug}`,
      metadata: {
        metric,
        building,
        thresholdTriggered: Boolean(metricThresholdSignal),
        configuredLimit: metricThresholdSignal?.limit || null,
        severity,
      },
    },
  };
};

module.exports = {
  buildResourceAlertContext,
  normalizeSeverity,
  maxSeverity,
};
