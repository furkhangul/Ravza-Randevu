import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNotification,
  notificationCatalog,
} from '../lib/notification-catalog.ts';
import {
  describeTiming,
  obsoleteKeysAfterStatusChange,
  planNotifications,
  plannedTime,
  type ScheduleOrder,
} from '../lib/notification-schedule.ts';
import { fillTemplate, renderMessage } from '../lib/notification-messages.ts';
import { normalizePhone } from '../lib/delivery-providers.ts';

const baseOrder: ScheduleOrder = {
  id: 'UMR-1',
  status: 'confirmed',
  createdAt: Date.parse('2026-01-10T09:00:00Z'),
  departureDate: '2026-04-10',
  returnDate: '2026-04-24',
  ravzaVisitDate: '2026-04-14',
  hasMissingPassengerData: false,
  marketingOptIn: false,
};

void test('katalogda anahtarlar benzersizdir', () => {
  const keys = notificationCatalog.map((definition) => definition.key);
  assert.equal(new Set(keys).size, keys.length);
});

void test('her bildirimin en az bir kanalı vardır', () => {
  for (const definition of notificationCatalog) {
    assert.ok(definition.channels.length > 0, definition.key);
  }
});

void test('kalkıştan 7 gün önce, Türkiye saatiyle 10:00 hesaplanır', () => {
  const moment = plannedTime(getNotification('trip_summary_7d'), baseOrder);
  // 3 Nisan 2026, 10:00 (UTC+3) = 07:00 UTC
  assert.equal(moment, Date.parse('2026-04-03T07:00:00Z'));
});

void test('dönüşten 2 gün sonra hesaplanır', () => {
  const moment = plannedTime(getNotification('return_feedback'), baseOrder);
  assert.equal(moment, Date.parse('2026-04-26T08:00:00Z'));
});

void test('talepten 24 saat sonra hesaplanır', () => {
  const moment = plannedTime(
    getNotification('payment_reminder_24h'),
    baseOrder,
  );
  assert.equal(moment, Date.parse('2026-01-11T09:00:00Z'));
});

void test('iptal edilmiş siparişe hiçbir bildirim kurulmaz', () => {
  const planned = planNotifications(
    { ...baseOrder, status: 'cancelled' },
    baseOrder.createdAt,
  );
  assert.deepEqual(planned, []);
});

void test('ödeme bekleyen siparişte ödeme hatırlatmaları kurulur', () => {
  const planned = planNotifications(
    { ...baseOrder, status: 'awaiting_payment' },
    baseOrder.createdAt,
  );
  const keys = planned.map((item) => item.key);
  assert.ok(keys.includes('payment_reminder_1h'));
  assert.ok(keys.includes('payment_reminder_24h'));
  assert.ok(keys.includes('payment_final_notice'));
  // Onaylanmamış siparişe seyahat hatırlatması kurulmaz.
  assert.equal(keys.includes('trip_summary_7d'), false);
});

void test('onaylı siparişte ödeme hatırlatması kurulmaz', () => {
  const keys = planNotifications(baseOrder, baseOrder.createdAt).map(
    (item) => item.key,
  );
  assert.equal(keys.includes('payment_reminder_1h'), false);
  assert.ok(keys.includes('documents_due_30d'));
});

void test('yolcu bilgisi tamsa eksik bilgi uyarısı kurulmaz', () => {
  const keys = planNotifications(baseOrder, baseOrder.createdAt).map(
    (item) => item.key,
  );
  assert.equal(keys.includes('passenger_data_missing_14d'), false);

  const withMissing = planNotifications(
    { ...baseOrder, hasMissingPassengerData: true },
    baseOrder.createdAt,
  ).map((item) => item.key);
  assert.ok(withMissing.includes('passenger_data_missing_14d'));
});

void test('pazarlama bildirimi yalnız onay verene kurulur', () => {
  const withoutConsent = planNotifications(baseOrder, baseOrder.createdAt).map(
    (item) => item.key,
  );
  assert.equal(withoutConsent.includes('return_feedback'), false);

  const withConsent = planNotifications(
    { ...baseOrder, marketingOptIn: true },
    baseOrder.createdAt,
  ).map((item) => item.key);
  assert.ok(withConsent.includes('return_feedback'));
});

