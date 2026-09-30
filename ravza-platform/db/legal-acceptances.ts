import { env } from '@/lib/server-env';

/**
 * Yasal metin kabul kayıtları (ör. sorumluluk reddi beyanı).
 * Kim, hangi belgenin hangi sürümünü, ne zaman kabul etti — ispat için tutulur.
 */
const CREATE = `CREATE TABLE IF NOT EXISTS legal_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  document TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  UNIQUE(subject_type, subject_id, document, version)
)`;

let ready: Promise<void> | null = null;
function ensure(db: D1Database) {
  ready ??= db.prepare(CREATE).run().then(() => undefined);
  return ready.catch((error) => {
    ready = null;
    throw error;
  });
}

export type AcceptanceInput = { subjectType: 'customer' | 'agency_member'; subjectId: string; document: 'disclaimer'; version: string };

/** Kayıt işlemiyle aynı toplu yazmaya eklenecek ifadeyi hazırlar. */
export async function acceptanceStatement(input: AcceptanceInput, now = Math.floor(Date.now() / 1000)) {
  const db = env.DB;
  if (!db) throw new Error('D1 binding DB is unavailable');
  await ensure(db);
  return db
    .prepare('INSERT OR IGNORE INTO legal_acceptances (subject_type, subject_id, document, version, accepted_at) VALUES (?, ?, ?, ?, ?)')
    .bind(input.subjectType, input.subjectId, input.document, input.version, now);
}

export async function listAcceptances(subjectType: AcceptanceInput['subjectType'], subjectId: string) {
  const db = env.DB;
  if (!db) return [];
  await ensure(db);
  const { results } = await db
    .prepare('SELECT document, version, accepted_at FROM legal_acceptances WHERE subject_type = ? AND subject_id = ? ORDER BY accepted_at')
    .bind(subjectType, subjectId)
    .all<{ document: string; version: string; accepted_at: number }>();
  return results ?? [];
}
