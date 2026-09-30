#!/usr/bin/env node
/**
 * `drizzle/*.sql` göçlerini SQLite dosyasına sırayla uygular.
 *
 * Kullanım:
 *   DATABASE_PATH=/var/lib/ravza/ravza.db node scripts/migrate.mjs
 *
 * Uygulanan göçler Wrangler'ın kullandığı `d1_migrations` tablosunda tutulur;
 * Cloudflare D1'den alınmış bir döküm içe aktarıldıysa zaten uygulanmış
 * göçler atlanır.
 */

import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = join(root, 'drizzle');
const databasePath = resolve(process.env.DATABASE_PATH ?? join(root, 'data/ravza.db'));

mkdirSync(dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const applied = new Set(db.prepare('SELECT name FROM d1_migrations').pluck().all());
const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

const addColumn = /^ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+ADD\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?/i;

/**
 * 0008 ile 0009 aynı sütunları ekler (0008 elle yazılmış, 0009 Drizzle'ın
 * ürettiği tam hâli). Var olan sütunu yeniden eklemeye çalışan ifade atlanır.
 */
function columnExists(statement) {
  const match = addColumn.exec(statement);
  if (!match) return false;
  const [, table, column] = match;
  return db
    .prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`)
    .pluck()
    .get(table, column) === 1;
}

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  db.transaction(() => {
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      if (columnExists(trimmed)) {
        console.log(`  atlandı (sütun zaten var): ${addColumn.exec(trimmed)[0]}`);
        continue;
      }
      db.exec(trimmed);
    }
    db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(file);
  })();
  console.log(`uygulandı: ${file}`);
  count += 1;
}

console.log(count ? `${count} göç uygulandı → ${databasePath}` : `Veritabanı güncel → ${databasePath}`);
db.close();
