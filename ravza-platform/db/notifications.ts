import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';

import { getDb } from '@/db';
import { notificationOutbox } from '@/db/schema';
import { randomToken } from '@/lib/auth-crypto';
import {
  getEmailConfig,
  getSmsConfig,
  sendEmail,
  sendSms,
} from '@/lib/delivery-providers';
import {
  getNotification,
  type NotificationChannel,
  type NotificationKey,
} from '@/lib/notification-catalog';
import {
  renderMessage,
  type MessageVariables,
} from '@/lib/notification-messages';

/** Kalıcı hataya düşmeden önceki deneme sayısı. */
const MAX_ATTEMPTS = 4;

export type QueueInput = {
  key: NotificationKey;
  /** Aynı bildirimin tekrar kuyruğa girmesini engelleyen anahtar. */
  dedupeKey: string;
  email?: string;
  phone?: string;
  recipientName?: string;
  variables: MessageVariables;
  sendAfter?: Date;
  relatedOrderId?: string;
};

/**
 * Bildirimi kuyruğa yazar.
 *
 * Aynı `dedupeKey` + kanal ikilisi daha önce yazıldıysa sessizce atlanır —
 * çift gönderim, geç gönderimden çok daha kötüdür. Kanal için adres yoksa
 * (telefon boşsa SMS gibi) o kanal atlanır, bildirim yine de e-postayla gider.
 */
export async function queueNotification(input: QueueInput): Promise<number> {
  const definition = getNotification(input.key);
  const message = renderMessage(input.key, input.variables);
  const now = new Date();
  const sendAfter = input.sendAfter ?? now;
  const db = getDb();

  let queued = 0;
  for (const channel of definition.channels) {
    const recipient = recipientFor(channel, input);
    if (!recipient) continue;
    // SMS metni yazılmamış bildirimlerde SMS kanalı kullanılmaz.
    if (channel === 'sms' && !message.sms) continue;

    const row = {
      id: randomToken(16),
      dedupeKey: input.dedupeKey,
      notificationKey: input.key,
      channel,
      audience: definition.audience,
      recipient,
      recipientName: input.recipientName ?? '',
      subject: channel === 'email' ? message.subject : '',
      body: channel === 'email' ? message.body : message.sms,
      relatedOrderId: input.relatedOrderId ?? '',
      status: 'queued' as const,
      sendAfter,
      createdAt: now,
    };

    // onConflictDoNothing: yarış durumunda bile ikinci kayıt oluşmaz.
    const result = await db
      .insert(notificationOutbox)
      .values(row)
      .onConflictDoNothing();
    queued += result.meta?.changes ?? 1;
  }

  return queued;
}

function recipientFor(
  channel: NotificationChannel,
  input: QueueInput,
): string | null {
  const value = channel === 'email' ? input.email : input.phone;
  return value?.trim() ? value.trim() : null;
}

/** Birden çok bildirimi tek çağrıda kuyruğa alır. */
export async function queueMany(inputs: QueueInput[]): Promise<number> {
  let total = 0;
  for (const input of inputs) total += await queueNotification(input);
  return total;
}

/**
 * Artık anlamı kalmamış bildirimleri iptal eder (ödeme geldiğinde ödeme
 * hatırlatmaları gibi). Gönderilmiş olanlara dokunmaz.
 */
export async function cancelPending(
  orderId: string,
  keys: NotificationKey[],
): Promise<void> {
  if (keys.length === 0) return;
  await getDb()
    .update(notificationOutbox)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(notificationOutbox.relatedOrderId, orderId),
        eq(notificationOutbox.status, 'queued'),
        inArray(notificationOutbox.notificationKey, keys),
      ),
    );
}

export type DrainSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Zamanı gelmiş bildirimleri gönderir.
 *
 * Zamanlanmış görev (cron) tarafından çağrılır. Sağlayıcı yapılandırılmamışsa
 * mesaj `skipped` işaretlenir: kuyrukta sonsuza dek denenip durmaz ama panelde
 * "gönderilemedi, sağlayıcı bağlı değil" olarak görünür.
 */
