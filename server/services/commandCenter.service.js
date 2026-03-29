const Data = require("../models/Data");
const Alert = require("../models/Alert");
const executiveInsights = require("./executiveInsights.service");
const { buildIncidentMeta, enrichAlertPayload, sortIncidentQueue } = require("./incidentWorkflow.service");

const ENERGY_RATE = 8;
const WATER_RATE = 0.02;
const CARBON_FACTOR = 0.82;

const riskOrder = { Low: 1, Moderate: 2, High: 3, Critical: 4 };

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (value) => Math.round(toNumber(value, 0));

const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const average = (total, count) => (count > 0 ? total / count : 0);

const getWindowDays = (period) => {
  if (!period || period === "week") return 7;
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

const resolveUrgency = (riskScore, overdueIncidents, highAlerts) => {
  if (overdueIncidents > 0 || riskScore >= 80) {
    return { label: "Immediate", window: "0-4 hours" };
  }
  if (highAlerts > 0 || riskScore >= 65) {
    return { label: "Today", window: "Next 24 hours" };
  }
  if (riskScore >= 45) {
    return { label: "This Week", window: "3-5 days" };
  }
  return { label: "Monitor", window: "Track this week" };
};

const normalizeRiskLabel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
};

const pickLikelyIssue = ({
  energyDriftPct,
  waterDriftPct,
  sensorHealthScore,
  unresolvedAlerts,
  overdueIncidents,
  latestWater,
  latestEnergy,
}) => {
  if (overdueIncidents > 0) {
    return {
      label: "Escalated incident risk",
      owner: "Operations Lead",
      action: "Pull the incident into live response, assign an owner, and validate containment before the next SLA checkpoint.",
      successMetric: "Highest-risk incident acknowledged or resolved before the next breach window.",
    };
  }

  if (waterDriftPct >= 18 || latestWater >= latestEnergy * 3) {
    return {
      label: "Leakage or uncontrolled water draw",
      owner: "Facilities Team",
      action: "Inspect valves, tanks, and downstream plumbing on the highest-use zone and verify abnormal draw against the last healthy baseline.",
      successMetric: "Water intensity falls back within 10% of the portfolio baseline.",
    };
  }

  if (energyDriftPct >= 18) {
    return {
      label: "Peak-load or HVAC drift",
      owner: "Energy Ops",
      action: "Shift non-critical loads off-peak and inspect HVAC or heavy equipment cycles that are running longer than expected.",
      successMetric: "Energy intensity returns below the current portfolio average.",
    };
  }

  if (sensorHealthScore < 55) {
    return {
      label: "Sensor reliability gap",
      owner: "IoT Team",
      action: "Replace weak batteries, restore signal quality, and confirm the sensor is still aligned to the right building zone.",
      successMetric: "Sensor health stays above 70% for the affected building.",
    };
  }

  if (unresolvedAlerts > 0) {
    return {
      label: "Repeat anomaly pattern",
      owner: "Sustainability Ops",
      action: "Tighten alert thresholds for this building and review the recurring trigger before it becomes a repeated cost line.",
      successMetric: "Open alert volume for the building drops in the next operating window.",
    };
  }

  return {
    label: "Efficiency drift",
    owner: "Operations Team",
    action: "Review the latest operating profile for avoidable waste and tune the building back toward the portfolio baseline.",
    successMetric: "Score improves without increasing alert pressure.",
  };
};

const buildSensorHealthScore = ({ batteryAverage, signalAverage, lowBatteryCount, lowSignalCount, sensorCount }) => {
  if (!sensorCount) return 72;

  const batteryScore = batteryAverage != null ? clamp(batteryAverage, 0, 100) : 65;
  const signalScore = signalAverage != null ? clamp(signalAverage, 0, 100) : 65;
  const penalty = lowBatteryCount * 4 + lowSignalCount * 4;
  return clamp(round(batteryScore * 0.5 + signalScore * 0.5 - penalty), 20, 99);
};

