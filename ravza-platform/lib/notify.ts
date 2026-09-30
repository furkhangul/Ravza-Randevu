import { queueNotification } from '@/db/notifications';
import { adminRecipients } from '@/lib/notification-events';
import type { NotificationKey } from '@/lib/notification-catalog';

/**
 * Talep ve acente olaylarının e-posta bildirimleri.
 *
 * Bildirimler kuyruğa (notification_outbox) yazılır; dakikalık zamanlayıcı
 * Resend ile gönderir. Kuyruğa yazılamasa bile asıl işlem (talep, onay,
 * randevu) asla bozulmaz: her çağrı kendi hatasını yutar ve günlüğe yazmaz.
 * Aynı olay iki kez tetiklenirse `dedupeKey` ikinci kaydı engeller.
 */

function siteUrl(path = '') {
  return `${(process.env.APP_URL || 'https://ravzarandevu.com.tr').replace(/\/$/, '')}${path}`;
}

async function safely(task: () => Promise<unknown>) {
  try {
    await task();
  } catch {
    // Bildirim hatası ana akışı durdurmaz; kayıt panelden "Bildirimler" ile izlenir.
  }
}

async function toAdmins(key: NotificationKey, dedupeKey: string, variables: Record<string, string>) {
  for (const email of adminRecipients()) {
    await queueNotification({ key, dedupeKey: `${dedupeKey}:${email}`, email, recipientName: 'Ravza Randevu', variables });
  }
}

const people = (female: number, male: number) =>
  [female ? `${female} kadın` : '', male ? `${male} erkek` : ''].filter(Boolean).join(', ') || '—';
const range = (from: string, to: string) => (from === to ? from : `${from} – ${to}`);

/* ------------------------------ Ziyaretçi talebi ------------------------------ */

export function notifyQuoteCreated(quote: {
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  note: string | null;
}) {
  const variables = {
    kod: quote.code,
    ad: quote.fullName,
    telefon: quote.phone,
    tarih: range(quote.dateFrom, quote.dateTo),
    kisi: people(quote.femaleCount, quote.maleCount),
    not: quote.note || '—',
  };
  return safely(async () => {
    await toAdmins('admin_new_quote', `quote-new:${quote.code}`, { ...variables, baglanti: siteUrl('/panel/talepler') });
    if (quote.email)
      await queueNotification({
        key: 'quote_received',
        dedupeKey: `quote-received:${quote.code}`,
        email: quote.email,
        recipientName: quote.fullName,
        variables: { ...variables, baglanti: siteUrl(`/talep/${quote.code}`) },
      });
  });
}

export function notifyQuoteQrReady(
  quote: { code: string; fullName: string; email: string | null },
  links: Array<{ gender: 'female' | 'male'; date: string; time: string; count: number; url: string }>,
) {
  if (!quote.email || !links.length) return Promise.resolve();
  return safely(() =>
    queueNotification({
      key: 'quote_qr_ready',
      dedupeKey: `quote-qr:${quote.code}`,
      email: quote.email as string,
      recipientName: quote.fullName,
      variables: {
        ad: quote.fullName,
        kod: quote.code,
        linkler: links
          .map((link) => `${link.gender === 'female' ? 'Kadın' : 'Erkek'} · ${link.count} kişi · ${link.date} ${link.time} (Medine): ${link.url}`)
          .join('\n'),
        baglanti: siteUrl(`/talep/${quote.code}`),
      },
    }),
  );
}

/* ---------------------------------- Acente ---------------------------------- */

type AgencyRef = { id: string; companyName: string; contactName: string; contactEmail: string };

export function notifyAgencyApplied(agency: AgencyRef & { taxNumber: string; contactPhone: string; initialCredits: number }) {
  return safely(() =>
    toAdmins('admin_new_agency', `agency-new:${agency.id}`, {
      sirket: agency.companyName,
      vergi: agency.taxNumber,
      ad: agency.contactName,
      telefon: agency.contactPhone,
      eposta: agency.contactEmail,
      kontor: agency.initialCredits ? `${agency.initialCredits} kontör` : 'yok',
      baglanti: siteUrl('/panel/acenteler'),
    }),
  );
}

export function notifyAgencyApproved(agency: AgencyRef, credits: number, balance: number) {
  return safely(() =>
    queueNotification({
      key: 'agency_approved',
      dedupeKey: `agency-approved:${agency.id}`,
      email: agency.contactEmail,
      recipientName: agency.contactName,
      variables: {
        ad: agency.contactName,
        sirket: agency.companyName,
        kontorSatiri: credits > 0 ? `Hesabınıza ${credits} kontör yüklendi; güncel bakiyeniz ${balance} kontör.` : '',
        baglanti: siteUrl('/acente/giris'),
        kosullar: siteUrl('/acente/kosullar'),
      },
    }),
  );
}

