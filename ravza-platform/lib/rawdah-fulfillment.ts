import {
  claimBooking,
  listBookings,
  updateBooking,
  type BookingGender,
  type RawdahBooking,
} from '@/db/rawdah-bookings';
import { updateQuoteStatus, type QuoteRequestRecord } from '@/db/quotes';
import { notifyQuoteQrReady } from '@/lib/notify';
import { canTransition, type QuoteStatus } from '@/lib/quote-request';
import {
  createLiveRawdahProviderFromEnv,
  type QrGroup,
} from '@/packages/provider-rawdah/src';

/**
 * Talep onayından sonra RawdahBooking'den randevu satın alıp QR paylaşım
 * bağlantısı üretir.
 *
 * Akış (sağlayıcının OpenAPI belgesine göre):
 * 1. PurchaseAppointments: havuzdaki onaylı randevular hesaba aktarılır,
 *    kişi başı 1 kontör düşer. İstek idempotent DEĞİLDİR; belirsiz sonuçta
 *    asla otomatik tekrar yapılmaz, durum `unknown` olur.
 * 2. CreatePrintShareLink: satın alınan yolcular için herkese açık
 *    `https://rwdh.link/{kod}` bağlantısı oluşur. Müşteri kapıda bu
 *    sayfadaki QR'ı okutur.
 * Belirsiz durumlar `syncQuoteBookings` ile sağlayıcıdaki QR grupları
 * okunarak (yazma yapmadan) uzlaştırılır.
 */

/** QR grup yanıtındaki cinsiyet eşlemesi (belgelenmiş): Male=8, Female=9. */
const GENDER_ID: Record<BookingGender, 8 | 9> = { male: 8, female: 9 };

/** Satın almaya izin verilen talep durumları: fiyat ve ödeme netleşmiş olmalı. */
export const PURCHASABLE_STATUSES: QuoteStatus[] = ['confirmed', 'scheduled'];

export function fulfillmentEnabled() {
  return (
    process.env.RAWDAH_LIVE_ENABLED === 'true' &&
    process.env.RAWDAH_WRITE_ENABLED === 'true' &&
    process.env.RAWDAH_SHARE_LINK_ENABLED === 'true'
  );
}

/** Talebin satın alma gerektiren cinsiyetleri ve kişi sayıları. */
export function neededBookings(record: QuoteRequestRecord) {
  return (
    [
      ['female', record.femaleCount],
      ['male', record.maleCount],
    ] as const
  ).filter(([, count]) => count > 0) as Array<[BookingGender, number]>;
}

function sameTime(groupTime: string, timeSlot: string) {
  return groupTime.slice(0, 5) === timeSlot.slice(0, 5);
}

function matchingGroups(groups: QrGroup[], booking: RawdahBooking) {
  return groups.filter(
    (group) =>
      group.groupCode === booking.groupCode &&
      group.genderId === GENDER_ID[booking.gender] &&
      group.dateKey === booking.dateKey &&
      sameTime(group.appointmentTime, booking.timeSlot),
  );
}

function shareUrlFor(code: string) {
  return `https://rwdh.link/${code}`;
}

/**
 * Paylaşım bağlantısı, filtre değerleri QR grup listesinden AYNEN alınarak
 * oluşturulur (belgenin şartı). Sağlayıcı saati aralık olarak tutar
 * ("19:20-19:40"); satın almada gönderilen "19:20" ile filtrelenirse yolcu
 * bulunamaz ve istek reddedilir.
 */