const buildTeamQueues = (roadmap = []) => {
  const grouped = roadmap.reduce((acc, item) => {
    const key = item.owner || "Operations Team";
    if (!acc[key]) {
      acc[key] = {
        team: key,
        openActions: 0,
        urgentActions: 0,
        focus: "",
      };
    }

    acc[key].openActions += 1;
    if (item.horizon === "Today") acc[key].urgentActions += 1;
    if (!acc[key].focus) acc[key].focus = item.title;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => {
    if (b.urgentActions !== a.urgentActions) return b.urgentActions - a.urgentActions;
    return b.openActions - a.openActions;
  });
};

const buildCommandCenterSnapshot = ({
  records = [],
  alerts = [],
  insights = null,
  period = "week",
} = {}) => {
  const windowDays = getWindowDays(period);
  const safeInsights = insights || {};
  const sortedRecords = [...records].sort((a, b) => {
    const aTime = toDate(a.timestamp || a.createdAt)?.getTime() || 0;
    const bTime = toDate(b.timestamp || b.createdAt)?.getTime() || 0;
    return bTime - aTime;
  });

  const enrichedAlerts = alerts.map((alert) => enrichAlertPayload(alert));
  const incidentQueue = sortIncidentQueue(enrichedAlerts).slice(0, 5);
  const alertStats = enrichedAlerts.reduce(
    (acc, alert) => {
      const meta = alert.incidentMeta || buildIncidentMeta(alert);
      if ((alert.status || "OPEN") !== "RESOLVED") acc.active += 1;
      if ((alert.severity || "").toUpperCase() === "HIGH" && (alert.status || "OPEN") !== "RESOLVED") acc.high += 1;
      if (meta.isOverdue && (alert.status || "OPEN") !== "RESOLVED") acc.overdue += 1;
      acc.estimatedLoss += toNumber(alert.estimatedLoss);
      return acc;
    },
    { active: 0, high: 0, overdue: 0, estimatedLoss: 0 }
  );

  if (sortedRecords.length === 0) {
    const topIncident = incidentQueue[0] || null;
    const fallbackRoadmap = topIncident
      ? [
          {
            horizon: "Today",
            title: `Resolve ${topIncident.building || "active"} incident`,
            owner: topIncident.ownerTeam || topIncident.ownerName || "Operations Lead",
            objective:
              topIncident.recommendedAction ||
              "Assign the incident, acknowledge the alert, and verify containment before the next response deadline.",
            successMetric: "Incident status moves out of OPEN with a named owner attached.",
            expectedImpact: `Protect ongoing loss exposure of Rs. ${round(topIncident.estimatedLoss)}.`,
            linkedBuilding: topIncident.building || "System",
            urgency: topIncident.incidentMeta?.isOverdue ? "Immediate" : "Today",
          },
        ]
      : [];

    return {
      generatedAt: new Date().toISOString(),
      period,
      windowDays,
      story: {
        headline: "Telemetry is still sparse, but incident workflow is live.",
        brief: topIncident
          ? `The strongest next move is to close the incident on ${topIncident.building || "the active site"} before waste repeats.`
          : "Add more telemetry to unlock hotspot ranking, ROI planning, and team-level execution guidance.",
        focusLabel: topIncident?.building || "No telemetry yet",
        nextBestAction:
          safeInsights.nextBestAction ||
          topIncident?.recommendedAction ||
          "Ingest a few live readings so the command center can rank real hotspots.",
      },
      portfolio: {
        score: toNumber(safeInsights.score),
        riskLevel: safeInsights.riskLevel || "Low",
        trackedBuildings: 0,
        atRiskBuildings: 0,
        activeAlertsCount: alertStats.active,
        criticalAlertsCount: alertStats.high,
        overdueIncidents: alertStats.overdue,
        monthlySavingsOpportunity: toNumber(safeInsights.monthlySavingsPotential),
        carbonOpportunity: 0,
        waterRecoveryOpportunity: 0,
        sensorHealthScore: 0,
        monitoredSensors: 0,
        unhealthySensors: 0,
        estimatedLoss: round(alertStats.estimatedLoss),
      },
      hotspots: [],
      roadmap: fallbackRoadmap,
      scenarios: [
        {
          key: "conservative",
          label: "Conservative",
          reductionTarget: "5%",
          projectedSavings: round(toNumber(safeInsights.monthlySavingsPotential) * 0.35),
          projectedCarbonReduction: 0,
          projectedWaterRecovery: 0,
          projectedScore: clamp(round(toNumber(safeInsights.score) + 3), 0, 99),
          riskImprovement: "Low to moderate",
          summary: "Start by closing open incidents and collecting a healthier telemetry baseline.",
        },
      ],
      sensorWatch: [],
      incidentQueue: incidentQueue.map((alert) => ({
        id: String(alert._id || ""),
        building: alert.building || "System",
        severity: alert.severity || "LOW",
        status: alert.status || "OPEN",
        message: alert.message,
        estimatedLoss: round(alert.estimatedLoss),
        owner: alert.ownerName || alert.ownerTeam || "Unassigned",
        responseWindow: alert.incidentMeta?.responseWindowLabel || `${alert.slaMinutes || 120} min`,
        overdue: Boolean(alert.incidentMeta?.isOverdue),
      })),
      teamQueues: buildTeamQueues(fallbackRoadmap),
    };
  }

  const buildingAlertMap = enrichedAlerts.reduce((acc, alert) => {
    const key = alert.building || "Unknown";
    const meta = alert.incidentMeta || buildIncidentMeta(alert);
    if (!acc[key]) {
      acc[key] = {
        unresolvedAlerts: 0,
        highAlerts: 0,
        overdueIncidents: 0,
        estimatedLoss: 0,
        escalationLevel: 0,
        topAlert: "",
      };
    }

    if ((alert.status || "OPEN") !== "RESOLVED") acc[key].unresolvedAlerts += 1;
    if ((alert.severity || "").toUpperCase() === "HIGH" && (alert.status || "OPEN") !== "RESOLVED") acc[key].highAlerts += 1;
    if (meta.isOverdue && (alert.status || "OPEN") !== "RESOLVED") acc[key].overdueIncidents += 1;
    acc[key].estimatedLoss += toNumber(alert.estimatedLoss);
    acc[key].escalationLevel = Math.max(acc[key].escalationLevel, toNumber(alert.escalationLevel));
    if (!acc[key].topAlert) acc[key].topAlert = alert.message || "";
    return acc;
  }, {});

  const latestSensorMap = new Map();
  const buildingMap = {};
  let totalEnergy = 0;
  let totalWater = 0;
  let totalCostEquivalent = 0;

  sortedRecords.forEach((record) => {
    const building = record.building || "Unknown";
    const energy = toNumber(record.energy);
    const water = toNumber(record.water);
    totalEnergy += energy;
    totalWater += water;
    totalCostEquivalent += energy * ENERGY_RATE + water * WATER_RATE;

    if (!buildingMap[building]) {
      buildingMap[building] = {
        building,
        energy: 0,
        water: 0,
        count: 0,
        latest: null,
        locations: new Set(),
        sensors: new Set(),
        sensorNames: new Set(),
        batteryTotal: 0,
        signalTotal: 0,
        batterySamples: 0,
        signalSamples: 0,
        lowBatteryCount: 0,
        lowSignalCount: 0,
      };
    }

    const bucket = buildingMap[building];
    bucket.energy += energy;
    bucket.water += water;
    bucket.count += 1;

    const recordTime = toDate(record.timestamp || record.createdAt);
    const latestTime = toDate(bucket.latest?.timestamp || bucket.latest?.createdAt);
    if (!bucket.latest || (recordTime && (!latestTime || recordTime > latestTime))) {
      bucket.latest = record;
    }

    if (record.location) bucket.locations.add(record.location);
    if (record.sensorId) bucket.sensors.add(record.sensorId);
    if (record.sensorName) bucket.sensorNames.add(record.sensorName);

    const batteryLevel = Number(record.batteryLevel);
    if (Number.isFinite(batteryLevel)) {
      bucket.batteryTotal += batteryLevel;
      bucket.batterySamples += 1;
      if (batteryLevel < 25) bucket.lowBatteryCount += 1;
    }

    const signalQuality = Number(record.signalQuality);
    if (Number.isFinite(signalQuality)) {
      bucket.signalTotal += signalQuality;
      bucket.signalSamples += 1;
      if (signalQuality < 45) bucket.lowSignalCount += 1;
    }

    const sensorKey = record.sensorId || `${building}:${record.sensorName || record.location || "manual"}`;
    const previousSensor = latestSensorMap.get(sensorKey);
    if (!previousSensor) {
      latestSensorMap.set(sensorKey, record);
    } else {
      const previousTime = toDate(previousSensor.timestamp || previousSensor.createdAt);
      if (recordTime && (!previousTime || recordTime > previousTime)) {
        latestSensorMap.set(sensorKey, record);
      }
    }
  });

  const portfolioAvgEnergyPerRecord = average(totalEnergy, sortedRecords.length);
  const portfolioAvgWaterPerRecord = average(totalWater, sortedRecords.length);
  const buildings = Object.values(buildingMap);

  const sensorWatch = Array.from(latestSensorMap.values())
    .map((sensor) => {
      const batteryLevel = Number(sensor.batteryLevel);
      const signalQuality = Number(sensor.signalQuality);
      const issues = [];
      if (Number.isFinite(batteryLevel) && batteryLevel < 30) issues.push("Low battery");
      if (Number.isFinite(signalQuality) && signalQuality < 45) issues.push("Weak signal");
      if (!sensor.location && (sensor.latitude == null || sensor.longitude == null)) issues.push("Location not mapped");
      if (issues.length === 0) return null;

      const priority = clamp(
        round((Number.isFinite(signalQuality) ? 100 - signalQuality : 40) * 0.5 + (Number.isFinite(batteryLevel) ? 100 - batteryLevel : 40) * 0.5),
        25,
        99
      );

      return {
        sensorId: sensor.sensorId || sensor.sensorName || "Unknown sensor",
        sensorName: sensor.sensorName || sensor.sensorId || "Sensor",
        building: sensor.building || "Unknown",
        location: sensor.location || "",
        batteryLevel: Number.isFinite(batteryLevel) ? round(batteryLevel) : null,
        signalQuality: Number.isFinite(signalQuality) ? round(signalQuality) : null,
        issue: issues.join(" + "),
        owner: "IoT Team",
        action:
          issues.includes("Low battery")
            ? "Replace or recharge the device battery before anomaly coverage drops."
            : "Re-seat the sensor or gateway and confirm signal quality on the next sync.",
        priority,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);

  const hotspots = buildings
    .map((item) => {
      const buildingAlerts = buildingAlertMap[item.building] || {
        unresolvedAlerts: 0,
        highAlerts: 0,
        overdueIncidents: 0,
        estimatedLoss: 0,
        escalationLevel: 0,
        topAlert: "",
      };
      const energyPerRecord = average(item.energy, item.count);
      const waterPerRecord = average(item.water, item.count);
      const energyDriftPct = portfolioAvgEnergyPerRecord
        ? ((energyPerRecord - portfolioAvgEnergyPerRecord) / portfolioAvgEnergyPerRecord) * 100
        : 0;
      const waterDriftPct = portfolioAvgWaterPerRecord
        ? ((waterPerRecord - portfolioAvgWaterPerRecord) / portfolioAvgWaterPerRecord) * 100
        : 0;

      const batteryAverage = item.batterySamples ? item.batteryTotal / item.batterySamples : null;
      const signalAverage = item.signalSamples ? item.signalTotal / item.signalSamples : null;
      const sensorHealthScore = buildSensorHealthScore({
        batteryAverage,
        signalAverage,
        lowBatteryCount: item.lowBatteryCount,
        lowSignalCount: item.lowSignalCount,
        sensorCount: item.sensors.size || item.sensorNames.size,
      });

      const monthlyExcessEnergy = Math.max(0, average(item.energy, Math.max(windowDays, 1)) - average(totalEnergy, Math.max(windowDays, 1) * Math.max(buildings.length, 1))) * 30;
      const monthlyExcessWater = Math.max(0, average(item.water, Math.max(windowDays, 1)) - average(totalWater, Math.max(windowDays, 1) * Math.max(buildings.length, 1))) * 30;
      const monthlySavings = round(monthlyExcessEnergy * ENERGY_RATE + monthlyExcessWater * WATER_RATE + buildingAlerts.estimatedLoss * 0.2);
      const carbonReduction = round(monthlyExcessEnergy * CARBON_FACTOR);
      const waterRecovery = round(monthlyExcessWater);
      const loadShare = totalCostEquivalent
        ? ((item.energy * ENERGY_RATE + item.water * WATER_RATE) / totalCostEquivalent) * 100
        : 0;

      const riskScore = clamp(
        round(
          Math.max(0, energyDriftPct) * 0.45 +
            Math.max(0, waterDriftPct) * 0.45 +
            loadShare * 0.55 +
            buildingAlerts.unresolvedAlerts * 8 +
            buildingAlerts.highAlerts * 12 +
            buildingAlerts.overdueIncidents * 18 +
            buildingAlerts.escalationLevel * 6 +
            Math.max(0, 70 - sensorHealthScore) * 0.4
        ),
        18,
        99
      );

      const issue = pickLikelyIssue({
        energyDriftPct,
        waterDriftPct,
        sensorHealthScore,
        unresolvedAlerts: buildingAlerts.unresolvedAlerts,
        overdueIncidents: buildingAlerts.overdueIncidents,
        latestWater: toNumber(item.latest?.water),
        latestEnergy: toNumber(item.latest?.energy),
      });
      const urgency = resolveUrgency(riskScore, buildingAlerts.overdueIncidents, buildingAlerts.highAlerts);
      const evidence = [
        `${Math.abs(energyDriftPct).toFixed(1)}% energy drift versus portfolio average`,
        `${Math.abs(waterDriftPct).toFixed(1)}% water drift versus portfolio average`,
        `${buildingAlerts.unresolvedAlerts} open alert${buildingAlerts.unresolvedAlerts === 1 ? "" : "s"} and ${buildingAlerts.overdueIncidents} overdue incident${buildingAlerts.overdueIncidents === 1 ? "" : "s"}`,
        `${sensorHealthScore}% sensor health across ${Math.max(item.sensors.size || item.sensorNames.size, 1)} tracked sensor${Math.max(item.sensors.size || item.sensorNames.size, 1) === 1 ? "" : "s"}`,
      ].filter(Boolean);

      return {
        building: item.building,
        locations: Array.from(item.locations).slice(0, 3),
        issue: issue.label,
        owner: issue.owner,
        recommendedAction: issue.action,
        successMetric: issue.successMetric,
        urgency: urgency.label,
        responseWindow: urgency.window,
        riskScore,
        riskLevel: normalizeRiskLabel(riskScore),
        activeAlerts: buildingAlerts.unresolvedAlerts,
        overdueIncidents: buildingAlerts.overdueIncidents,
        highAlerts: buildingAlerts.highAlerts,
        energy: round(item.energy),
        water: round(item.water),
        latestEnergy: round(item.latest?.energy),
        latestWater: round(item.latest?.water),
        sensorHealthScore,
        sensorCount: item.sensors.size || item.sensorNames.size,
        topAlert: buildingAlerts.topAlert,
        evidence,
        opportunity: {
          monthlySavings,
          carbonReduction,
          waterRecovery,
          estimatedLoss: round(buildingAlerts.estimatedLoss),
        },
      };
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return b.opportunity.monthlySavings - a.opportunity.monthlySavings;
    })
    .slice(0, 6);

  const monthlySavingsOpportunity = round(
    hotspots.reduce((sum, item) => sum + toNumber(item.opportunity.monthlySavings), 0)
  );
  const carbonOpportunity = round(
    hotspots.reduce((sum, item) => sum + toNumber(item.opportunity.carbonReduction), 0)
  );
  const waterRecoveryOpportunity = round(
    hotspots.reduce((sum, item) => sum + toNumber(item.opportunity.waterRecovery), 0)
  );
  const monitoredSensors = latestSensorMap.size;
  const unhealthySensors = sensorWatch.length;
  const sensorHealthScore = monitoredSensors
    ? round(
        average(
          hotspots.reduce((sum, item) => sum + toNumber(item.sensorHealthScore), 0),
          Math.max(hotspots.length, 1)
        )
      )
    : 0;
  const atRiskBuildings = hotspots.filter((item) => riskOrder[item.riskLevel] >= riskOrder.High).length;

  const roadmap = [];
  const topHotspot = hotspots[0] || null;
  const secondHotspot = hotspots[1] || null;
  const topIncident = incidentQueue[0] || null;
  const topSensor = sensorWatch[0] || null;

  if (topHotspot) {
    roadmap.push({
      horizon: "Today",
      title: `Stabilize ${topHotspot.building}`,
      owner: topHotspot.owner,
      objective: topHotspot.recommendedAction,
      successMetric: topHotspot.successMetric,
      expectedImpact: `Protect up to Rs. ${topHotspot.opportunity.monthlySavings}/month and ${topHotspot.opportunity.carbonReduction} kg CO2.`,
      linkedBuilding: topHotspot.building,
      urgency: topHotspot.urgency,
    });
  }

  if (topIncident) {
    roadmap.push({
      horizon: "Today",
      title: `Close highest-risk incident on ${topIncident.building || "site"}`,
      owner: topIncident.ownerTeam || topIncident.ownerName || "Operations Lead",
      objective:
        topIncident.recommendedAction ||
        "Move the incident to an owned state and confirm the root cause before the next response checkpoint.",
      successMetric: "Incident exits OPEN or receives a named owner with a response note.",
      expectedImpact: `Avoid further loss exposure of Rs. ${round(topIncident.estimatedLoss)} and reduce alert fatigue.`,
      linkedBuilding: topIncident.building || "System",
      urgency: topIncident.incidentMeta?.isOverdue ? "Immediate" : "Today",
    });
  }

  if (secondHotspot) {
    roadmap.push({
      horizon: "This Week",
      title: `Tune controls for ${secondHotspot.building}`,
      owner: secondHotspot.owner,
      objective: secondHotspot.recommendedAction,
      successMetric: secondHotspot.successMetric,
      expectedImpact: `Recover another Rs. ${secondHotspot.opportunity.monthlySavings}/month of avoidable spend.`,
      linkedBuilding: secondHotspot.building,
      urgency: secondHotspot.urgency,
    });
  }

  if (topSensor) {
    roadmap.push({
      horizon: "This Week",
      title: `Recover telemetry confidence for ${topSensor.sensorId}`,
      owner: topSensor.owner,
      objective: topSensor.action,
      successMetric: "Battery and signal move back into a healthy range.",
      expectedImpact: "Prevents blind spots in anomaly detection and keeps AI recommendations trustworthy.",
      linkedBuilding: topSensor.building,
      urgency: topSensor.priority >= 75 ? "Today" : "This Week",
    });
  }

  roadmap.push({
    horizon: "This Month",
    title: "Operationalize the portfolio playbook",
    owner: "Sustainability Ops",
    objective:
      safeInsights.nextBestAction ||
      "Turn the top interventions into standard operating checks for all high-risk buildings.",
    successMetric: "High-risk building count decreases and monthly savings opportunity narrows.",
    expectedImpact: `Turns current findings into repeatable savings of roughly Rs. ${monthlySavingsOpportunity}/month.`,
    linkedBuilding: topHotspot?.building || "Portfolio",
    urgency: atRiskBuildings > 1 ? "This Week" : "This Month",
  });

  const scenarioDefinitions = [
    { key: "conservative", label: "Conservative", reductionTarget: "5%", factor: 0.4, riskImprovement: "Small but immediate" },
    { key: "balanced", label: "Balanced", reductionTarget: "10%", factor: 0.65, riskImprovement: "Meaningful risk drop" },
    { key: "aggressive", label: "Aggressive", reductionTarget: "15%", factor: 0.9, riskImprovement: "Portfolio-level reset" },
  ];

  const scenarios = scenarioDefinitions.map((scenario) => ({
    key: scenario.key,
    label: scenario.label,
    reductionTarget: scenario.reductionTarget,
    projectedSavings: round(monthlySavingsOpportunity * scenario.factor),
    projectedCarbonReduction: round(carbonOpportunity * scenario.factor),
    projectedWaterRecovery: round(waterRecoveryOpportunity * scenario.factor),
    projectedScore: clamp(round(toNumber(safeInsights.score) + scenario.factor * 12), 0, 99),
    riskImprovement: scenario.riskImprovement,
    summary: `${scenario.label} mode focuses on the top ${scenario.key === "aggressive" ? "three" : scenario.key === "balanced" ? "two" : "one"} hotspot${scenario.key === "conservative" ? "" : "s"} first.`,
  }));

  const story = {
    headline: topHotspot
      ? `${topHotspot.building} is the clearest place to unlock savings right now.`
      : "Portfolio is stable and ready for optimization.",
    brief: topHotspot
      ? `${atRiskBuildings} building${atRiskBuildings === 1 ? "" : "s"} need attention, ${alertStats.overdue} incident${alertStats.overdue === 1 ? "" : "s"} are overdue, and the top intervention can protect roughly Rs. ${topHotspot.opportunity.monthlySavings}/month.`
      : "No urgent telemetry hotspot is dominating the current window. Keep the system monitored and close remaining incidents.",
    focusLabel: topHotspot?.issue || safeInsights.riskLevel || "Low risk",
    nextBestAction: topHotspot?.recommendedAction || safeInsights.nextBestAction || "Continue monitoring and keep alerts tuned.",
  };

  return {
    generatedAt: new Date().toISOString(),
    period,
    windowDays,
    story,
    portfolio: {
      score: toNumber(safeInsights.score),
      riskLevel: safeInsights.riskLevel || normalizeRiskLabel(hotspots[0]?.riskScore || 0),
      trackedBuildings: buildings.length,
      atRiskBuildings,
      activeAlertsCount: alertStats.active,
      criticalAlertsCount: alertStats.high,
      overdueIncidents: alertStats.overdue,
      monthlySavingsOpportunity: Math.max(monthlySavingsOpportunity, round(toNumber(safeInsights.monthlySavingsPotential))),
      carbonOpportunity: Math.max(carbonOpportunity, round(toNumber(safeInsights.carbon))),
      waterRecoveryOpportunity,
      sensorHealthScore,
      monitoredSensors,
      unhealthySensors,
      estimatedLoss: round(alertStats.estimatedLoss),
    },
    hotspots,
    roadmap,
    scenarios,
    sensorWatch,
    incidentQueue: incidentQueue.map((alert) => ({
      id: String(alert._id || ""),
      building: alert.building || "System",
      severity: alert.severity || "LOW",
      status: alert.status || "OPEN",
      message: alert.message,
      estimatedLoss: round(alert.estimatedLoss),
      owner: alert.ownerName || alert.ownerTeam || "Unassigned",
      responseWindow: alert.incidentMeta?.responseWindowLabel || `${alert.slaMinutes || 120} min`,
      overdue: Boolean(alert.incidentMeta?.isOverdue),
    })),
    teamQueues: buildTeamQueues(roadmap),
  };
};

const getCommandCenter = async (userId, period = "week") => {
  const windowDays = getWindowDays(period);
  const windowStart = getWindowStart(windowDays);

  const [records, alerts, insights] = await Promise.all([
    Data.find({ userId, timestamp: { $gte: windowStart } }).sort({ timestamp: -1, createdAt: -1 }).limit(720),
    Alert.find({ userId }).sort({ time: -1, createdAt: -1 }).limit(40),
    executiveInsights.getExecutiveInsights(userId, period),
  ]);

  return buildCommandCenterSnapshot({
    records,
    alerts,
    insights,
    period,
  });
};

module.exports = {
  buildCommandCenterSnapshot,
  getCommandCenter,
};
