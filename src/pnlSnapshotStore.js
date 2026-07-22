import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { QueuedJsonWriter } from './queuedJsonWriter.js';

export class PnlSnapshotStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.writer = new QueuedJsonWriter(filePath);
    this.data = emptySnapshotData();
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      this.data = normalizeSnapshotData(parsed);
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
        throw error;
      }
      this.data = emptySnapshotData();
      await this.save();
    }
  }

  getPnl(months) {
    const snapshot = this.data.pnl;
    return snapshot && snapshot.months === String(months)
      ? structuredClone(snapshot)
      : null;
  }

  getSources(month) {
    const snapshot = this.data.sources;
    return snapshot && snapshot.month === String(month)
      ? structuredClone(snapshot)
      : null;
  }

  async setPnl({ months, at = Date.now(), pnl } = {}) {
    if (!pnl || typeof pnl !== 'object') {
      throw new Error('invalid_pnl_snapshot');
    }
    this.data.pnl = {
      months: String(months),
      at: validTimestamp(at),
      pnl: structuredClone(pnl)
    };
    await this.save();
    return this.getPnl(months);
  }

  async setSources({ month, at = Date.now(), payload } = {}) {
    if (!month || !payload || typeof payload !== 'object') {
      throw new Error('invalid_pnl_sources_snapshot');
    }
    this.data.sources = {
      month: String(month),
      at: validTimestamp(at),
      payload: structuredClone(payload)
    };
    await this.save();
    return this.getSources(month);
  }

  async clear() {
    this.data = emptySnapshotData();
    await this.save();
  }

  async flush() {
    await this.writer.flush();
  }

  async save() {
    this.data.updatedAt = new Date().toISOString();
    await this.writer.write(this.data);
  }
}

export function applyPnlSourcesFallback({ payload = {}, sourceErrors = {}, snapshot = null } = {}) {
  const failedKeys = Object.entries(sourceErrors)
    .filter(([, error]) => Boolean(error))
    .map(([key]) => key);
  if (!snapshot?.payload || !failedKeys.length) {
    return payload;
  }

  const merged = structuredClone(payload);
  merged.sources ||= {};
  merged.positions ||= {};
  for (const key of failedKeys) {
    merged.sources[key] = snapshot.payload.sources?.[key] || merged.sources[key];
    merged.positions[key] = snapshot.payload.positions?.[key] || merged.positions[key] || [];
  }
  merged.cached = true;
  merged.stale = true;
  merged.lastGoodAt = new Date(validTimestamp(snapshot.at)).toISOString();
  return merged;
}

function emptySnapshotData() {
  return {
    version: 1,
    updatedAt: null,
    pnl: null,
    sources: null
  };
}

function normalizeSnapshotData(value = {}) {
  const normalized = emptySnapshotData();
  normalized.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
  if (validPnlSnapshot(value.pnl)) {
    normalized.pnl = structuredClone(value.pnl);
  }
  if (validSourcesSnapshot(value.sources)) {
    normalized.sources = structuredClone(value.sources);
  }
  return normalized;
}

function validPnlSnapshot(value) {
  return Boolean(
    value
    && typeof value.months === 'string'
    && Number.isFinite(Number(value.at))
    && value.pnl
    && typeof value.pnl === 'object'
  );
}

function validSourcesSnapshot(value) {
  return Boolean(
    value
    && typeof value.month === 'string'
    && Number.isFinite(Number(value.at))
    && value.payload
    && typeof value.payload === 'object'
  );
}

function validTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}
