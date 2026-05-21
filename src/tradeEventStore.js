import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class TradeEventStore {
  constructor(filePath) {
    this.filePath = filePath;
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
  }

  async save() {
    this.data.updatedAt = new Date().toISOString();
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`);
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
    await this.save();
    return stored;
  }

  async clear() {
    const cleared = this.data.events.length;
    this.data.events = [];
    await this.save();
    return cleared;
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
