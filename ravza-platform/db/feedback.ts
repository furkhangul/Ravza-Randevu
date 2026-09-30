import { env } from '@/lib/server-env';

import {
  FEEDBACK_TOKEN_TTL_MS,
  generateFeedbackToken,
  maskDisplayName,
  type DisplayNameMode,
  type FeedbackInput,
  type FeedbackRecord,
  type FeedbackStatus,
} from '../lib/feedback.ts';

/**
 * Geri bildirim tablosu. Jeton yalnız özetlenmiş olarak saklanır; ham
 * jeton tek seferlik davet bağlantısında yaşar.
 */

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY NOT NULL,
    quote_request_id TEXT,
    quote_code TEXT,
    rating INTEGER NOT NULL,
    rating_communication INTEGER,
    rating_clarity INTEGER,
    rating_timeliness INTEGER,
    body TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL,
    display_name_mode TEXT NOT NULL DEFAULT 'initials',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),
    reject_reason TEXT,
    business_reply TEXT,
    replied_at INTEGER,
    token_hash TEXT,
    token_expires_at INTEGER,
    submitted_at INTEGER,
    published_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_token ON feedback(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at)`,
];

function getFeedbackDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

export function ensureFeedbackDatabase(): Promise<void> {
  schemaReady ??= (async () => {
    const db = getFeedbackDb();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  })();
  return schemaReady;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

type FeedbackRow = {
  id: string;
  quote_request_id: string | null;
  quote_code: string | null;
  rating: number;
  rating_communication: number | null;
  rating_clarity: number | null;
  rating_timeliness: number | null;
  body: string;
  display_name: string;
  display_name_mode: string;
  status: string;
  reject_reason: string | null;
  business_reply: string | null;
  published_at: number | null;
  created_at: number;
};

function mapRow(row: FeedbackRow): FeedbackRecord {
  return {
    id: row.id,
    quoteRequestId: row.quote_request_id,
    quoteCode: row.quote_code,
    rating: row.rating,
    ratingCommunication: row.rating_communication,
    ratingClarity: row.rating_clarity,
    ratingTimeliness: row.rating_timeliness,
    body: row.body,
    displayName: row.display_name,
    displayNameMode: row.display_name_mode as DisplayNameMode,
    status: row.status as FeedbackStatus,
    rejectReason: row.reject_reason,
    businessReply: row.business_reply,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

/** Teslim edilen talep için tek kullanımlık davet üretir. */
export async function createFeedbackInvite(input: {
  quoteRequestId: string;
  quoteCode: string;
  fullName: string;
}): Promise<{ token: string; id: string }> {
  await ensureFeedbackDatabase();
  const db = getFeedbackDb();
  const token = generateFeedbackToken();
  const id = `FB-${crypto.randomUUID()}`;
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO feedback (
        id, quote_request_id, quote_code, rating, body, display_name,
        display_name_mode, status, token_hash, token_expires_at, created_at
      ) VALUES (?, ?, ?, 0, '', ?, 'initials', 'pending', ?, ?, ?)`,
    )
    .bind(
      id,
      input.quoteRequestId,
      input.quoteCode,
      maskDisplayName(input.fullName, 'initials'),
      await hashToken(token),
      now + FEEDBACK_TOKEN_TTL_MS,
      now,
    )
    .run();
  return { token, id };
}

export async function findFeedbackInvite(token: string): Promise<{
  id: string;
  quoteCode: string | null;
  submitted: boolean;
} | null> {
  await ensureFeedbackDatabase();
  const db = getFeedbackDb();
  const row = await db
    .prepare(
      'SELECT id, quote_code, submitted_at, token_expires_at FROM feedback WHERE token_hash = ?',
    )
    .bind(await hashToken(token))
    .first<{
      id: string;
      quote_code: string | null;
      submitted_at: number | null;
      token_expires_at: number;
    }>();
  if (!row) return null;
  if (row.token_expires_at < Date.now()) return null;
  return {
    id: row.id,
    quoteCode: row.quote_code,
    submitted: row.submitted_at !== null,
  };
}

export async function submitFeedback(
  token: string,
  input: FeedbackInput,
  fullName: string,
): Promise<boolean> {
  const invite = await findFeedbackInvite(token);
  if (!invite || invite.submitted) return false;
  const db = getFeedbackDb();
  await db
    .prepare(
      `UPDATE feedback SET rating = ?, rating_communication = ?, rating_clarity = ?,
        rating_timeliness = ?, body = ?, display_name = ?, display_name_mode = ?,
        submitted_at = ?, token_hash = NULL
       WHERE id = ?`,
    )
    .bind(
      input.rating,
      input.ratingCommunication,
      input.ratingClarity,
      input.ratingTimeliness,
      input.body,
      maskDisplayName(fullName, input.displayNameMode),
      input.displayNameMode,
      Date.now(),
      invite.id,
    )
    .run();
  return true;
}

export async function listFeedback(
  options: { status?: FeedbackStatus; limit?: number } = {},
): Promise<FeedbackRecord[]> {
  await ensureFeedbackDatabase();
  const db = getFeedbackDb();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const result = options.status
    ? await db
        .prepare(
          `SELECT * FROM feedback WHERE status = ? AND submitted_at IS NOT NULL
           ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(options.status, limit)
        .all<FeedbackRow>()
    : await db
        .prepare(
          `SELECT * FROM feedback WHERE submitted_at IS NOT NULL
           ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(limit)
        .all<FeedbackRow>();
  return result.results.map(mapRow);
}

export async function moderateFeedback(
  id: string,
  action: { status: FeedbackStatus; rejectReason?: string; reply?: string },
): Promise<void> {
  await ensureFeedbackDatabase();
  const db = getFeedbackDb();
  const now = Date.now();
  await db
    .prepare(
      `UPDATE feedback SET status = ?, reject_reason = ?, business_reply = ?,
        replied_at = ?, published_at = ?
       WHERE id = ?`,
    )
    .bind(
      action.status,
      action.rejectReason ?? null,
      action.reply ?? null,
      action.reply ? now : null,
      action.status === 'published' ? now : null,
      id,
    )
    .run();
}
