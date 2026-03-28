const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDefaultSlaMinutes,
  prepareAlertForCreate,
  buildIncidentMeta,
  enrichAlertPayload,
  applyIncidentUpdate,
} = require("../services/incidentWorkflow.service");

test("getDefaultSlaMinutes maps severity to response windows", () => {
  assert.equal(getDefaultSlaMinutes("HIGH"), 30);
  assert.equal(getDefaultSlaMinutes("MEDIUM"), 120);
  assert.equal(getDefaultSlaMinutes("LOW"), 360);
});

test("prepareAlertForCreate assigns workflow defaults", () => {
  const created = prepareAlertForCreate({
    userId: "u1",
    building: "Main Hall",
    message: "Energy Spike",
    severity: "HIGH",
    time: "2026-03-28T09:00:00.000Z",
  });

  assert.equal(created.slaMinutes, 30);
  assert.equal(created.escalationLevel, 0);
  assert.ok(created.responseDueAt instanceof Date);
});

test("buildIncidentMeta marks unresolved expired alerts as overdue", () => {
  const meta = buildIncidentMeta({
    severity: "HIGH",
    status: "OPEN",
    time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    slaMinutes: 30,
    responseDueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    escalationLevel: 0,
  });

  assert.equal(meta.isOverdue, true);
  assert.equal(meta.needsEscalation, true);
  assert.ok(meta.priorityScore > 0);
});

test("applyIncidentUpdate can assign ownership and escalate safely", () => {
  const alert = {
    severity: "MEDIUM",
    status: "OPEN",
    time: new Date().toISOString(),
    escalationLevel: 0,
    escalationHistory: [],
  };

  applyIncidentUpdate(
    alert,
    {
      assignToSelf: true,
      escalate: true,
      escalationReason: "Facility manager requested escalation.",
    },
    { name: "Rahul Ops" }
  );

  assert.equal(alert.ownerName, "Rahul Ops");
  assert.equal(alert.status, "IN_PROGRESS");
  assert.equal(alert.escalationLevel, 1);
  assert.equal(alert.escalationHistory.length, 1);
  assert.match(alert.escalationReason, /Facility manager/);
});

test("enrichAlertPayload appends incidentMeta for UI use", () => {
  const enriched = enrichAlertPayload({
    severity: "LOW",
    status: "OPEN",
    time: new Date().toISOString(),
    ownerName: "Ops Desk",
  });

  assert.ok(enriched.incidentMeta);
  assert.equal(enriched.incidentMeta.hasOwner, true);
  assert.equal(enriched.incidentMeta.escalationLevel, 0);
});