async function shareBooking(booking: RawdahBooking): Promise<RawdahBooking['status']> {
  const provider = createLiveRawdahProviderFromEnv();
  let group: QrGroup | undefined;
  try {
    const groups = matchingGroups(await provider.getQrGroups(), booking);
    group = groups.find((item) => item.purchaseId === booking.purchaseId) ?? groups[0];
  } catch (error) {
    await updateBooking(booking.id, {
      error: `groups_error: ${error instanceof Error ? error.message : 'unknown'}`.slice(0, 300),
    });
    return 'purchased';
  }
  if (!group) {
    await updateBooking(booking.id, { error: 'group_not_found' });
    return 'purchased';
  }
  if (group.printGuid) {
    // Bu grup daha önce paylaşılmış: aynı bağlantı kullanılır, yenisi açılmaz.
    await updateBooking(booking.id, {
      status: 'shared',
      shareCode: group.printGuid,
      shareUrl: shareUrlFor(group.printGuid),
      sharedCount: group.totalCount,
      error: null,
    });
    return 'shared';
  }
  const purchaseId = group.purchaseId ? Number(group.purchaseId) : Number.NaN;
  let result;
  try {
    result = await provider.createShareLink({
      date: group.dateKey,
      groupCode: group.groupCode,
      appointmentTime: group.appointmentTime,
      genderId: group.genderId,
      ...(Number.isInteger(purchaseId) && purchaseId > 0 ? { purchaseId } : {}),
      personCount: group.totalCount,
    });
  } catch (error) {
    await updateBooking(booking.id, {
      error: `share_error: ${error instanceof Error ? error.message : 'unknown'}`.slice(0, 300),
    });
    return 'purchased';
  }
  if (result.status === 'completed' && result.url && result.code) {
    await updateBooking(booking.id, {
      status: 'shared',
      shareUrl: result.url,
      shareCode: result.code,
      sharedCount: result.passengerCount ?? null,
      error: null,
    });
    return 'shared';
  }
  // Bağlantı oluşmuş olabilir; tekrar yerine senkron ile QR grubundan okunur.
  await updateBooking(booking.id, { error: `share_${result.status}` });
  return 'purchased';
}

export type PurchaseOutcome =
  | { ok: true; status: RawdahBooking['status'] }
  | { ok: false; error: string };

export async function purchaseForQuote(
  record: QuoteRequestRecord,
  input: { gender: BookingGender; dateKey: string; timeSlot: string },
): Promise<PurchaseOutcome> {
  const needed = neededBookings(record).find(([gender]) => gender === input.gender);
  if (!needed) return { ok: false, error: 'gender_not_in_request' };
  const booking = await claimBooking({
    quoteRequestId: record.id,
    gender: input.gender,
    dateKey: input.dateKey,
    timeSlot: input.timeSlot,
    quantity: needed[1],
    groupCode: record.code,
  });
  if (!booking) return { ok: false, error: 'already_purchased_or_in_progress' };

  const provider = createLiveRawdahProviderFromEnv();
  let result;
  try {
    result = await provider.purchase({
      agencyId: 'ravza',
      idempotencyKey: booking.id,
      dateKey: booking.dateKey,
      timeSlot: booking.timeSlot,
      gender: booking.gender,
      count: booking.quantity,
      groupCode: booking.groupCode,
    });
  } catch (error) {
    // Doğrulama veya giriş hatası: satın alma isteği gönderilmedi.
    await updateBooking(booking.id, {
      status: 'failed',
      error: (error instanceof Error ? error.message : 'purchase_error').slice(0, 300),
    });
    return { ok: false, error: 'purchase_not_sent' };
  }

  if (result.status === 'failed') {
    await updateBooking(booking.id, { status: 'failed', error: 'provider_rejected' });
    return { ok: false, error: 'provider_rejected' };
  }
  if (result.status === 'unknown') {
    await updateBooking(booking.id, { status: 'unknown', error: 'provider_unknown' });
    return { ok: true, status: 'unknown' };
  }

  await updateBooking(booking.id, {
    status: 'purchased',
    purchaseId: result.transactionId,
    balanceAfter: result.remainingBalance ?? null,
    error: null,
  });
  const status = await shareBooking({ ...booking, status: 'purchased', purchaseId: result.transactionId });
  await advanceWhenReady(record);
  return { ok: true, status };
}

/**
 * Sağlayıcıdaki QR gruplarını okuyarak belirsiz ve yarım kalan kayıtları
 * tamamlar. Satın alma tekrarlamaz; yalnız eksik paylaşım bağlantısını
 * oluşturur veya var olanı bulur.
 */
