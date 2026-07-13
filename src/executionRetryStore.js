import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { QueuedJsonWriter } from './queuedJsonWriter.js';

export class ExecutionRetryStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.writer = new QueuedJsonWriter(filePath);
    this.data = {
      version: 1,
      updatedAt: null,
      items: []
    };
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (Array.isArray(parsed.items)) {
        this.data = {
          version: 1,
          updatedAt: parsed.updatedAt || null,
          items: parsed.items.filter(validRetryItem)
        };
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }
  }

  list(kind = null) {
    return this.data.items
      .filter((item) => !kind || item.kind === kind)
      .map((item) => structuredClone(item));
  }

  async upsert(item) {
    if (!validRetryItem(item)) {
      throw new Error('invalid_execution_retry_item');
    }
    const stored = serializableRetryItem(item);
    const index = this.data.items.findIndex((candidate) => candidate.id === stored.id);
    if (index >= 0) {
      this.data.items[index] = stored;
    } else {
      this.data.items.push(stored);
    }
    await this.save();
    return structuredClone(stored);
  }

  async remove(kind, key) {
    const id = retryItemId(kind, key);
    const before = this.data.items.length;
    this.data.items = this.data.items.filter((item) => item.id !== id);
    if (this.data.items.length !== before) {
      await this.save();
    }
    return before !== this.data.items.length;
  }

  async flush() {
    await this.writer.flush();
  }

  async save() {
    this.data.updatedAt = new Date().toISOString();
    await this.writer.write(this.data);
  }
}

export function retryItemId(kind, key) {
  return `${String(kind || '').toLowerCase()}|${String(key || '')}`;
}

function serializableRetryItem(item = {}) {
  const kind = String(item.kind || '').toLowerCase();
  const key = String(item.key || '');
  const { timer: _timer, ...serializable } = item;
  return {
    ...structuredClone(serializable),
    id: retryItemId(kind, key),
    kind,
    key
  };
}

function validRetryItem(item = {}) {
  const kind = String(item.kind || '').toLowerCase();
  return (kind === 'opening' || kind === 'close')
    && Boolean(item.key)
    && Boolean(item.signal)
    && Boolean(item.executionMode)
    && Boolean(item.expiresAt);
}
