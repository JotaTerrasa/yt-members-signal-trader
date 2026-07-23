export function groupOperationalIncidents(incidents = []) {
  const groups = new Map();
  for (const incident of incidents) {
    if (!incident || typeof incident !== 'object') {
      continue;
    }

    const type = String(incident.type || 'error');
    const level = normalizedLevel(incident.level);
    const identity = type === 'error'
      ? `${type}:${level}:${incident.title || ''}:${incident.message || ''}`
      : `${type}:${level}`;
    const occurrences = normalizedOccurrences(incident.occurrences);
    const current = groups.get(identity);
    if (!current) {
      groups.set(identity, {
        ...incident,
        level,
        type,
        occurrences,
        firstAt: incident.firstAt || incident.at || null,
        lastAt: incident.lastAt || incident.at || null
      });
      continue;
    }

    const firstAt = earliestIso(current.firstAt, incident.firstAt || incident.at);
    const lastAt = latestIso(current.lastAt || current.at, incident.lastAt || incident.at);
    const latestIsIncoming = timestamp(incident.lastAt || incident.at) > timestamp(current.lastAt || current.at);
    groups.set(identity, {
      ...(latestIsIncoming ? incident : current),
      level,
      type,
      occurrences: current.occurrences + occurrences,
      firstAt,
      lastAt,
      at: lastAt || current.at || incident.at || null
    });
  }

  return [...groups.values()].sort((left, right) => (
    timestamp(right.lastAt || right.at) - timestamp(left.lastAt || left.at)
  ));
}

export function summarizeOperationalIncidents(incidents = [], { displayed = null } = {}) {
  return incidents.reduce((summary, incident) => {
    const occurrences = normalizedOccurrences(incident?.occurrences);
    const level = normalizedLevel(incident?.level);
    const type = String(incident?.type || 'error');
    summary.total += occurrences;
    summary[level] += occurrences;
    summary.byType[type] = (summary.byType[type] || 0) + occurrences;
    return summary;
  }, {
    total: 0,
    groups: incidents.length,
    displayed: displayed ?? incidents.length,
    warn: 0,
    error: 0,
    info: 0,
    byType: {}
  });
}

function normalizedLevel(value) {
  return value === 'error' ? 'error' : value === 'warn' ? 'warn' : 'info';
}

function normalizedOccurrences(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.max(1, Math.trunc(number))
    : 1;
}

function timestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function earliestIso(left, right) {
  const leftTime = timestamp(left);
  const rightTime = timestamp(right);
  if (!leftTime) {
    return right || left || null;
  }
  if (!rightTime) {
    return left || right || null;
  }
  return leftTime <= rightTime ? left : right;
}

function latestIso(left, right) {
  const leftTime = timestamp(left);
  const rightTime = timestamp(right);
  if (!leftTime) {
    return right || left || null;
  }
  if (!rightTime) {
    return left || right || null;
  }
  return leftTime >= rightTime ? left : right;
}
