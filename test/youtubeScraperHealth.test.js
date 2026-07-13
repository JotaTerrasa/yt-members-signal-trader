import test from 'node:test';
import assert from 'node:assert/strict';
import { YouTubePostsScraper } from '../src/youtubeScraper.js';

test('agrupa lecturas vacias, propone recuperacion y registra cuando YouTube vuelve', () => {
  const scraper = new YouTubePostsScraper({ profileDir: 'unused-in-test' });
  const logs = [];
  const startedAt = Date.parse('2026-07-13T08:00:00.000Z');
  scraper.on('log', (entry) => logs.push(entry));

  scraper.recordYouTubeRead(0, { now: startedAt });
  scraper.recordYouTubeRead(0, { now: startedAt + 30_000 });
  scraper.recordYouTubeRead(0, { now: startedAt + 60_000 });

  assert.equal(scraper.diagnostics.consecutiveEmptyReads, 3);
  assert.equal(scraper.shouldRecoverYouTubePage({ now: startedAt + 60_000 }), true);
  assert.equal(logs.filter((entry) => entry.level === 'warn').length, 1);

  scraper.youtubeLastRecoveryAt = startedAt + 60_000;
  assert.equal(scraper.shouldRecoverYouTubePage({ now: startedAt + 2 * 60_000 }), false);
  assert.equal(scraper.shouldRecoverYouTubePage({ now: startedAt + 7 * 60_000 }), true);

  scraper.recordYouTubeRead(8, { now: startedAt + 8 * 60_000 });

  assert.equal(scraper.diagnostics.consecutiveEmptyReads, 0);
  assert.equal(scraper.diagnostics.lastNonEmptyAt, '2026-07-13T08:08:00.000Z');
  assert.match(logs.at(-1).message, /YouTube recuperado tras 3 lecturas vacias/);
});

test('limita el aviso de feed vacio a uno cada treinta minutos', () => {
  const scraper = new YouTubePostsScraper({ profileDir: 'unused-in-test' });
  const logs = [];
  const startedAt = Date.parse('2026-07-13T08:00:00.000Z');
  scraper.on('log', (entry) => logs.push(entry));

  scraper.recordYouTubeRead(0, { now: startedAt });
  scraper.recordYouTubeRead(0, { now: startedAt + 29 * 60_000 });
  scraper.recordYouTubeRead(0, { now: startedAt + 30 * 60_000 });

  assert.equal(logs.length, 2);
  assert.match(logs[0].message, /lectura 1/);
  assert.match(logs[1].message, /lectura 3/);
});
