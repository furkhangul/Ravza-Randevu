import {
  addLedgerEntry,
  consumeCredits,
  createAgencyBooking,
  getAgencyBooking,
  listAgencyBookings,
  updateAgencyBooking,
  type AgencyBooking,
} from '@/db/agencies';
import type { AgencyContext } from '@/lib/agency-auth';
import { createLiveRawdahProviderFromEnv, type QrGroup } from '@/packages/provider-rawdah/src';

/**
 * Acentenin kendi kontörüyle RawdahBooking'den randevu alması.
 *
 * Satın alma ana hesabın (sizin) RawdahBooking bakiyesinden yapılır; acentenin
 * sitedeki kontörü ise bu işlemin iç muhasebesidir:
 * 1. Randevu kaydı açılır, kontör tek SQL ifadesiyle düşülür (yetmezse durur).
 * 2. Satın alma gönderilir. Ret → kontör otomatik iade. Belirsiz → kontör
 *    bekletilir, yönetici "kontrol et" ile netleştirir (kör tekrar yok).
 * 3. Başarılıysa QR paylaşım bağlantısı, filtreler sağlayıcının QR grup
 *    listesinden aynen alınarak oluşturulur.
 */

const GENDER_ID = { male: 8, female: 9 } as const;

export function agencyFulfillmentEnabled() {
  return (
    process.env.RAWDAH_LIVE_ENABLED === 'true' &&
    process.env.RAWDAH_WRITE_ENABLED === 'true' &&
    process.env.RAWDAH_SHARE_LINK_ENABLED === 'true'
  );
}

/** Sağlayıcıya giden kısa, benzersiz grup kodu: ACN-<acente>-<randevu>. */
function groupCodeFor(agencyId: string, bookingId: string) {
  const part = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return `ACN-${part(agencyId)}-${part(bookingId)}`;
}

function matchGroup(groups: QrGroup[], booking: AgencyBooking) {
  const candidates = groups.filter(
    (group) =>
      group.groupCode === booking.groupCode &&
      group.genderId === GENDER_ID[booking.gender] &&
      group.dateKey === booking.dateKey &&
      group.appointmentTime.slice(0, 5) === booking.timeSlot.slice(0, 5),
  );
  return candidates.find((group) => group.purchaseId === booking.purchaseId) ?? candidates[0];
}

async function shareAgencyBooking(booking: AgencyBooking): Promise<AgencyBooking['status']> {
  const provider = createLiveRawdahProviderFromEnv();
  let group: QrGroup | undefined;
  try {
    group = matchGroup(await provider.getQrGroups(), booking);
  } catch (error) {
    await updateAgencyBooking(booking.id, {
      error: `groups_error: ${error instanceof Error ? error.message : 'unknown'}`.slice(0, 300),
    });
    return 'purchased';
  }
  if (!group) {
    await updateAgencyBooking(booking.id, { error: 'group_not_found' });
    return 'purchased';
  }
  if (group.printGuid) {
    await updateAgencyBooking(booking.id, {
      status: 'shared',
      shareCode: group.printGuid,
      shareUrl: `https://rwdh.link/${group.printGuid}`,
      error: null,
    });
    return 'shared';
  }
  const purchaseId = group.purchaseId ? Number(group.purchaseId) : Number.NaN;
  try {
    const result = await provider.createShareLink({
      date: group.dateKey,
      groupCode: group.groupCode,
      appointmentTime: group.appointmentTime,
      genderId: group.genderId,
      ...(Number.isInteger(purchaseId) && purchaseId > 0 ? { purchaseId } : {}),
      personCount: group.totalCount,
    });
    if (result.status === 'completed' && result.url && result.code) {
      await updateAgencyBooking(booking.id, {
        status: 'shared',
        shareUrl: result.url,
        shareCode: result.code,
        error: null,
      });
      return 'shared';
    }
    await updateAgencyBooking(booking.id, { error: `share_${result.status}` });
  } catch (error) {
    await updateAgencyBooking(booking.id, {
      error: `share_error: ${error instanceof Error ? error.message : 'unknown'}`.slice(0, 300),
    });
  }
  return 'purchased';
}

export type AgencyPurchaseInput = {
  groupName: string;
  dateKey: string;
  female: { timeSlot: string; count: number } | null;
  male: { timeSlot: string; count: number } | null;
};

export type AgencyPurchaseResult = {
  gender: 'female' | 'male';
  bookingId: string;
  status: AgencyBooking['status'] | 'insufficient';
  shareUrl: string | null;
};

