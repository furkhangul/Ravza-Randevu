import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMailtoUrl,
  buildWhatsappMessage,
  buildWhatsappUrl,
  canTransition,
  generateQuoteCode,
  isQuoteCode,
  nextStatuses,
  normalizePhone,
  parseQuoteRequestInput,
  phoneLastFour,
  pipelineIndex,
  sanitizeNote,
  type QuoteRequestInput,
} from '../lib/quote-request.ts';
import {
  canPublishAppointmentPackage,
  matchPackageForPersonCount,
  packageAdvantagePercent,
  packageTotalMinor,
} from '../lib/appointment-packages.ts';
import {
  averageRating,
  maskDisplayName,
  parseFeedbackInput,
  ratingDistribution,
} from '../lib/feedback.ts';

const referenceNow = new Date('2026-09-20T09:00:00Z');

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    service: 'rawdah',
    packageCode: 'group',
    personCount: 5,
    femaleCount: 2,
    maleCount: 3,
    dateFrom: '2026-10-01',
    dateTo: '2026-10-05',
    flexible: true,
    timePreference: 'morning',
    fullName: 'Ahmet Yılmaz',
    phone: '0532 111 22 33',
    email: 'ornek@example.com',
    note: 'Tekerlekli sandalye gerekiyor.',
    locale: 'tr',
    marketingConsent: false,
    ...overrides,
  };
}

void test('talep kodu beklenen biçimde ve karışan harfler olmadan üretilir', () => {
  // Her bayt farklı bir alfabe konumuna düşsün diye sabit dizi verilir.
  const code = generateQuoteCode(
    referenceNow,
    () => new Uint8Array([0, 1, 2, 3]),
  );
  assert.equal(code, 'TALEP-20260920-2345');
  assert.ok(isQuoteCode(code));
  assert.ok(!/[01IOLU]/.test(code.split('-')[2]));
});

void test('talep kodu doğrulaması bozuk kodları reddeder', () => {
  assert.ok(!isQuoteCode('TALEP-2026092-2345'));
  assert.ok(!isQuoteCode('TALEP-20260920-0O1I'));
  assert.ok(!isQuoteCode('BASKA-20260920-2345'));
});

void test('telefon numarası E.164 biçimine getirilir', () => {
  assert.equal(normalizePhone('0532 111 22 33'), '+905321112233');
  assert.equal(normalizePhone('532 111 22 33'), '+905321112233');
  assert.equal(normalizePhone('+90 532 111 22 33'), '+905321112233');
  assert.equal(normalizePhone('0090 532 111 22 33'), '+905321112233');
  assert.equal(normalizePhone('+966 55 123 4567'), '+966551234567');
  assert.equal(phoneLastFour('+905321112233'), '2233');
});

void test('geçersiz telefon numaraları reddedilir', () => {
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone('+1234567890123456789'), null);
});

void test('cinsiyet dağılımı toplam kişi sayısıyla uyuşmalıdır', () => {
  const result = parseQuoteRequestInput(
    validBody({ femaleCount: 1, maleCount: 1 }),
    referenceNow,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.field, 'femaleCount');
});

void test('geçmiş tarih ve aşırı uzun aralık reddedilir', () => {
  const past = parseQuoteRequestInput(
    validBody({ dateFrom: '2026-09-01', dateTo: '2026-09-10' }),
    referenceNow,
  );
  assert.equal(past.ok, false);

  const tooLong = parseQuoteRequestInput(
    validBody({ dateFrom: '2026-10-01', dateTo: '2026-12-31' }),
    referenceNow,
  );
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.field, 'dateTo');
});

void test('geçerli girdi normalize edilmiş değerlerle döner', () => {
  const result = parseQuoteRequestInput(validBody(), referenceNow);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.phone, '+905321112233');
  assert.equal(result.value.packageCode, 'group');
  assert.equal(result.value.email, 'ornek@example.com');
  assert.equal(result.value.marketingConsent, false);
});

void test('paket kodu verilmezse kişi sayısına göre eşleşir', () => {
  const result = parseQuoteRequestInput(
    validBody({ packageCode: 'gecersiz', personCount: 12, femaleCount: 6, maleCount: 6 }),
    referenceNow,
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.packageCode, 'kafile');
});

void test('not alanı işaretlemeden arındırılır ve kısaltılır', () => {
  assert.equal(sanitizeNote('<b>merhaba</b>'), '&lt;b&gt;merhaba&lt;/b&gt;');
  assert.equal(sanitizeNote('a'.repeat(400)).length, 300);
});

void test('kişi sayısı doğru pakete eşlenir', () => {
  assert.equal(matchPackageForPersonCount(1), 'solo');
  assert.equal(matchPackageForPersonCount(2), 'solo');
  assert.equal(matchPackageForPersonCount(3), 'family');
  assert.equal(matchPackageForPersonCount(7), 'group');
  assert.equal(matchPackageForPersonCount(10), 'kafile');
  assert.equal(matchPackageForPersonCount(25), 'agency');
  assert.equal(matchPackageForPersonCount(40), 'custom');
  assert.equal(matchPackageForPersonCount(0), 'solo');
});

