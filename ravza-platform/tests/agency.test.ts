import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseAgencyApplication,
  parseAgencyPurchase,
  parseCreditRequest,
  passwordProblem,
} from '../lib/agency-validation.ts';

const valid = {
  companyName: 'Örnek Turizm Ltd. Şti.',
  taxOffice: 'Kadıköy',
  taxNumber: '1234567890',
  tursabNumber: 'A-1234',
  address: 'Örnek Mah. Deneme Sok. No:1 Kadıköy',
  city: 'İstanbul',
  contactName: 'Ayşe Yılmaz',
  contactPhone: '0555 111 22 33',
  contactEmail: 'Ayse@Ornek.com',
  password: 'GucluSifre2026',
  termsAccepted: true,
  disclaimerAccepted: true,
  initialCredits: '500',
};

void test('geçerli acente başvurusu normalleştirilir', () => {
  const result = parseAgencyApplication(valid);
  assert.ok(result.ok);
  assert.equal(result.value.contactPhone, '+905551112233');
  assert.equal(result.value.contactEmail, 'ayse@ornek.com');
  assert.equal(result.value.initialCredits, 500);
});

void test('eksik veya hatalı başvuru alanları reddedilir', () => {
  assert.equal(parseAgencyApplication({ ...valid, taxNumber: '12' }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, contactEmail: 'yok' }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, termsAccepted: false }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, disclaimerAccepted: false }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, disclaimerAccepted: undefined }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, initialCredits: -5 }).ok, false);
  assert.equal(parseAgencyApplication({ ...valid, password: 'kisa' }).ok, false);
  assert.equal(passwordProblem('sadeceharfharf'), 'Şifre en az bir harf ve bir rakam içermelidir.');
});

void test('kontör talebi ve randevu girişi doğrulanır', () => {
  assert.deepEqual(parseCreditRequest({ quantity: '250', note: ' acil ' }), { ok: true, value: { quantity: 250, note: 'acil' } });
  assert.equal(parseCreditRequest({ quantity: 0 }).ok, false);
  const purchase = parseAgencyPurchase(
    { groupName: 'Ekim kafilesi', dateKey: '2026-10-05', female: { timeSlot: '08:00', count: 3 }, male: { timeSlot: '', count: 0 } },
    '2026-09-26',
  );
  assert.ok(purchase.ok);
  assert.deepEqual(purchase.value.female, { timeSlot: '08:00', count: 3 });
  assert.equal(purchase.value.male, null);
  assert.equal(parseAgencyPurchase({ dateKey: '2026-09-01', female: { timeSlot: '08:00', count: 1 } }, '2026-09-26').ok, false);
  assert.equal(parseAgencyPurchase({ dateKey: '2026-10-05', female: { timeSlot: '', count: 2 } }, '2026-09-26').ok, false);
  assert.equal(parseAgencyPurchase({ dateKey: '2026-10-05' }, '2026-09-26').ok, false);
});