export function notifyAgencyRejected(agency: AgencyRef, reason: string) {
  return safely(() =>
    queueNotification({
      key: 'agency_rejected',
      dedupeKey: `agency-rejected:${agency.id}:${Date.now()}`,
      email: agency.contactEmail,
      recipientName: agency.contactName,
      variables: { ad: agency.contactName, sirket: agency.companyName, sebep: reason },
    }),
  );
}

export function notifyCreditRequested(agency: AgencyRef, input: { requestId: string; quantity: number; note: string | null; requestedBy: string; balance: number }) {
  return safely(() =>
    toAdmins('admin_agency_credit_request', `credit-request:${input.requestId}`, {
      sirket: agency.companyName,
      adet: String(input.quantity),
      ad: input.requestedBy,
      not: input.note || '—',
      bakiye: String(input.balance),
      baglanti: siteUrl('/panel/acenteler'),
    }),
  );
}

export function notifyCreditsLoaded(agency: AgencyRef, input: { reference: string; quantity: number; balance: number; note: string }) {
  return safely(() =>
    queueNotification({
      key: 'agency_credits_loaded',
      dedupeKey: `credits-loaded:${input.reference}`,
      email: agency.contactEmail,
      recipientName: agency.contactName,
      variables: {
        ad: agency.contactName,
        sirket: agency.companyName,
        adet: String(input.quantity),
        bakiye: String(input.balance),
        not: input.note,
        baglanti: siteUrl('/acente'),
      },
    }),
  );
}

export function notifyCreditRequestRejected(agency: AgencyRef, input: { requestId: string; quantity: number; reason: string }) {
  return safely(() =>
    queueNotification({
      key: 'agency_credit_request_rejected',
      dedupeKey: `credit-rejected:${input.requestId}`,
      email: agency.contactEmail,
      recipientName: agency.contactName,
      variables: { ad: agency.contactName, adet: String(input.quantity), sebep: input.reason || 'Belirtilmedi' },
    }),
  );
}

export function notifyAgencyBooking(
  agency: { companyName: string },
  member: { id: string; fullName: string; email: string },
  input: { reference: string; groupName: string; dateKey: string; used: number; balance: number; links: Array<{ gender: 'female' | 'male'; time: string; count: number; url: string | null }> },
) {
  const ready = input.links.filter((link) => link.url);
  if (!ready.length) return Promise.resolve();
  return safely(() =>
    queueNotification({
      key: 'agency_booking_ready',
      dedupeKey: `agency-booking:${input.reference}`,
      email: member.email,
      recipientName: member.fullName,
      variables: {
        ad: member.fullName,
        sirket: agency.companyName,
        grup: input.groupName || '—',
        tarih: input.dateKey,
        adet: String(input.used),
        bakiye: String(input.balance),
        linkler: ready
          .map((link) => `${link.gender === 'female' ? 'Kadın' : 'Erkek'} · ${link.count} kişi · ${link.time} (Medine): ${link.url}`)
          .join('\n'),
        baglanti: siteUrl('/acente'),
      },
    }),
  );
}

export function notifyMemberInvited(
  agency: { companyName: string },
  member: { id: string; fullName: string; email: string },
  input: { invitedBy: string; temporaryPassword: string },
) {
  return safely(() =>
    queueNotification({
      key: 'agency_member_invited',
      dedupeKey: `member-invited:${member.id}`,
      email: member.email,
      recipientName: member.fullName,
      variables: {
        ad: member.fullName,
        sirket: agency.companyName,
        davetEden: input.invitedBy,
        eposta: member.email,
        sifre: input.temporaryPassword,
        baglanti: siteUrl('/acente/giris'),
      },
    }),
  );
}

export function notifyPasswordReset(agency: { companyName: string }, member: { id: string; fullName: string; email: string }, temporaryPassword: string) {
  return safely(() =>
    queueNotification({
      key: 'agency_password_reset',
      dedupeKey: `password-reset:${member.id}:${Date.now()}`,
      email: member.email,
      recipientName: member.fullName,
      variables: {
        ad: member.fullName,
        sirket: agency.companyName,
        sifre: temporaryPassword,
        baglanti: siteUrl('/acente/giris'),
      },
    }),
  );
}
