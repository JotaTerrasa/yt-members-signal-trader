const DATA_BACKUP_STALE_SECONDS = 36 * 60 * 60;
const PROFILE_BACKUP_STALE_SECONDS = 8 * 24 * 60 * 60;

export function buildSecureBackupStatus(record = {}, now = Date.now()) {
  const lastSuccessAt = validIso(record.lastSuccessAt);
  const lastAttemptAt = validIso(record.lastAttemptAt);
  const lastFailureAt = validIso(record.lastFailureAt);
  const drillCheckedAt = validIso(record.restoreDrill?.checkedAt);
  const profileSuccessAt = validIso(record.lastProfileSuccessAt);
  const profileDrillCheckedAt = validIso(record.profileRestoreDrill?.checkedAt);
  const mirrorCheckedAt = validIso(record.mirror?.checkedAt);
  const ageSeconds = secondsSince(lastSuccessAt, now);
  const drillAgeSeconds = secondsSince(drillCheckedAt, now);
  const profileAgeSeconds = secondsSince(profileSuccessAt, now);
  const profileDrillAgeSeconds = secondsSince(profileDrillCheckedAt, now);
  const mirrorAgeSeconds = secondsSince(mirrorCheckedAt, now);
  const drillOk = Boolean(record.restoreDrill?.ok && record.restoreDrill?.extracted);

  return {
    available: Boolean(lastSuccessAt),
    lastAttemptAt,
    lastSuccessAt,
    lastFailureAt,
    lastError: safeText(record.lastError),
    lastFile: safeFilename(record.lastFile),
    bytes: positiveNumber(record.bytes),
    verified: Boolean(record.verified),
    ageSeconds,
    stale: ageSeconds === null || ageSeconds > DATA_BACKUP_STALE_SECONDS,
    restoreDrill: {
      ok: drillOk,
      checkedAt: drillCheckedAt,
      ageSeconds: drillAgeSeconds,
      stale: !drillOk || drillAgeSeconds === null || drillAgeSeconds > DATA_BACKUP_STALE_SECONDS,
      entries: positiveNumber(record.restoreDrill?.entries),
      roots: allowedRoots(record.restoreDrill?.roots)
    },
    profile: {
      available: Boolean(profileSuccessAt),
      lastSuccessAt: profileSuccessAt,
      lastFile: safeFilename(record.lastProfileFile),
      bytes: positiveNumber(record.profileBytes),
      ageSeconds: profileAgeSeconds,
      stale: profileAgeSeconds === null
        || profileAgeSeconds > PROFILE_BACKUP_STALE_SECONDS
        || !record.profileRestoreDrill?.ok
        || !record.profileRestoreDrill?.extracted
        || profileDrillAgeSeconds === null
        || profileDrillAgeSeconds > PROFILE_BACKUP_STALE_SECONDS,
      restoreDrill: {
        ok: Boolean(record.profileRestoreDrill?.ok && record.profileRestoreDrill?.extracted),
        checkedAt: profileDrillCheckedAt,
        ageSeconds: profileDrillAgeSeconds
      }
    },
    mirror: {
      configured: Boolean(record.mirror?.configured),
      ok: Boolean(record.mirror?.configured && record.mirror?.ok && record.mirror?.verified),
      checkedAt: mirrorCheckedAt,
      ageSeconds: mirrorAgeSeconds,
      stale: Boolean(record.mirror?.configured)
        && (mirrorAgeSeconds === null || mirrorAgeSeconds > DATA_BACKUP_STALE_SECONDS),
      lastFile: safeFilename(record.mirror?.lastFile),
      targetLabel: safeLabel(record.mirror?.targetLabel),
      bytes: positiveNumber(record.mirror?.bytes),
      verified: Boolean(record.mirror?.verified),
      sameVolume: typeof record.mirror?.sameVolume === 'boolean' ? record.mirror.sameVolume : null,
      resilient: Boolean(record.mirror?.resilient && record.mirror?.sameVolume === false),
      cloudSyncUnverified: Boolean(record.mirror?.cloudSyncUnverified),
      lastError: safeText(record.mirror?.lastError)
    }
  };
}

function validIso(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function secondsSince(value, now) {
  if (!value) {
    return null;
  }
  return Math.max(0, Math.round((now - Date.parse(value)) / 1000));
}

function safeFilename(value) {
  const filename = String(value || '').trim();
  return filename && !/[\\/]/.test(filename) ? filename.slice(0, 180) : null;
}

function safeText(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300) || null;
}

function safeLabel(value) {
  return String(value || '').replace(/[\r\n\\/]+/g, ' ').trim().slice(0, 120) || null;
}

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function allowedRoots(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map(String).filter((root) => root === '.data' || root === '.yt-profile'))];
}
