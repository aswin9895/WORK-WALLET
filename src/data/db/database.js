/**
 * SQLite connection + migration runner (schema: ./migrations.js).
 *
 * The database is a single file inside the app's private storage on the
 * phone. It survives app restarts, phone restarts and power loss.
 * Durability settings:
 *   - journal_mode = WAL   -> crash-safe write-ahead log
 *   - synchronous  = FULL  -> every commit is flushed to disk before returning
 *   - foreign_keys = ON    -> deleting a catering also deletes its works/extras
 *                             (turned OFF only while migrations run)
 *
 * Only src/data/ may import this file. Screens use the functions exported
 * from '@/data'.
 */
import { open } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';

const DB_NAME = 'workandwallet.sqlite';

let db = null;

export function getDb() {
  if (!db) {
    throw new Error('Database not initialised. Call initDb() first.');
  }
  return db;
}

export { MIGRATIONS };

export async function initDb() {
  if (db) {
    return db;
  }
  db = open({ name: DB_NAME });
  await db.execute('PRAGMA journal_mode = WAL');
  await db.execute('PRAGMA synchronous = FULL');

  const res = await db.execute('PRAGMA user_version');
  let version = Number(res.rows[0]?.user_version ?? 0);

  const migrated = version < MIGRATIONS.length;
  await db.execute('PRAGMA foreign_keys = OFF');
  while (version < MIGRATIONS.length) {
    const statements = MIGRATIONS[version];
    const next = version + 1;
    await db.transaction(async tx => {
      for (const sql of statements) {
        await tx.execute(sql);
      }
      await tx.execute(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  if (migrated) {
    const bad = await db.execute('PRAGMA foreign_key_check');
    if (bad.rows?.length) {
      throw new Error('Database check failed after update');
    }
  }
  // Foreign keys must be OFF while migrating (table rebuilds) and ON after.
  await db.execute('PRAGMA foreign_keys = ON');
  return db;
}

/** Run a query and return the rows array. */
export async function query(sql, params = []) {
  const res = await getDb().execute(sql, params);
  return res.rows || [];
}

/** Run a write and return {insertId, rowsAffected}. */
export async function run(sql, params = []) {
  const res = await getDb().execute(sql, params);
  return { insertId: res.insertId, rowsAffected: res.rowsAffected };
}

/** Run several writes atomically: all succeed or none do. */
export async function transaction(fn) {
  return getDb().transaction(fn);
}
