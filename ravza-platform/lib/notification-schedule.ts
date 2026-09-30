import {
  getNotification,
  notificationCatalog,
  type NotificationChannel,
  type NotificationDefinition,
  type NotificationKey,
} from './notification-catalog.ts';
import { isValidIsoDate } from './date-validation.ts';

/**
 * Bir rezervasyondan hangi bildirimlerin, hangi anda çıkacağını hesaplar.
 *
 * Saf fonksiyondur: veritabanına bakmaz, "şimdi"yi kendisi okumaz. Zaman hep
 * dışarıdan verilir, böylece davranışı testte tam olarak sabitlenebilir.
 */

/** Türkiye saati sabittir (UTC+3, yaz saati uygulaması yok). */
const TURKEY_OFFSET_HOURS = 3;

export type ScheduleOrder = {
  id: string;
  status: 'awaiting_payment' | 'payment_pending' | 'confirmed' | 'cancelled';
  createdAt: number;
  departureDate: string;
  returnDate: string;
  ravzaVisitDate: string;
  /** Yolcu bilgileri eksikse 14 günlük uyarı anlam kazanır. */
  hasMissingPassengerData: boolean;
  /** Pazarlama sayılan bildirimler yalnız onay verenlere gider. */
  marketingOptIn: boolean;
};

export type PlannedNotification = {
  orderId: string;
  key: NotificationKey;
  channels: NotificationChannel[];
  /** Gönderilebilir hale geleceği an (epoch ms). */
  sendAfter: number;
  /** Aynı bildirimin iki kez sıraya girmesini engelleyen anahtar. */
  dedupeKey: string;
};

/**
 * Türkiye saatiyle verilen gün ve saati epoch ms'ye çevirir.
 * `2026-04-10` + 10 → 2026-04-10 10:00 (UTC+3) → 07:00 UTC.
 */
function turkeyTime(isoDate: string, hour: number): number | null {
  if (!isValidIsoDate(isoDate)) return null;
  return Date.parse(`${isoDate}T00:00:00Z`) + (hour - TURKEY_OFFSET_HOURS) * 3_600_000;
}

const DAY_MS = 86_400_000;

function resolveAnchorDate(
  order: ScheduleOrder,
  anchor: 'departureDate' | 'returnDate' | 'ravzaVisitDate',
): string {
  return order[anchor];
}

/** Tek bir tanımın bu sipariş için çıkacağı anı hesaplar; uygun değilse null. */
export function plannedTime(
  definition: NotificationDefinition,
  order: ScheduleOrder,
): number | null {
  const { timing } = definition;
  if (timing.kind === 'immediate') return order.createdAt;
  if (timing.kind === 'afterCreate') {
    return order.createdAt + timing.minutes * 60_000;
  }

  const base = turkeyTime(resolveAnchorDate(order, timing.anchor), timing.hour);
  if (base === null) return null;

  return timing.kind === 'beforeDate'
    ? base - timing.days * DAY_MS
    : base + timing.days * DAY_MS;
}

/** Bu bildirimin bu siparişe uygun olup olmadığı — durum ve içerik kuralları. */
export function appliesTo(
  definition: NotificationDefinition,
  order: ScheduleOrder,
): boolean {
  if (order.status === 'cancelled') return false;
  if (definition.audience !== 'customer') return false;
  if (
    definition.onlyStatuses &&
    !definition.onlyStatuses.includes(order.status)
  ) {
    return false;
  }
  // Pazarlama bildirimi yalnız açık onayla gider.
  if (!definition.transactional && !order.marketingOptIn) return false;
  // Yolcu bilgisi tamsa "eksik bilgi" uyarısını hiç kurmayız.
  if (
    definition.key === 'passenger_data_missing_14d' &&
    !order.hasMissingPassengerData
  ) {
    return false;
  }
  return true;
}

/**
 * Siparişin tüm takvimini üretir.
 *
 * `now` verildiğinde geçmişte kalmış anlar elenir: geç kurulan bir takvim,
 * müşteriye "kalkışa 30 gün kaldı" mesajını kalkıştan sonra göndermez.
 */
export function planNotifications(
  order: ScheduleOrder,
  now: number,
): PlannedNotification[] {
  const planned: PlannedNotification[] = [];

  for (const definition of notificationCatalog) {
    if (!appliesTo(definition, order)) continue;
    const sendAfter = plannedTime(definition, order);
    if (sendAfter === null) continue;
    // Anında gidenler hariç, zamanı geçmiş bildirim kurulmaz.
    if (definition.timing.kind !== 'immediate' && sendAfter < now) continue;

    planned.push({
      orderId: order.id,
      key: definition.key,
      channels: [...definition.channels],
      sendAfter: Math.max(sendAfter, now),
      dedupeKey: `${order.id}:${definition.key}`,
    });
  }

  return planned.sort((left, right) => left.sendAfter - right.sendAfter);
}

/**
 * Sipariş durumu değiştiğinde artık anlamsız kalan bildirimlerin anahtarları.
 * Ödeme geldiğinde ödeme hatırlatmaları, iptalde her şey iptal edilir.
 */
export function obsoleteKeysAfterStatusChange(
  status: ScheduleOrder['status'],
): NotificationKey[] {
  if (status === 'cancelled') {
    return notificationCatalog
      .filter((definition) => definition.audience === 'customer')
      .map((definition) => definition.key);
  }
  if (status === 'confirmed' || status === 'payment_pending') {
    return [
      'payment_reminder_1h',
      'payment_reminder_24h',
      'payment_final_notice',
    ];
  }
  return [];
}

/** Panelde takvimi okunur biçimde göstermek için tek satırlık zaman özeti. */
export function describeTiming(key: NotificationKey): string {
  const { timing } = getNotification(key);
  switch (timing.kind) {
    case 'immediate':
      return 'Olay anında';
    case 'afterCreate': {
      const hours = timing.minutes / 60;
      return hours >= 24
        ? `Talepten ${Math.round(hours / 24)} gün sonra`
        : `Talepten ${Math.round(hours)} saat sonra`;
    }
    case 'beforeDate':
      return `${anchorLabel(timing.anchor)} ${timing.days} gün önce, ${String(timing.hour).padStart(2, '0')}:00`;
    case 'afterDate':
      return `${anchorLabel(timing.anchor)} ${timing.days} gün sonra, ${String(timing.hour).padStart(2, '0')}:00`;
  }
}

function anchorLabel(anchor: 'departureDate' | 'returnDate' | 'ravzaVisitDate') {
  if (anchor === 'departureDate') return 'Kalkıştan';
  if (anchor === 'returnDate') return 'Dönüşten';
  return 'Ravza ziyaretinden';
}
