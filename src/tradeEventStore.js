import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const COMPACT_EVERY_EVENTS = 100;

export class TradeEventStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.journalPath = `${filePath}.journal`;
    this.writeQueue = Promise.resolve();
    this.pendingJournalEntries = 0;
    this.data = {
      version: 1,
      updatedAt: null,
      events: []
    };
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.events)) {
        this.data = parsed;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }

    const recovered = await this.recoverJournal();
    if (recovered) {
      await this.save();
    }
  }

  async save() {
    return this.enqueueWrite(() => this.compactNow());
  }

  async flush() {
    await this.writeQueue;
  }

  list(limit = null) {
    const events = [...this.data.events].sort((left, right) => (
      Date.parse(right.at || 0) - Date.parse(left.at || 0)
    ));
    return limit ? events.slice(0, limit) : events;
  }

  async append(event) {
    const stored = {
      ...event,
      eventId: event.eventId || tradeEventId(event)
    };
    if (this.data.events.some((item) => item.eventId === stored.eventId)) {
      return stored;
    }

    this.data.events.push(stored);
    await this.enqueueWrite(async () => {
      await appendFile(this.journalPath, `${JSON.stringify(stored)}\n`, 'utf8');
      this.pendingJournalEntries += 1;
      if (this.pendingJournalEntries >= COMPACT_EVERY_EVENTS) {
        await this.compactNow();
      }
    });
    return stored;
  }

  async clear() {
    const cleared = this.data.events.length;
    this.data.events = [];
    await this.save();
    return cleared;
  }

  findRecentOpenSignal(signal, { windowMs = 12 * 60 * 60 * 1000 } = {}) {
    const target = tradeSignalFingerprint(signal);
    if (!target) {
      return null;
    }

    const cutoff = Date.now() - Number(windowMs || 0);
    return this.list().find((event) => {
      const timestamp = Date.parse(event.at || 0);
      return Number.isFinite(timestamp)
        && timestamp >= cutoff
        && isOpeningExecutionStatus(event.status)
        && tradeSignalFingerprint(event.signal) === target;
    }) || null;
  }

  countOpeningExecutions({ mode = null, since = null } = {}) {
    const cutoff = since ? Date.parse(since) : NaN;
    return this.data.events.filter((event) => {
      const timestamp = Date.parse(event.at || 0);
      return isOpeningExecutionStatus(event.status)
        && (!Number.isFinite(cutoff) || timestamp >= cutoff)
        && (!mode || eventExecutionMode(event) === mode);
    }).length;
  }

  enqueueWrite(operation) {
    const queued = this.writeQueue
      .catch(() => null)
      .then(operation);
    this.writeQueue = queued;
    return queued;
  }

  async compactNow() {
    this.data.updatedAt = new Date().toISOString();
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.filePath);
    await writeFile(this.journalPath, '', 'utf8');
    this.pendingJournalEntries = 0;
  }

  async recoverJournal() {
    let raw;
    try {
      raw = await readFile(this.journalPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }

    const known = new Set(this.data.events.map((event) => event.eventId || tradeEventId(event)));
    let recovered = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      try {
        const event = JSON.parse(line);
        const eventId = event.eventId || tradeEventId(event);
        if (!known.has(eventId)) {
          this.data.events.push({ ...event, eventId });
          known.add(eventId);
          recovered += 1;
        }
      } catch {
        // Una última línea parcial se ignora; los eventos compactados siguen intactos.
      }
    }
    return recovered;
  }
}

function tradeEventId(event = {}) {
  return [
    event.at || new Date().toISOString(),
    event.status || 'event',
    event.postId || '',
    event.signal?.action || '',
    event.signal?.symbol || '',
    event.signal?.direction || '',
    event.signal?.entry?.price || '',
    firstOrderId(event)
  ].join('|');
}

function firstOrderId(value) {
  const candidates = [
    value.order?.orderId,
    value.order?.orderID,
    value.response?.data?.order?.orderId,
    value.response?.data?.order?.orderID,
    value.exchangePosition?.id
  ];
  return candidates.find(Boolean) || '';
}

function tradeSignalFingerprint(signal = {}) {
  if (!signal?.symbol || !signal?.direction || signal.action) {
    return '';
  }

  return [
    signal.symbol,
    signal.direction,
    signal.entry?.type || '',
    signal.entry?.price || '',
    signal.stopLoss || '',
    Array.isArray(signal.takeProfits) ? signal.takeProfits.join(',') : '',
    signal.leverage || '',
    signal.notionalUSDT || ''
  ].join('|').toUpperCase();
}

function isOpeningExecutionStatus(status) {
  const value = String(status || '');
  return value === 'test_order_sent'
    || value === 'demo_order_sent'
    || value === 'live_order_sent';
}

function eventExecutionMode(event = {}) {
  const explicit = String(event.executionMode || '').toLowerCase();
  if (explicit === 'demo' || explicit === 'live' || explicit === 'test') {
    return explicit;
  }
  const status = String(event.status || '').toLowerCase();
  if (status.startsWith('demo_')) {
    return 'demo';
  }
  if (status.startsWith('live_')) {
    return 'live';
  }
  if (status.startsWith('test_')) {
    return 'test';
  }
  return '';
}