void test('fiyat ve avantaj hesabı fiyat yokken uydurma değer üretmez', () => {
  assert.equal(
    packageTotalMinor({ pricePerPersonMinor: 5000, personCount: 5 }),
    25_000,
  );
  assert.equal(
    packageTotalMinor({ pricePerPersonMinor: null, personCount: 5 }),
    null,
  );
  assert.equal(packageAdvantagePercent(4500, 5000), 10);
  assert.equal(packageAdvantagePercent(5000, 5000), null);
  assert.equal(packageAdvantagePercent(null, 5000), null);
  assert.equal(packageAdvantagePercent(4500, null), null);
});

void test('eksik kapsamlı paket yayımlanamaz', () => {
  const name = { tr: 'Grup Paketi', en: 'Group', ar: 'مجموعة' };
  assert.equal(
    canPublishAppointmentPackage({
      name,
      personCount: 5,
      included: [name, name, name],
    }),
    true,
  );
  assert.equal(
    canPublishAppointmentPackage({ name, personCount: 5, included: [name] }),
    false,
  );
});

void test('durum makinesi yalnız tanımlı geçişlere izin verir', () => {
  assert.ok(canTransition('new', 'contacted'));
  assert.ok(canTransition('qr_ready', 'delivered'));
  assert.ok(!canTransition('new', 'delivered'));
  assert.ok(!canTransition('closed', 'new'));
  assert.ok(!canTransition('delivered', 'cancelled'));
  assert.deepEqual(nextStatuses('closed'), []);
  assert.equal(pipelineIndex('confirmed'), 3);
  assert.equal(pipelineIndex('cancelled'), -1);
});

void test('WhatsApp mesajı tüm alanları taşır ve URL güvenli kaçışlanır', () => {
  const input: QuoteRequestInput = {
    service: 'rawdah',
    packageCode: 'group',
    personCount: 5,
    femaleCount: 2,
    maleCount: 3,
    dateFrom: '2026-10-01',
    dateTo: '2026-10-05',
    flexible: true,
    timePreference: 'morning',
    fullName: 'Ahmet Yılmaz',
    phone: '+905321112233',
    email: null,
    note: 'Yaşlı ziyaretçi var.',
    locale: 'tr',
    marketingConsent: false,
  };
  const message = buildWhatsappMessage({
    ...input,
    code: 'TALEP-20260920-2345',
    packageName: 'Grup Paketi',
    brandName: 'Ravza Randevu',
  });
  assert.ok(message.includes('TALEP-20260920-2345'));
  assert.ok(message.includes('Grup Paketi (5 kişi)'));
  assert.ok(message.includes('2 kadın, 3 erkek'));
  assert.ok(message.includes('tarihlerim esnek'));
  assert.ok(message.includes('Yaşlı ziyaretçi var.'));

  const url = buildWhatsappUrl('+90 532 111 22 33', message);
  assert.ok(url?.startsWith('https://wa.me/905321112233?text='));
  // Satır sonu ve Türkçe karakter kaçışlanmadan URL'e girmemeli.
  assert.ok(!url?.includes('\n'));
  assert.ok(url?.includes('%0A'));
  assert.equal(decodeURIComponent(url!.split('?text=')[1]), message);
});

void test('numara yoksa WhatsApp bağlantısı üretilmez', () => {
  assert.equal(buildWhatsappUrl('', 'merhaba'), null);
  assert.equal(buildWhatsappUrl('123', 'merhaba'), null);
  assert.equal(buildMailtoUrl('', 'TALEP-1', 'x'), null);
  assert.ok(
    buildMailtoUrl('destek@example.com', 'TALEP-1', 'x')?.startsWith(
      'mailto:destek@example.com?subject=',
    ),
  );
});

void test('geri bildirim isim maskeleme seçilen moda uyar', () => {
  assert.equal(maskDisplayName('Ahmet Yılmaz', 'full'), 'Ahmet Yılmaz');
  assert.equal(maskDisplayName('Ahmet Yılmaz', 'initials'), 'A. Y.');
  assert.equal(maskDisplayName('Ahmet Yılmaz', 'anonymous'), 'Anonim ziyaretçi');
  assert.equal(maskDisplayName('  ', 'full'), 'Ziyaretçi');
});

void test('geri bildirim yayın izni olmadan kaydedilmez', () => {
  const missingConsent = parseFeedbackInput({ rating: 5, publishConsent: false });
  assert.equal(missingConsent.ok, false);

  const invalidRating = parseFeedbackInput({ rating: 9, publishConsent: true });
  assert.equal(invalidRating.ok, false);

  const valid = parseFeedbackInput({
    rating: 4,
    body: 'Hızlı dönüş yaptılar.',
    publishConsent: true,
    displayNameMode: 'initials',
  });
  assert.equal(valid.ok, true);
});

void test('puan ortalaması ve dağılımı boş listede uydurma üretmez', () => {
  assert.equal(averageRating([]), null);
  assert.equal(averageRating([5, 4, 4]), 4.3);
  assert.deepEqual(ratingDistribution([5, 5, 3]), {
    1: 0,
    2: 0,
    3: 1,
    4: 0,
    5: 2,
  });
});
