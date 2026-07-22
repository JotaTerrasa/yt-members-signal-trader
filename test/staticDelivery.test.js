import assert from 'node:assert/strict';
import test from 'node:test';
import { etagMatches, isCompressibleStatic, selectStaticEncoding, staticEtag } from '../src/staticDelivery.js';

test('prioriza Brotli cuando el cliente admite ambas codificaciones', () => {
  assert.equal(selectStaticEncoding('gzip, deflate, br', { extension: '.js', size: 5000 }), 'br');
});

test('respeta las preferencias q y las exclusiones explícitas', () => {
  assert.equal(selectStaticEncoding('br;q=0.2, gzip;q=0.8', { extension: '.css', size: 5000 }), 'gzip');
  assert.equal(selectStaticEncoding('br;q=0, gzip;q=0', { extension: '.js', size: 5000 }), '');
  assert.equal(selectStaticEncoding('*;q=0.5, br;q=0', { extension: '.json', size: 5000 }), 'gzip');
});

test('no comprime archivos pequeños ni formatos ya comprimidos', () => {
  assert.equal(isCompressibleStatic('.js', 1023), false);
  assert.equal(isCompressibleStatic('.js', 1024), true);
  assert.equal(selectStaticEncoding('br', { extension: '.png', size: 5000 }), '');
});

test('genera ETag débiles estables y reconoce listas condicionales', () => {
  const etag = staticEtag({ size: 4558696, mtimeMs: 1784741000123 });
  assert.equal(etag, staticEtag({ size: 4558696, mtimeMs: 1784741000123 }));
  assert.equal(etagMatches(`"otro", ${etag}`, etag), true);
  assert.equal(etagMatches('*', etag), true);
  assert.equal(etagMatches('"otro"', etag), false);
});
