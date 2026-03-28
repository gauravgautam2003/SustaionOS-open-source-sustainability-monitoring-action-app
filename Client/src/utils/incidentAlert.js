const toDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

export const getIncidentMeta = (alert = {}) => alert.incidentMeta || {};

export const formatIncidentDeadline = (alert = {}) => {
  const due = toDate(alert.responseDueAt);
  return due ? due.toLocaleString() : "No response window";
};

export const formatIncidentWindow = (alert = {}) => {
  const meta = getIncidentMeta(alert);
  if (meta.isOverdue) {
    return `${Math.abs(Number(meta.timeToBreachMinutes || 0))} min overdue`;
  }
  if (meta.timeToBreachMinutes == null) {
    return "No SLA";
  }
  if (meta.timeToBreachMinutes < 60) {
    return `${meta.timeToBreachMinutes} min left`;
  }
  const hours = Math.round(meta.timeToBreachMinutes / 60);
  return `${hours} hr left`;
};

export const formatIncidentOwner = (alert = {}) => {
  const owner = String(alert.ownerName || "").trim();
  const team = String(alert.ownerTeam || "").trim();
  if (!owner && !team) return "Unassigned";
  if (owner && team) return `${owner} · ${team}`;
  return owner || team;
};

export const getEscalationBadge = (alert = {}) => {
  const meta = getIncidentMeta(alert);
  return meta.escalationLevel > 0 ? `Esc ${meta.escalationLabel}` : null;
};
