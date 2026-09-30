import assert from 'node:assert/strict';
import test from 'node:test';

import { computeStats, periodRange } from '../lib/quote-stats.ts';

// 2026-09-25 Cuma 14:30 İstanbul = 11:30 UTC
const NOW = Date.UTC(2026, 8, 25, 11, 30);
const ist = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m, d, h, min) - 3 * 3600_000;

void test('gün dönemi İstanbul gece yarısından başlar, 24 saatlik dilim üretir', () => {
  const range = periodRange('gun', NOW);
  assert.equal(range.start, ist(2026, 8, 25));
  assert.equal(range.buckets.length, 24);
  assert.equal(range.previousEnd - range.previousStart, NOW - range.start);
});

void test('hafta pazartesi başlar; ay ve yıl takvime göre dilimlenir', () => {
  assert.equal(periodRange('hafta', NOW).start, ist(2026, 8, 21));
  assert.equal(periodRange('ay', NOW).buckets.length, 30);
  const year = periodRange('yil', NOW);
  assert.equal(year.start, ist(2026, 0, 1));
  assert.equal(year.previousStart, ist(2025, 0, 1));
  assert.equal(year.buckets.length, 12);
});

void test('dönem değerleri ve önceki dönemin aynı uzunluktaki başıyla karşılaştırma', () => {
  const q = (createdAt: number, status: string, f: number, m: number) => ({
    createdAt, status, personCount: f + m, femaleCount: f, maleCount: m,
  });
  const quotes = [
    q(ist(2026, 8, 25, 9), 'new', 1, 1),
    q(ist(2026, 8, 25, 13), 'qr_ready', 0, 3),
    q(ist(2026, 8, 25, 23), 'new', 1, 0), // gelecekte: sayılmaz
    q(ist(2026, 8, 24, 10), 'confirmed', 2, 0), // dün, aynı saatten önce
    q(ist(2026, 8, 24, 20), 'new', 1, 0), // dün, aynı saatten sonra: karşılaştırmaya girmez
  ];
  const events = [
    { toStatus: 'qr_ready', createdAt: ist(2026, 8, 25, 14) },
    { toStatus: 'confirmed', createdAt: ist(2026, 8, 24, 11) },
  ];
  const stats = computeStats('gun', quotes, events, NOW);
  assert.deepEqual(stats.requests, { value: 2, previous: 1 });
  assert.deepEqual(stats.qrReady, { value: 1, previous: 0 });
  assert.deepEqual(stats.confirmed, { value: 0, previous: 1 });
  assert.equal(stats.visitors.value, 5);
  assert.equal(stats.visitors.female, 1);
  assert.equal(stats.series[9].value, 1);
  assert.equal(stats.series[13].value, 1);
  assert.equal(stats.series[20].future, true);
  assert.equal(stats.statusMix.find((item) => item.key === 'qr')?.value, 1);
});
