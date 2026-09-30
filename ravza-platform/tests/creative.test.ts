import assert from 'node:assert/strict';
import test from 'node:test';

import { makeCreativeJobKey, reviewCreativeInput, validateBrief } from '../packages/creative-orchestrator/src/index.ts';

void test('DLP rejects passenger-like sensitive content', () => {
  const decision = reviewCreativeInput('Pasaport AB123456, e-posta kisi@example.com ve QR görselini kullan');
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.deepEqual(decision.reasons.sort(), ['email', 'passport', 'qr']);
});

void test('safe abstract brand brief passes DLP', () => {
  assert.deepEqual(reviewCreativeInput('Gece yeşili zeminde soyut takvim ritmi'), { allowed: true });
});

void test('brief validation and job key are deterministic', () => {
  const errors = validateBrief({ briefVersion: '1.0', purpose: 'B2B operasyon', mustAvoid: ['QR'], textPolicy: 'no_baked_text', variantCount: 3 });
  assert.deepEqual(errors, []);
  assert.equal(makeCreativeJobKey('brief-1', 'abc'), 'brief-1:abc');
});
