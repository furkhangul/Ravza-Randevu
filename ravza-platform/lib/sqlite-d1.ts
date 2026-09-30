import Database from 'better-sqlite3';

/**
 * Cloudflare D1 arayüzünün bu projede kullanılan alt kümesini yerel bir SQLite
 * dosyası üzerinde sağlar. Böylece `db/*` içindeki ham sorgular ve Drizzle'ın
 * D1 sürücüsü VPS üzerinde değişmeden çalışır.
 */

type Value = null | number | bigint | string | Uint8Array;

function toSqlite(value: unknown): Value {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return value as Value;
}

function meta(changes = 0, lastRowId: number | bigint = 0) {
  return {
    duration: 0,
    changes,
    last_row_id: Number(lastRowId),
    changed_db: changes > 0,
    rows_read: 0,
    rows_written: changes,
    size_after: 0,
  };
}

class SqlitePreparedStatement {
  constructor(
    private readonly db: Database.Database,
    private readonly sql: string,
    private readonly params: Value[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new SqlitePreparedStatement(this.db, this.sql, values.map(toSqlite));
  }

  private statement() {
    return this.db.prepare(this.sql);
  }

  /** D1'in `all()` davranışı: yalnız okuyan sorgular satır döndürür. */
  allSync() {
    const statement = this.statement();
    if (statement.reader) {
      const results = statement.all(...this.params) as Record<string, unknown>[];
      return { success: true, results, meta: meta() };
    }
    const info = statement.run(...this.params);
    return { success: true, results: [], meta: meta(info.changes, info.lastInsertRowid) };
  }

  async all<T = Record<string, unknown>>() {
    return this.allSync() as { success: true; results: T[]; meta: ReturnType<typeof meta> };
  }

  async run() {
    return this.allSync();
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const statement = this.statement();
    const row = statement.reader
      ? (statement.get(...this.params) as Record<string, unknown> | undefined)
      : (statement.run(...this.params), undefined);
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const statement = this.statement();
    if (!statement.reader) {
      statement.run(...this.params);
      return [];
    }
    const rows = statement.raw(true).all(...this.params) as T[];
    if (!options?.columnNames) return rows;
    const names = statement.columns().map((column) => column.name) as T;
    return [names, ...rows];
  }
}

export class SqliteD1Database {
  constructor(readonly db: Database.Database) {}

  prepare(sql: string) {
    return new SqlitePreparedStatement(this.db, sql);
  }

  /** D1 gibi: tüm ifadeler tek işlemde çalışır, biri hata verirse hepsi geri alınır. */
  async batch(statements: SqlitePreparedStatement[]) {
    return this.db.transaction(() => statements.map((statement) => statement.allSync()))();
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

export function openSqliteD1(path: string) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  // D1 yabancı anahtarları her zaman denetler; aynı davranışı koru.
  db.pragma('foreign_keys = ON');
  return new SqliteD1Database(db);
}