export async function purchaseForAgency(
  context: AgencyContext,
  input: AgencyPurchaseInput,
): Promise<AgencyPurchaseResult[]> {
  const results: AgencyPurchaseResult[] = [];
  const actor = `agency:${context.member.id}`;
  for (const gender of ['female', 'male'] as const) {
    const part = input[gender];
    if (!part || part.count < 1) continue;
    const bookingId = `ABK-${crypto.randomUUID()}`;
    const groupCode = groupCodeFor(context.agency.id, bookingId);
    await createAgencyBooking({
      id: bookingId,
      agencyId: context.agency.id,
      memberId: context.member.id,
      groupName: input.groupName,
      groupCode,
      gender,
      dateKey: input.dateKey,
      timeSlot: part.timeSlot,
      quantity: part.count,
    });

    const consumed = await consumeCredits({
      agencyId: context.agency.id,
      quantity: part.count,
      reference: bookingId,
      note: `${input.dateKey} ${part.timeSlot} · ${gender === 'female' ? 'Kadın' : 'Erkek'} · ${part.count} kişi`,
      actor,
    });
    if (!consumed) {
      await updateAgencyBooking(bookingId, { status: 'failed', error: 'insufficient_credits' });
      results.push({ gender, bookingId, status: 'insufficient', shareUrl: null });
      continue;
    }

    const refund = (reason: string) =>
      addLedgerEntry({
        agencyId: context.agency.id,
        amount: part.count,
        type: 'refund',
        reference: bookingId,
        note: `Otomatik iade: ${reason}`,
        actor: 'system',
      });

    let result;
    try {
      result = await createLiveRawdahProviderFromEnv().purchase({
        agencyId: context.agency.id,
        idempotencyKey: bookingId,
        dateKey: input.dateKey,
        timeSlot: part.timeSlot,
        gender,
        count: part.count,
        groupCode,
      });
    } catch (error) {
      // İstek gönderilmeden oluşan hata (giriş, doğrulama): satın alma yok, kontör iade.
      await updateAgencyBooking(bookingId, {
        status: 'failed',
        error: (error instanceof Error ? error.message : 'purchase_error').slice(0, 300),
      });
      await refund('satın alma gönderilemedi');
      results.push({ gender, bookingId, status: 'failed', shareUrl: null });
      continue;
    }

    if (result.status === 'failed') {
      await updateAgencyBooking(bookingId, { status: 'failed', error: 'provider_rejected' });
      await refund('RawdahBooking satın almayı reddetti');
      results.push({ gender, bookingId, status: 'failed', shareUrl: null });
      continue;
    }
    if (result.status === 'unknown') {
      await updateAgencyBooking(bookingId, { status: 'unknown', error: 'provider_unknown' });
      results.push({ gender, bookingId, status: 'unknown', shareUrl: null });
      continue;
    }

    await updateAgencyBooking(bookingId, { status: 'purchased', purchaseId: result.transactionId, error: null });
    const booking = await getAgencyBooking(bookingId);
    const status = booking ? await shareAgencyBooking(booking) : 'purchased';
    const fresh = await getAgencyBooking(bookingId);
    results.push({ gender, bookingId, status, shareUrl: fresh?.shareUrl ?? null });
  }
  return results;
}

/**
 * Belirsiz veya bağlantısı eksik randevuları sağlayıcıdan okuyarak tamamlar.
 * Satın alma tekrarlanmaz.
 */
export async function syncAgencyBookings(agencyId?: string) {
  const open = (await listAgencyBookings(agencyId, 500)).filter((booking) =>
    ['purchasing', 'purchased', 'unknown'].includes(booking.status),
  );
  if (!open.length) return 0;
  const provider = createLiveRawdahProviderFromEnv();
  const groups = await provider.getQrGroups();
  let changed = 0;
  for (const booking of open) {
    const group = matchGroup(groups, booking);
    if ((booking.status === 'unknown' || booking.status === 'purchasing') && !group) continue;
    if (booking.status !== 'purchased') {
      await updateAgencyBooking(booking.id, { status: 'purchased', purchaseId: group?.purchaseId ?? booking.purchaseId, error: null });
      booking.purchaseId = group?.purchaseId ?? booking.purchaseId;
    }
    if ((await shareAgencyBooking({ ...booking, status: 'purchased' })) === 'shared') changed += 1;
  }
  return changed;
}

/**
 * Yönetici, RawdahBooking panelinde satın almanın gerçekleşmediğini
 * doğruladığında belirsiz randevuyu kapatıp kontörü iade eder.
 */
export async function refundAgencyBooking(bookingId: string, actor: string) {
  const booking = await getAgencyBooking(bookingId);
  if (!booking || !['unknown', 'purchasing'].includes(booking.status)) return false;
  await updateAgencyBooking(booking.id, { status: 'failed', error: 'refunded_by_admin' });
  await addLedgerEntry({
    agencyId: booking.agencyId,
    amount: booking.quantity,
    type: 'refund',
    reference: booking.id,
    note: 'Yönetici iadesi: satın alma gerçekleşmedi',
    actor,
  });
  return true;
}

/** Acente randevularının QR hazırlığı (salt okunur); okunamazsa boş. */
export async function agencyQrReadiness(bookings: AgencyBooking[]) {
  const shared = bookings.filter((booking) => booking.status === 'shared');
  if (!shared.length) return {} as Record<string, { total: number; withQr: number }>;
  const provider = createLiveRawdahProviderFromEnv();
  const groups = await provider.getQrGroups();
  const readiness: Record<string, { total: number; withQr: number }> = {};
  for (const booking of shared.slice(0, 30)) {
    const group = matchGroup(groups, booking);
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
    readiness[booking.id] = { total: passengers.count, withQr: passengers.withQrCount };
  }
  return readiness;
}
