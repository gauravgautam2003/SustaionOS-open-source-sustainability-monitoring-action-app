const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const statusRank = { OPEN: 4, ACKNOWLEDGED: 3, IN_PROGRESS: 2, RESOLVED: 1 };

const DEFAULT_SLA_MINUTES = {
  HIGH: 30,
  MEDIUM: 120,
  LOW: 360,
};

const normalizeSeverity = (value = "LOW") => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "HIGH") return "HIGH";
  if (normalized === "MEDIUM") return "MEDIUM";
  return "LOW";
};

const normalizeStatus = (value = "OPEN") => {
  const normalized = String(value || "").toUpperCase();
  if (["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"].includes(normalized)) return normalized;
  return "OPEN";
};

const cleanText = (value, maxLength = 120) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getDefaultSlaMinutes = (severity = "LOW") => DEFAULT_SLA_MINUTES[normalizeSeverity(severity)] || 120;

const prepareAlertForCreate = (payload = {}) => {
  const severity = normalizeSeverity(payload.severity);
  const time = toDate(payload.time) || new Date();
  const slaMinutes = clamp(
    Math.round(toNumber(payload.slaMinutes, getDefaultSlaMinutes(severity))),
    15,
    24 * 60
  );
  const responseDueAt = toDate(payload.responseDueAt) || new Date(time.getTime() + slaMinutes * 60 * 1000);

  return {
    ...payload,
    severity,
    status: normalizeStatus(payload.status || "OPEN"),
    ownerName: cleanText(payload.ownerName, 80),
    ownerTeam: cleanText(payload.ownerTeam, 80),
    slaMinutes,
    responseDueAt,
    escalationLevel: clamp(Math.round(toNumber(payload.escalationLevel, 0)), 0, 3),
    escalatedAt: toDate(payload.escalatedAt),
    escalationReason: cleanText(payload.escalationReason, 160),
    escalationHistory: Array.isArray(payload.escalationHistory)
      ? payload.escalationHistory
          .map((item) => ({
            level: clamp(Math.round(toNumber(item?.level, 1)), 1, 3),
            reason: cleanText(item?.reason, 160),
            at: toDate(item?.at) || new Date(),
          }))
          .slice(-10)
      : [],
    time,
  };
};

const ensureAlertWorkflowDefaults = (alertLike = {}) => {
  const base = typeof alertLike.toObject === "function" ? alertLike.toObject() : { ...alertLike };
  const normalized = prepareAlertForCreate(base);
  const responseDueAt =
    toDate(base.responseDueAt) ||
    new Date((toDate(base.time) || toDate(base.createdAt) || new Date()).getTime() + normalized.slaMinutes * 60 * 1000);

  return {
    ...normalized,
    responseDueAt,
  };
};

const buildIncidentMeta = (alertLike = {}) => {
  const alert = ensureAlertWorkflowDefaults(alertLike);
  const status = normalizeStatus(alert.status);
  const severity = normalizeSeverity(alert.severity);
  const now = Date.now();
  const createdAt = toDate(alert.time) || toDate(alert.createdAt) || new Date();
  const responseDueAt = toDate(alert.responseDueAt);
  const ageMinutes = Math.max(0, Math.round((now - createdAt.getTime()) / 60000));
  const timeToBreachMinutes = responseDueAt
    ? Math.round((responseDueAt.getTime() - now) / 60000)
    : null;
  const isResolved = status === "RESOLVED";
  const isOverdue = !isResolved && responseDueAt ? responseDueAt.getTime() < now : false;
  const escalationLevel = clamp(Math.round(toNumber(alert.escalationLevel, 0)), 0, 3);
  const needsEscalation = !isResolved && isOverdue && escalationLevel < 3;

  const priorityScore =
    (isResolved ? 0 : 1000) +
    (isOverdue ? 700 : 0) +
    severityRank[severity] * 120 +
    escalationLevel * 75 +
    statusRank[status] * 20 +
    Math.min(ageMinutes, 720);

  return {
    ageMinutes,
    timeToBreachMinutes,
    isOverdue,
    isResolved,
    needsEscalation,
    escalationLevel,
    escalationLabel: escalationLevel > 0 ? `L${escalationLevel}` : "None",
    hasOwner: Boolean(cleanText(alert.ownerName)),
    responseWindowLabel: `${alert.slaMinutes} min`,
    priorityScore,
  };
};

