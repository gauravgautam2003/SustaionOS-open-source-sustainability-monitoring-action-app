const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_USER_SETTINGS,
  normalizeUserSettings,
  sanitizeSettingsPayload,
} = require("../services/userSettings.service");
const { buildResourceAlertContext } = require("../services/alertPolicy.service");

test("sanitizeSettingsPayload keeps only supported keys and clamps values", () => {
  const payload = sanitizeSettingsPayload(
    {
      name: "  Gautam  ",
      email: "  gautam@example.com ",
      energyLimit: "900",
      waterLimit: "35",
      energyAlerts: "false",
      waterAlerts: "true",
      darkMode: "true",
      sustainabilityGoal: "145",
      unsupported: "value",
    },
    DEFAULT_USER_SETTINGS
  );

  assert.deepEqual(payload, {
    ...normalizeUserSettings(DEFAULT_USER_SETTINGS),
    name: "Gautam",
    email: "gautam@example.com",
    energyLimit: 900,
    waterLimit: 50,
    energyAlerts: false,
    waterAlerts: true,
    darkMode: true,
    sustainabilityGoal: 100,
  });
  assert.equal(Object.hasOwn(payload, "unsupported"), false);
});

test("buildResourceAlertContext respects disabled alert channels", () => {
  const context = buildResourceAlertContext({
    detection: { status: true, reason: "Water Spike", severity: "HIGH", score: 3.4 },
    reading: { building: "Block A", water: 480, energy: 140 },
    history: [
      { water: 480, energy: 140 },
      { water: 180, energy: 120 },
      { water: 170, energy: 110 },
    ],
    settings: { ...DEFAULT_USER_SETTINGS, waterAlerts: false },
  });

  assert.equal(context, null);
});

test("buildResourceAlertContext creates threshold-driven alerts when limits are exceeded", () => {
  const context = buildResourceAlertContext({
    detection: { status: false, reason: "", severity: "LOW" },
    reading: { building: "Main Hall", water: 340, energy: 90 },
    history: [
      { water: 340, energy: 90 },
      { water: 120, energy: 82 },
      { water: 118, energy: 85 },
      { water: 125, energy: 88 },
    ],
    settings: { ...DEFAULT_USER_SETTINGS, waterLimit: 200, waterAlerts: true },
  });

  assert.ok(context);
  assert.equal(context.metric, "water");
  assert.equal(context.reason, "Water limit exceeded");
  assert.equal(context.severity, "HIGH");
  assert.match(context.recommendedAction, /below 200 L/i);
  assert.equal(context.notification.priority, "HIGH");
});

test("buildResourceAlertContext escalates anomaly severity when configured limits are breached", () => {
  const context = buildResourceAlertContext({
    detection: { status: true, reason: "Energy Spike", severity: "MEDIUM", score: 2.4 },
    reading: { building: "Admin Tower", water: 90, energy: 680 },
    history: [
      { water: 90, energy: 680 },
      { water: 88, energy: 320 },
      { water: 92, energy: 300 },
      { water: 86, energy: 310 },
    ],
    settings: { ...DEFAULT_USER_SETTINGS, energyLimit: 500, energyAlerts: true },
  });

  assert.ok(context);
  assert.equal(context.metric, "energy");
  assert.equal(context.reason, "Energy Spike");
  assert.equal(context.severity, "HIGH");
  assert.match(context.rootCause, /threshold|hvac|equipment/i);
  assert.ok(context.estimatedLoss > 0);
});
