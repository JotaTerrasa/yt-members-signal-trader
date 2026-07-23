import { readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';

const GIB = 1024 ** 3;
const WARNING_FREE_BYTES = 10 * GIB;
const CRITICAL_FREE_BYTES = 2 * GIB;
const WARNING_FREE_PERCENT = 5;
const CRITICAL_FREE_PERCENT = 2;
const STALE_PARTIAL_MS = 60 * 60 * 1000;
const ALERT_LEVELS = new Set(['warn', 'critical', 'unavailable']);

export async function inspectBackupStorage(directory, {
  now = Date.now(),
  filesystemPath = directory
} = {}) {
  try {
    const [entries, filesystem] = await Promise.all([
      readdir(directory, { withFileTypes: true }).catch((error) => {
        if (error?.code === 'ENOENT') {
          return [];
        }
        throw error;
      }),
      statfs(filesystemPath, { bigint: true })
    ]);
    const tracked = entries.filter((entry) => entry.isFile()
      && (entry.name.endsWith('.fmbak') || entry.name.endsWith('.partial')));
    const files = (await Promise.all(tracked.map(async (entry) => {
      const info = await stat(join(directory, entry.name)).catch(() => null);
      return info ? { name: entry.name, info } : null;
    }))).filter(Boolean);
    const backups = files.filter((file) => file.name.endsWith('.fmbak'));
    const partials = files.filter((file) => file.name.endsWith('.partial'));
    const stalePartials = partials.filter((file) => now - file.info.mtimeMs > STALE_PARTIAL_MS);
    const backupTimes = backups.map((file) => file.info.mtimeMs).filter(Number.isFinite);

    return evaluateBackupStorage({
      available: true,
      checkedAt: new Date(now).toISOString(),
      totalBytes: filesystemProduct(filesystem.blocks, filesystem.bsize),
      freeBytes: filesystemProduct(filesystem.bavail ?? filesystem.bfree, filesystem.bsize),
      backupFiles: backups.length,
      backupBytes: sumFileBytes(backups),
      partialFiles: partials.length,
      partialBytes: sumFileBytes(partials),
      stalePartialFiles: stalePartials.length,
      oldestBackupAt: backupTimes.length ? new Date(Math.min(...backupTimes)).toISOString() : null,
      newestBackupAt: backupTimes.length ? new Date(Math.max(...backupTimes)).toISOString() : null
    }, now);
  } catch (error) {
    return evaluateBackupStorage({
      available: false,
      checkedAt: new Date(now).toISOString(),
      lastError: safeStorageError(error)
    }, now);
  }
}

export function evaluateBackupStorage(input = {}, now = Date.now()) {
  const available = Boolean(input.available);
  const totalBytes = nonNegativeNumber(input.totalBytes);
  const freeBytes = nonNegativeNumber(input.freeBytes);
  const backupFiles = nonNegativeInteger(input.backupFiles);
  const backupBytes = nonNegativeNumber(input.backupBytes);
  const partialFiles = nonNegativeInteger(input.partialFiles);
  const partialBytes = nonNegativeNumber(input.partialBytes);
  const stalePartialFiles = nonNegativeInteger(input.stalePartialFiles);
  const freePercent = available && totalBytes > 0 && freeBytes !== null
    ? percentage(freeBytes, totalBytes)
    : null;
  const backupSharePercent = available && totalBytes > 0 && backupBytes !== null
    ? percentage(backupBytes, totalBytes)
    : null;
  const criticalSpace = available && freeBytes !== null
    && (freeBytes <= CRITICAL_FREE_BYTES || freePercent <= CRITICAL_FREE_PERCENT);
  const warningSpace = available && freeBytes !== null
    && (freeBytes <= WARNING_FREE_BYTES || freePercent <= WARNING_FREE_PERCENT);
  const level = !available
    ? 'unavailable'
    : criticalSpace
      ? 'critical'
      : warningSpace || stalePartialFiles > 0
        ? 'warn'
        : 'ok';
  const reason = !available
    ? 'inspection_unavailable'
    : criticalSpace
      ? 'critical_free_space'
      : warningSpace
        ? 'low_free_space'
        : stalePartialFiles > 0
          ? 'stale_partial_files'
          : 'ok';

  return {
    available,
    checkedAt: validIso(input.checkedAt) || new Date(now).toISOString(),
    level,
    reason,
    totalBytes,
    freeBytes,
    freePercent,
    backupFiles,
    backupBytes,
    backupSharePercent,
    partialFiles,
    partialBytes,
    stalePartialFiles,
    oldestBackupAt: validIso(input.oldestBackupAt),
    newestBackupAt: validIso(input.newestBackupAt),
    warningThresholdBytes: WARNING_FREE_BYTES,
    criticalThresholdBytes: CRITICAL_FREE_BYTES,
    warningThresholdPercent: WARNING_FREE_PERCENT,
    criticalThresholdPercent: CRITICAL_FREE_PERCENT,
    lastError: available ? null : safeStorageStatusError(input.lastError)
  };
}

export function backupStorageAlertAction({
  previousLevel,
  currentLevel,
  lastAlertAt = 0,
  now = Date.now(),
  cooldownMs
} = {}) {
  const currentIsAlert = ALERT_LEVELS.has(currentLevel);
  const previousWasAlert = ALERT_LEVELS.has(previousLevel);
  if (!currentIsAlert) {
    return previousWasAlert ? 'recovered' : 'none';
  }
  const elapsed = Math.max(0, Number(now) - Math.max(0, Number(lastAlertAt) || 0));
  return currentLevel !== previousLevel || elapsed >= Math.max(0, Number(cooldownMs) || 0)
    ? 'alert'
    : 'none';
}

function filesystemProduct(blocks, blockSize) {
  if (blocks === undefined || blockSize === undefined) {
    return null;
  }
  const value = BigInt(blocks) * BigInt(blockSize);
  return Number(value > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : value);
}

function sumFileBytes(files) {
  return files.reduce((total, file) => total + Math.max(0, Number(file.info.size) || 0), 0);
}

function percentage(value, total) {
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function nonNegativeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function nonNegativeInteger(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : 0;
}

function validIso(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function safeStorageError(error) {
  const code = String(error?.code || '').replace(/[^A-Z0-9_-]/gi, '').slice(0, 40);
  return code ? `storage_${code}` : 'storage_inspection_failed';
}

function safeStorageStatusError(value) {
  const match = String(value || '').match(/^storage_[A-Z0-9_-]+/i);
  return match ? match[0].slice(0, 60) : 'storage_inspection_failed';
}