export async function syncQuoteBookings(record: QuoteRequestRecord) {
  const bookings = await listBookings(record.id);
  const open = bookings.filter((booking) => booking.status !== 'shared' && booking.status !== 'failed');
  if (!open.length) return listBookings(record.id);

  const provider = createLiveRawdahProviderFromEnv();
  const groups = await provider.getQrGroups();
  for (const booking of open) {
    const found = matchingGroups(groups, booking);
    const total = found.reduce((sum, group) => sum + group.totalCount, 0);
    if (booking.status === 'unknown' || booking.status === 'purchasing') {
      if (total === 0) continue;
      await updateBooking(booking.id, {
        status: 'purchased',
        purchaseId: found[0]?.purchaseId ?? booking.purchaseId,
        error: null,
      });
      booking.status = 'purchased';
      booking.purchaseId = found[0]?.purchaseId ?? booking.purchaseId;
    }
    const shared = found.find((group) => group.printGuid);
    if (shared?.printGuid) {
      await updateBooking(booking.id, {
        status: 'shared',
        shareCode: shared.printGuid,
        shareUrl: shareUrlFor(shared.printGuid),
        sharedCount: shared.totalCount,
        error: null,
      });
      continue;
    }
    if (booking.status === 'purchased') await shareBooking(booking);
  }
  await advanceWhenReady(record);
  return listBookings(record.id);
}

/**
 * Yönetici, sağlayıcı panelinde satın almanın gerçekleşmediğini doğruladığında
 * belirsiz kaydı başarısız sayar; böylece yeniden satın alma açılır.
 */
export async function releaseUnknownBooking(record: QuoteRequestRecord, gender: BookingGender) {
  const booking = (await listBookings(record.id)).find((item) => item.gender === gender);
  if (!booking || (booking.status !== 'unknown' && booking.status !== 'purchasing')) return false;
  await updateBooking(booking.id, { status: 'failed', error: 'released_by_admin' });
  return true;
}

/** Tüm gerekli cinsiyetlerin QR bağlantısı hazırsa talebi "QR hazır"a taşır. */
async function advanceWhenReady(record: QuoteRequestRecord) {
  const bookings = await listBookings(record.id);
  const ready = neededBookings(record).every(([gender]) =>
    bookings.some((booking) => booking.gender === gender && booking.status === 'shared'),
  );
  if (!ready) return;
  let current = record.status;
  for (const next of ['scheduled', 'qr_ready'] as const) {
    if (current === 'qr_ready') break;
    if (!canTransition(current, next)) continue;
    await updateQuoteStatus(record.id, next, current, 'RawdahBooking', 'QR bağlantısı otomatik oluşturuldu');
    current = next;
  }
  if (current === 'qr_ready') await notifyQuoteQrReady(record, await customerQrLinks(record));
}

/** Müşteriye gösterilecek bağlantılar: yalnız hazır olanlar. */
export async function customerQrLinks(record: QuoteRequestRecord) {
  const bookings = await listBookings(record.id);
  return bookings
    .filter((booking) => booking.status === 'shared' && booking.shareUrl)
    .map((booking) => ({
      gender: booking.gender,
      date: booking.dateKey,
      time: booking.timeSlot,
      count: booking.sharedCount ?? booking.quantity,
      url: booking.shareUrl as string,
    }));
}

export type QrReadiness = { gender: BookingGender; total: number; withQr: number };

/**
 * RawdahBooking, satın almadan sonra QR'ı kendi tarafında bir süre içinde
 * üretir. Satın alınmış her grup için kaç yolcunun QR'ı hazır, salt okunur
 * sorgulanır. Okunamazsa boş döner; durum bilgisi yine gösterilir.
 */
export async function qrReadiness(record: QuoteRequestRecord): Promise<QrReadiness[]> {
  const bookings = (await listBookings(record.id)).filter(
    (booking) => booking.status === 'shared' || booking.status === 'purchased',
  );
  if (!bookings.length) return [];
  const provider = createLiveRawdahProviderFromEnv();
  const groups = await provider.getQrGroups();
  const result: QrReadiness[] = [];
  for (const booking of bookings) {
    const group =
      matchingGroups(groups, booking).find((item) => item.purchaseId === booking.purchaseId) ??
      matchingGroups(groups, booking)[0];
    if (!group) continue;
    const passengers = await provider.getQrPassengers({
      date: group.dateKey,
      groupCode: group.groupCode,
      appointmentTime: group.appointmentTime,
      genderId: group.genderId,
      ...(group.purchaseId ? { purchaseId: group.purchaseId } : {}),
      ...(group.printGuid ? { printGuid: group.printGuid } : {}),
      status: 'All',
    });
    result.push({ gender: booking.gender, total: passengers.count, withQr: passengers.withQrCount });
  }
  return result;
}
