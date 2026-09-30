import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { openSqliteD1 } from './sqlite-d1';

/**
 * Sunucu bağlamı. Cloudflare'daki `cloudflare:workers` `env` nesnesinin yerini
 * alır: `DB`, `DATABASE_PATH` ile gösterilen SQLite dosyasıdır. Workers AI
 * VPS'te yoktur; `AI` tanımsız kaldığında destek asistanı kendini kapatır.
 */
type ServerEnv = {
  DB: D1Database;
  AI?: Ai;
};

const globalForDb = globalThis as typeof globalThis & { __ravzaDb?: D1Database };

function database(): D1Database {
  if (!globalForDb.__ravzaDb) {
    const path = resolve(process.env.DATABASE_PATH ?? 'data/ravza.db');
    mkdirSync(dirname(path), { recursive: true });
    globalForDb.__ravzaDb = openSqliteD1(path) as unknown as D1Database;
  }
  return globalForDb.__ravzaDb;
}

export const env: ServerEnv = {
  get DB() {
    return database();
  },
  AI: undefined,
};
