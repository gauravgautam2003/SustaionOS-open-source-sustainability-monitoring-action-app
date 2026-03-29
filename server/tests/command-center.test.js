const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCommandCenterSnapshot } = require("../services/commandCenter.service");

test("buildCommandCenterSnapshot ranks hotspots, scenarios, and execution roadmap", () => {
  const base = new Date("2026-03-29T00:00:00.000Z").getTime();

  const hostelRecords = new Array(8).fill(null).map((_, index) => ({
    timestamp: new Date(base - index * 60 * 60 * 1000).toISOString(),
    building: "Hostel A",
    location: "South Wing",
    sensorId: "water-hostel-a",
    sensorName: "Water Meter A",
    batteryLevel: 19,
    signalQuality: 38,
    water: 540 + index * 8,
    energy: 95 + index * 4,
  }));

  const northBlockRecords = new Array(8).fill(null).map((_, index) => ({
    timestamp: new Date(base - (index + 8) * 60 * 60 * 1000).toISOString(),
    building: "North Block",
    location: "Admin Wing",
    sensorId: "energy-north-block",
    sensorName: "Energy Meter 2",
    batteryLevel: 76,
    signalQuality: 81,
    water: 130 + index * 3,
    energy: 245 + index * 6,
  }));

  const libraryRecords = new Array(6).fill(null).map((_, index) => ({
    timestamp: new Date(base - (index + 16) * 60 * 60 * 1000).toISOString(),
    building: "Library",
    location: "Main Hall",
    sensorId: "energy-library",
    sensorName: "Library Meter",
    batteryLevel: 82,
    signalQuality: 74,
    water: 120 + index,
    energy: 118 + index * 2,
  }));

  const alerts = [
    {
      _id: "a1",
      building: "Hostel A",
      severity: "HIGH",
      status: "OPEN",
      message: "Water spike persisted beyond threshold for 40 minutes.",
      estimatedLoss: 4200,
      recommendedAction: "Inspect hostel water loop immediately.",
      ownerTeam: "Facilities Team",
      time: new Date(base - 3 * 60 * 60 * 1000).toISOString(),
      responseDueAt: new Date(base - 2 * 60 * 60 * 1000).toISOString(),
      escalationLevel: 1,
      slaMinutes: 30,
    },
    {
      _id: "a2",
      building: "North Block",
      severity: "MEDIUM",
      status: "IN_PROGRESS",
      message: "Peak load above expected admin schedule.",
      estimatedLoss: 1500,
      recommendedAction: "Review HVAC runtime and after-hours load.",
      ownerTeam: "Energy Ops",
      time: new Date(base - 4 * 60 * 60 * 1000).toISOString(),
      responseDueAt: new Date(base + 2 * 60 * 60 * 1000).toISOString(),
      escalationLevel: 0,
      slaMinutes: 120,
    },
  ];

  const snapshot = buildCommandCenterSnapshot({
    records: [...hostelRecords, ...northBlockRecords, ...libraryRecords],
    alerts,
    insights: {
      score: 58,
      riskLevel: "High",
      monthlySavingsPotential: 18000,
      nextBestAction: "Inspect Hostel A water network before the next morning peak.",
    },
    period: "week",
  });

  assert.equal(snapshot.period, "week");
  assert.equal(snapshot.hotspots.length > 0, true);
  assert.equal(snapshot.hotspots[0].building, "Hostel A");
  assert.equal(snapshot.portfolio.atRiskBuildings > 0, true);
  assert.equal(snapshot.roadmap.some((item) => item.horizon === "Today"), true);
  assert.equal(snapshot.scenarios.length, 3);
  assert.equal(snapshot.sensorWatch.length > 0, true);
  assert.equal(snapshot.incidentQueue[0].building, "Hostel A");
  assert.equal(snapshot.teamQueues.length > 0, true);
});