const enrichAlertPayload = (alertLike = {}) => {
  const alert = ensureAlertWorkflowDefaults(alertLike);
  return {
    ...alert,
    incidentMeta: buildIncidentMeta(alert),
  };
};

const sortIncidentQueue = (alerts = []) =>
  [...alerts].sort((a, b) => {
    const aMeta = a.incidentMeta || buildIncidentMeta(a);
    const bMeta = b.incidentMeta || buildIncidentMeta(b);
    return bMeta.priorityScore - aMeta.priorityScore;
  });

const applyIncidentUpdate = (alert, payload = {}, user = null) => {
  const normalized = ensureAlertWorkflowDefaults(alert);
  const nextStatus = payload.status ? normalizeStatus(payload.status) : normalizeStatus(normalized.status);

  if (typeof payload.rootCause === "string") {
    alert.rootCause = cleanText(payload.rootCause, 240);
  }
  if (typeof payload.recommendedAction === "string") {
    alert.recommendedAction = cleanText(payload.recommendedAction, 240);
  }
  if (Number.isFinite(Number(payload.estimatedLoss))) {
    alert.estimatedLoss = Number(payload.estimatedLoss);
  }
  if (typeof payload.ownerName === "string") {
    alert.ownerName = cleanText(payload.ownerName, 80);
  }
  if (typeof payload.ownerTeam === "string") {
    alert.ownerTeam = cleanText(payload.ownerTeam, 80);
  }
  if (payload.assignToSelf) {
    alert.ownerName = cleanText(user?.name || user?.email || "Assigned", 80);
    if (!alert.ownerTeam) alert.ownerTeam = "Operations";
  }
  if (payload.slaMinutes != null) {
    alert.slaMinutes = clamp(Math.round(toNumber(payload.slaMinutes, normalized.slaMinutes)), 15, 24 * 60);
    const createdAt = toDate(alert.time) || toDate(alert.createdAt) || new Date();
    alert.responseDueAt = new Date(createdAt.getTime() + alert.slaMinutes * 60 * 1000);
  } else {
    alert.slaMinutes = normalized.slaMinutes;
    alert.responseDueAt = normalized.responseDueAt;
  }

  alert.status = nextStatus;
  if (nextStatus === "ACKNOWLEDGED" && !alert.acknowledgedAt) alert.acknowledgedAt = new Date();
  if (nextStatus === "RESOLVED") {
    alert.resolvedAt = new Date();
  } else if (nextStatus !== "RESOLVED") {
    alert.resolvedAt = null;
  }

  if (payload.escalate) {
    const currentLevel = clamp(Math.round(toNumber(alert.escalationLevel, normalized.escalationLevel)), 0, 3);
    const nextLevel = clamp(currentLevel + 1, 1, 3);
    const reason = cleanText(
      payload.escalationReason ||
        (nextStatus === "RESOLVED"
          ? "Escalation review requested after resolution."
          : "Manual escalation requested by operator."),
      160
    );

    alert.escalationLevel = nextLevel;
    alert.escalatedAt = new Date();
    alert.escalationReason = reason;
    alert.escalationHistory = Array.isArray(alert.escalationHistory) ? alert.escalationHistory : [];
    alert.escalationHistory.push({
      level: nextLevel,
      reason,
      at: new Date(),
    });
    alert.escalationHistory = alert.escalationHistory.slice(-10);

    if (nextStatus === "OPEN") {
      alert.status = "IN_PROGRESS";
    }
    if (!alert.ownerName && user?.name) {
      alert.ownerName = cleanText(user.name, 80);
    }
  } else {
    alert.escalationLevel = clamp(Math.round(toNumber(alert.escalationLevel, normalized.escalationLevel)), 0, 3);
  }

  return alert;
};

module.exports = {
  getDefaultSlaMinutes,
  prepareAlertForCreate,
  ensureAlertWorkflowDefaults,
  buildIncidentMeta,
  enrichAlertPayload,
  sortIncidentQueue,
  applyIncidentUpdate,
};
