import { cancelPending, queueMany, queueNotification } from '@/db/notifications';
import { formatMoneyMinor } from '@/lib/format-money';
import { getLegalProfile } from '@/lib/legal-config';
import {
  obsoleteKeysAfterStatusChange,
  planNotifications,
  type ScheduleOrder,
} from '@/lib/notification-schedule';

/**
 * Uygulamadaki olayları bildirim kuyruğuna bağlayan katman.
 *
 * Buradaki her fonksiyon **sessizce başarısız olur**: bildirim gönderilememesi
 * rezervasyonun oluşmasını engellememelidir. Hata kuyrukta ve panelde görünür,
 * müşterinin işlemini durdurmaz.
 */

export type OrderForNotification = {
  id: string;
  status: ScheduleOrder['status'];
  createdAt: number;
  packageName: string;
  contactEmail: string;
  contactPhone: string;
  customerName: string;
  passengerCount: number;
  amountMinor: number;
  departureDate: string;
  returnDate: string;
  ravzaVisitDate: string;
  hasMissingPassengerData: boolean;
  marketingOptIn: boolean;
};

function appUrl(): string {
  return (process.env.APP_URL ?? '').replace(/\/$/, '');
}

function orderVariables(order: OrderForNotification): Record<string, string> {
  const profile = getLegalProfile();
  return {
    ad: order.customerName || 'Değerli yolcumuz',
    eposta: order.contactEmail,
    telefon: profile.contactPhone || order.contactPhone,
    paket: order.packageName,
    numara: order.id,
    yolcu: String(order.passengerCount),
    gidis: formatDate(order.departureDate),
    donus: formatDate(order.returnDate),
    ravzaTarihi: formatDate(order.ravzaVisitDate),
    tutar: formatMoneyMinor(order.amountMinor, 'USD', 'tr'),
    baglanti: `${appUrl()}/hesabim`,
  };
}

/** `2026-04-10` → `10 Nisan 2026`. Geçersiz değerde olduğu gibi döner. */
export function formatDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${isoDate}T00:00:00Z`));
  } catch {
    return isoDate;
  }
}

/**
 * Yeni rezervasyonun tüm takvimini kurar ve yöneticiye haber verir.
 * Rezervasyon oluştuktan hemen sonra çağrılır.
 */
export async function onOrderCreated(
  order: OrderForNotification,
): Promise<void> {
  const variables = orderVariables(order);
  const now = Date.now();

  const planned = planNotifications(
    {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      departureDate: order.departureDate,
      returnDate: order.returnDate,
      ravzaVisitDate: order.ravzaVisitDate,
      hasMissingPassengerData: order.hasMissingPassengerData,
      marketingOptIn: order.marketingOptIn,
    },
    now,
  );

  try {
    await queueMany(
      planned.map((item) => ({
        key: item.key,
        dedupeKey: item.dedupeKey,
        email: order.contactEmail,
        phone: order.contactPhone,
        recipientName: order.customerName,
        variables,
        sendAfter: new Date(item.sendAfter),
        relatedOrderId: order.id,
      })),
    );

    for (const adminEmail of adminRecipients()) {
      await queueNotification({
        key: 'admin_new_order',
        dedupeKey: `admin_new_order:${order.id}:${adminEmail}`,
        email: adminEmail,
        variables: {
          ...variables,
          baglanti: `${appUrl()}/admin`,
        },
        relatedOrderId: order.id,
      });
    }
  } catch {
    // Bildirim kurulamadı; rezervasyon yine de geçerli.
  }
}

/**
 * Durum değiştiğinde: anlamsız kalan hatırlatmalar iptal edilir, gerekiyorsa
 * yeni bildirim eklenir.
 */
export async function onOrderStatusChanged(
  order: OrderForNotification,
): Promise<void> {
  try {
    await cancelPending(order.id, obsoleteKeysAfterStatusChange(order.status));

    if (order.status === 'confirmed') {
      await queueNotification({
        key: 'payment_confirmed',
        dedupeKey: `${order.id}:payment_confirmed`,
        email: order.contactEmail,
        phone: order.contactPhone,
        recipientName: order.customerName,
        variables: orderVariables(order),
        relatedOrderId: order.id,
      });
    }
  } catch {
    // Durum değişikliği bildirimi başarısız oldu; sipariş durumu doğru.
  }
}

export async function onPaymentFailed(
  order: OrderForNotification,
  reason: string,
): Promise<void> {
  try {
    for (const adminEmail of adminRecipients()) {
      await queueNotification({
        key: 'admin_payment_failed',
        dedupeKey: `admin_payment_failed:${order.id}:${Date.now()}`,
        email: adminEmail,
        variables: {
          ...orderVariables(order),
          hata: reason,
          baglanti: `${appUrl()}/admin`,
        },
        relatedOrderId: order.id,
      });
    }
  } catch {
    // Yönetici bildirimi kurulamadı.
  }
}

/** Yönetim bildirimlerinin gideceği adresler — ortam değişkeninden okunur. */
export function adminRecipients(): string[] {
  const raw = `${process.env.APP_SUPER_ADMIN_EMAILS ?? ''},${process.env.APP_ADMIN_EMAILS ?? ''}`;
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}