export async function drainOutbox(limit = 50): Promise<DrainSummary> {
  const db = getDb();
  const now = new Date();
  const summary: DrainSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  const emailReady = getEmailConfig() !== null;
  const smsReady = getSmsConfig() !== null;

  const due = await db
    .select()
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.status, 'queued'),
        lte(notificationOutbox.sendAfter, now),
      ),
    )
    .orderBy(notificationOutbox.sendAfter)
    .limit(limit);

  for (const item of due) {
    summary.processed += 1;

    const ready = item.channel === 'email' ? emailReady : smsReady;
    if (!ready) {
      summary.skipped += 1;
      await db
        .update(notificationOutbox)
        .set({
          status: 'skipped',
          lastError: `${item.channel}_provider_unconfigured`,
        })
        .where(eq(notificationOutbox.id, item.id));
      continue;
    }

    const result =
      item.channel === 'email'
        ? await sendEmail({
            to: item.recipient,
            toName: item.recipientName,
            subject: item.subject,
            body: item.body,
          })
        : await sendSms({ to: item.recipient, body: item.body });

    if (result.ok) {
      summary.sent += 1;
      await db
        .update(notificationOutbox)
        .set({ status: 'sent', sentAt: new Date(), lastError: '' })
        .where(eq(notificationOutbox.id, item.id));
      continue;
    }

    const attempts = item.attempts + 1;
    const exhausted = !result.retryable || attempts >= MAX_ATTEMPTS;
    if (exhausted) summary.failed += 1;

    await db
      .update(notificationOutbox)
      .set({
        attempts,
        lastError: result.error,
        status: exhausted ? 'failed' : 'queued',
        // Geçici hatada artan aralıkla tekrar denenir: 5, 25, 125 dakika.
        sendAfter: exhausted
          ? item.sendAfter
          : new Date(Date.now() + 5 ** attempts * 60_000),
      })
      .where(eq(notificationOutbox.id, item.id));
  }

  return summary;
}

export type OutboxEntry = {
  id: string;
  notificationKey: string;
  channel: 'email' | 'sms';
  audience: 'customer' | 'admin' | 'agency';
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed' | 'cancelled' | 'skipped';
  sendAfter: number;
  sentAt: number | null;
  attempts: number;
  lastError: string;
};

/** Panelde gösterilecek son kayıtlar. Adresler kısmen maskelenir. */
export async function listOutbox(limit = 60): Promise<OutboxEntry[]> {
  const rows = await getDb()
    .select()
    .from(notificationOutbox)
    .orderBy(desc(notificationOutbox.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    notificationKey: row.notificationKey,
    channel: row.channel,
    audience: row.audience,
    recipient: maskRecipient(row.recipient, row.channel),
    subject: row.subject,
    status: row.status,
    sendAfter: row.sendAfter.getTime(),
    sentAt: row.sentAt ? row.sentAt.getTime() : null,
    attempts: row.attempts,
    lastError: row.lastError,
  }));
}

export type OutboxCounts = Record<OutboxEntry['status'], number>;

export async function countOutboxByStatus(): Promise<OutboxCounts> {
  const rows = await getDb()
    .select({
      status: notificationOutbox.status,
      total: sql<number>`count(*)`,
    })
    .from(notificationOutbox)
    .groupBy(notificationOutbox.status);

  const counts: OutboxCounts = {
    queued: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
  };
  for (const row of rows) counts[row.status] = Number(row.total);
  return counts;
}

/**
 * Panelde tam adres göstermenin gereği yok: yöneticinin görmesi gereken şey
 * "gitti mi", "kime benziyor" — tam adres değil.
 */
export function maskRecipient(value: string, channel: 'email' | 'sms'): string {
  if (channel === 'sms') {
    return value.length > 4 ? `••• ${value.slice(-4)}` : value;
  }
  const [local, domain] = value.split('@');
  if (!domain) return value;
  const head = local.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}
