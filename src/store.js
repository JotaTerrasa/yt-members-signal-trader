import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { QueuedJsonWriter } from './queuedJsonWriter.js';

export class PostStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.writer = new QueuedJsonWriter(filePath);
    this.data = {
      version: 1,
      updatedAt: null,
      posts: []
    };
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.posts)) {
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
    await this.writer.write(this.data);
  }

  async flush() {
    await this.writer.flush();
  }

  list() {
    return [...this.data.posts].sort(comparePostsNewestFirst);
  }

  stats() {
    const posts = this.data.posts;
    const newest = posts.reduce((latest, post) => {
      const seen = Date.parse(post.firstSeenAt || 0);
      return Number.isNaN(seen) || seen <= latest ? latest : seen;
    }, 0);

    return {
      totalPosts: posts.length,
      updatedAt: this.data.updatedAt,
      newestSeenAt: newest ? new Date(newest).toISOString() : null
    };
  }

  async clear() {
    this.data.posts = [];
    await this.save();
  }

  async upsertMany(posts, meta = {}) {
    const now = new Date().toISOString();
    const byId = new Map(this.data.posts.map((post) => [post.id, post]));
    const inserted = [];
    const updated = [];
    const edited = [];

    for (const post of posts) {
      if (!post?.id) {
        continue;
      }

      const normalized = {
        ...post,
        channelUrl: meta.channelUrl || post.channelUrl || null,
        scrapePhase: meta.phase || post.scrapePhase || null,
        lastSeenAt: now
      };

      const existing = byId.get(normalized.id);
      if (!existing) {
        const next = {
          ...normalized,
          firstSeenAt: now,
          seenCount: 1
        };
        this.data.posts.push(next);
        byId.set(next.id, next);
        inserted.push(next);
        continue;
      }

      const previousText = String(existing.text || '');
      const merged = {
        ...existing,
        ...normalized,
        firstSeenAt: existing.firstSeenAt || now,
        seenCount: (existing.seenCount || 1) + 1
      };

      const changed = JSON.stringify(stripVolatile(existing)) !== JSON.stringify(stripVolatile(merged));
      Object.assign(existing, merged);
      if (changed) {
        updated.push(existing);
      }
      if (previousText !== String(existing.text || '')) {
        edited.push({
          post: existing,
          previousText,
          currentText: String(existing.text || '')
        });
      }
    }

    if (inserted.length || updated.length) {
      await this.save();
    }

    return {
      inserted,
      updated,
      edited,
      total: this.data.posts.length
    };
  }

  toJson() {
    return JSON.stringify(this.data, null, 2);
  }

  toCsv() {
    const fields = [
      'id',
      'source',
      'url',
      'channelName',
      'author',
      'publishedText',
      'text',
      'likeText',
      'commentText',
      'isMembersOnly',
      'images',
      'links',
      'firstSeenAt',
      'lastSeenAt'
    ];

    const rows = [fields.join(',')];
    for (const post of this.list()) {
      rows.push(fields.map((field) => csvCell(formatCsvValue(post[field]))).join(','));
    }
    return `${rows.join('\n')}\n`;
  }
}

function stripVolatile(post) {
  const {
    lastSeenAt,
    seenCount,
    scrapePhase,
    ...stable
  } = post;
  return stable;
}

function formatCsvValue(value) {
  if (Array.isArray(value)) {
    return value.join(' | ');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value ?? '';
}

function csvCell(value) {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function comparePostsNewestFirst(a, b) {
  const aAge = relativeAgeMs(a.publishedText);
  const bAge = relativeAgeMs(b.publishedText);

  if (Number.isFinite(aAge) && Number.isFinite(bAge) && aAge !== bAge) {
    return aAge - bAge;
  }

  if (Number.isFinite(aAge) !== Number.isFinite(bAge)) {
    return Number.isFinite(aAge) ? -1 : 1;
  }

  const aSeen = Date.parse(a.firstSeenAt || 0);
  const bSeen = Date.parse(b.firstSeenAt || 0);
  return bSeen - aSeen;
}

function relativeAgeMs(value) {
  const text = normalizeRelativeText(value);
  if (!text) {
    return Number.POSITIVE_INFINITY;
  }

  if (/^(ahora|just now|now)$/.test(text)) {
    return 0;
  }

  if (text === 'ayer' || text === 'yesterday') {
    return unitMs.day;
  }

  const spanish = text.match(/hace\s+(un|una|uno|\d+)\s+([a-z]+)/);
  const english = text.match(/(a|an|one|\d+)\s+([a-z]+)\s+ago/);
  const match = spanish || english;
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const amount = parseAmount(match[1]);
  const unit = unitFromText(match[2]);
  return amount * unit;
}

function normalizeRelativeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(value) {
  return /^(un|una|uno|a|an|one)$/.test(value) ? 1 : Number(value);
}

function unitFromText(value) {
  const unit = value.toLowerCase();
  if (/^seg|^sec|^second/.test(unit)) {
    return unitMs.second;
  }
  if (/^min|^minute/.test(unit)) {
    return unitMs.minute;
  }
  if (/^hora|^hour/.test(unit)) {
    return unitMs.hour;
  }
  if (/^dia|^day/.test(unit)) {
    return unitMs.day;
  }
  if (/^semana|^week/.test(unit)) {
    return unitMs.week;
  }
  if (/^mes|^month/.test(unit)) {
    return unitMs.month;
  }
  if (/^ano|^year/.test(unit)) {
    return unitMs.year;
  }
  return Number.POSITIVE_INFINITY;
}

const unitMs = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};
