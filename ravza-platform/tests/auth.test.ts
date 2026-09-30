import assert from 'node:assert/strict';
import test from 'node:test';
import { loginReturnPath } from '../lib/login-path.ts';

void test('giriş dönüş adresi dış yönlendirmeleri ve giriş döngülerini reddeder', () => {
  for (const path of ['https://example.com', '//example.com', '/login', '/admin', '/api/auth/customer', '/signin-with-chatgpt', '/%2e%2e/login']) {
    assert.equal(loginReturnPath(path), '/hesabim');
  }
  assert.equal(loginReturnPath('/' + String.fromCharCode(92) + 'example.com'), '/hesabim');
  assert.equal(loginReturnPath('/talep?kod=TALEP-ABC#durum'), '/talep?kod=TALEP-ABC#durum');
});

void test('müşteri girişi operasyon ekranına yönlendirmez', () => {
  for (const path of ['/panel', '/panel/yonetim', '/dashboard/overview', '/super-admin']) {
    assert.equal(loginReturnPath(path), '/hesabim');
  }
  assert.equal(loginReturnPath('/panel/talepler?sekme=kayitlar', true), '/panel/talepler?sekme=kayitlar');
  assert.equal(loginReturnPath('/admin', true), '/panel');
});

import {
  checkPasswordStrength,
  derivePassword,
  hashPassword,
  randomToken,
  sha256Hex,
  timingSafeEqual,
  verifyPassword,
} from '../lib/auth-crypto.ts';
import {
  missingProfileFields,
  requiredProfileFields,
} from '../lib/profile-fields.ts';

void test('aynı parola ve tuz her zaman aynı özeti üretir', async () => {
  const salt = randomToken(16);
  const first = await derivePassword('umre-2026-parola', salt, 1000);
  const second = await derivePassword('umre-2026-parola', salt, 1000);
  assert.equal(first, second);
});

void test('farklı tuz aynı parolada farklı özet üretir', async () => {
  const left = await derivePassword('umre-2026-parola', randomToken(16), 1000);
  const right = await derivePassword('umre-2026-parola', randomToken(16), 1000);
  assert.notEqual(left, right);
});

void test('doğru parola doğrulanır, yanlış parola reddedilir', async () => {
  const stored = await hashPassword('cok-guclu-parola-2026');
  assert.equal(await verifyPassword('cok-guclu-parola-2026', stored), true);
  assert.equal(await verifyPassword('cok-guclu-parola-2027', stored), false);
});

void test('özet düz parolayı içermez', async () => {
  const stored = await hashPassword('gizli-parola-12345');
  assert.equal(stored.hash.includes('gizli'), false);
  assert.equal(stored.hash.length, 64);
  assert.equal(stored.salt.length, 32);
});

void test('rastgele jetonlar tekrarlanmaz', () => {
  const tokens = new Set(Array.from({ length: 200 }, () => randomToken(16)));
  assert.equal(tokens.size, 200);
});

void test('sha256 kararlı ve 64 karakterdir', async () => {
  const digest = await sha256Hex('ravza');
  assert.equal(digest.length, 64);
  assert.equal(digest, await sha256Hex('ravza'));
});

void test('sabit süreli karşılaştırma uzunluk ve içerik farkını yakalar', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
});

void test('parola kuralı kısa ve rakamsız parolaları reddeder', () => {
  assert.deepEqual(checkPasswordStrength('kisa1'), ['too_short']);
  assert.deepEqual(checkPasswordStrength('parolaparola'), ['needs_digit']);
  assert.deepEqual(checkPasswordStrength('123456789012'), ['needs_letter']);
  assert.deepEqual(checkPasswordStrength('umreparolasi2026'), []);
});

void test('profil eksikleri: boş profil tüm zorunlu alanları ister', () => {
  assert.deepEqual(missingProfileFields(null), [...requiredProfileFields]);
});

void test('profil eksikleri: boşluk karakteri dolu sayılmaz', () => {
  const missing = missingProfileFields({
    fullName: 'Ayşe Yılmaz',
    phone: '   ',
    birthDate: '1985-04-11',
    nationality: 'Türkiye',
    residenceCountry: 'Türkiye',
    residenceCity: 'İstanbul',
  });
  assert.deepEqual(missing, ['phone']);
});

void test('profil eksikleri: eksiksiz profil boş liste döner', () => {
  const missing = missingProfileFields({
    fullName: 'Ayşe Yılmaz',
    phone: '+90 555 000 00 00',
    birthDate: '1985-04-11',
    nationality: 'Türkiye',
    residenceCountry: 'Türkiye',
    residenceCity: 'İstanbul',
  });
  assert.deepEqual(missing, []);
});
