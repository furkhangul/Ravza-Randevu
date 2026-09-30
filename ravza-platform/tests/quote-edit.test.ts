import assert from 'node:assert/strict';
import test from 'node:test';

import { parseQuoteEdit } from '../lib/quote-request.ts';

const current = { femaleCount: 1, maleCount: 1, dateFrom: '2026-10-01', dateTo: '2026-10-03' };

void test('düzenleme yalnız gönderilen alanları değiştirir ve toplamı hesaplar', () => {
  const result = parseQuoteEdit({ maleCount: 3, fullName: '  Ali Veli ' }, current);
  assert.ok(result.ok);
  assert.deepEqual(result.value, { fullName: 'Ali Veli', femaleCount: 1, maleCount: 3, personCount: 4 });
});

void test('geçersiz düzenlemeler reddedilir', () => {
  assert.equal(parseQuoteEdit({ fullName: 'A' }, current).ok, false);
  assert.equal(parseQuoteEdit({ phone: 'abc' }, current).ok, false);
  assert.equal(parseQuoteEdit({ email: 'yok' }, current).ok, false);
  assert.equal(parseQuoteEdit({ femaleCount: 0, maleCount: 0 }, current).ok, false);
  assert.equal(parseQuoteEdit({ dateTo: '2026-09-30' }, current).ok, false);
  assert.equal(parseQuoteEdit({ timePreference: 'öğlen' }, current).ok, false);
  assert.equal(parseQuoteEdit({}, current).ok, false);
});

void test('boş e-posta ve not temizlenir, telefon E.164 biçimine çevrilir', () => {
  const result = parseQuoteEdit({ email: '', note: '  ', phone: '0555 123 45 67' }, current);
  assert.ok(result.ok);
  assert.equal(result.value.email, null);
  assert.equal(result.value.note, null);
  assert.equal(result.value.phone, '+905551234567');
});