void test('zamanı geçmiş hatırlatma kurulmaz', () => {
  // Kalkışa 5 gün kala açılan rezervasyonda 30 ve 14 günlük uyarılar düşer.
  const late = Date.parse('2026-04-05T09:00:00Z');
  const keys = planNotifications(
    { ...baseOrder, createdAt: late, hasMissingPassengerData: true },
    late,
  ).map((item) => item.key);
  assert.equal(keys.includes('documents_due_30d'), false);
  assert.equal(keys.includes('passenger_data_missing_14d'), false);
  assert.ok(keys.includes('departure_tomorrow'));
});

void test('takvim zaman sırasına göre döner', () => {
  const planned = planNotifications(
    { ...baseOrder, status: 'awaiting_payment' },
    baseOrder.createdAt,
  );
  const times = planned.map((item) => item.sendAfter);
  assert.deepEqual(times, [...times].sort((left, right) => left - right));
});

void test('dedupe anahtarı sipariş ve bildirim başına benzersizdir', () => {
  const planned = planNotifications(baseOrder, baseOrder.createdAt);
  const keys = planned.map((item) => item.dedupeKey);
  assert.equal(new Set(keys).size, keys.length);
});

void test('ödeme onaylanınca ödeme hatırlatmaları iptal listesine girer', () => {
  assert.deepEqual(obsoleteKeysAfterStatusChange('confirmed'), [
    'payment_reminder_1h',
    'payment_reminder_24h',
    'payment_final_notice',
  ]);
});

void test('iptalde tüm müşteri bildirimleri iptal listesine girer', () => {
  const keys = obsoleteKeysAfterStatusChange('cancelled');
  assert.ok(keys.includes('trip_summary_7d'));
  assert.equal(keys.includes('admin_new_order'), false);
});

void test('yer tutucular doldurulur, karşılığı olmayan boşalır', () => {
  assert.equal(fillTemplate('Merhaba {{ad}}, {{yok}} bitti', { ad: 'Ayşe' }), 'Merhaba Ayşe,  bitti');
});

void test('mesaj metninde doldurulmamış yer tutucu kalmaz', () => {
  const variables = {
    ad: 'Ayşe Yılmaz',
    paket: 'Ramazan Umresi',
    numara: 'UMR-1',
    gidis: '10 Nisan 2026',
    donus: '24 Nisan 2026',
    yolcu: '2',
    baglanti: 'https://ornek.test/hesabim',
    telefon: '+90 555 000 00 00',
  };
  const message = renderMessage('order_received', variables);
  assert.equal(/\{\{\w+\}\}/.test(message.subject), false);
  assert.equal(/\{\{\w+\}\}/.test(message.body), false);
  assert.ok(message.body.includes('Ramazan Umresi'));
});

void test('SMS metni yazılmamış bildirimde boş döner', () => {
  const message = renderMessage('password_reset', {
    ad: 'Ayşe',
    baglanti: 'https://ornek.test/sifre-yenile?token=abc',
  });
  assert.equal(message.sms, '');
  assert.ok(message.body.includes('60 dakika'));
});

void test('SMS metinleri 160 karaktere sığar', () => {
  const variables = {
    ad: 'Ayşe',
    paket: 'Ramazan Umresi',
    numara: 'UMR-12345',
    baglanti: 'https://ravzarandevu.com/h',
    telefon: '+905550000000',
    saat: '14:30',
    kapi: 'Bab-üs Selam',
  };
  for (const definition of notificationCatalog) {
    const { sms } = renderMessage(definition.key, variables);
    if (!sms) continue;
    assert.ok(sms.length <= 160, `${definition.key}: ${sms.length} karakter`);
  }
});

void test('telefon numarası operatör biçimine çevrilir', () => {
  assert.equal(normalizePhone('0555 123 45 67'), '905551234567');
  assert.equal(normalizePhone('+90 555 123 45 67'), '905551234567');
  assert.equal(normalizePhone('5551234567'), '905551234567');
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone(''), null);
});

void test('zaman açıklaması okunabilir', () => {
  assert.equal(describeTiming('order_received'), 'Olay anında');
  assert.equal(describeTiming('payment_reminder_1h'), 'Talepten 1 saat sonra');
  assert.equal(
    describeTiming('trip_summary_7d'),
    'Kalkıştan 7 gün önce, 10:00',
  );
});
