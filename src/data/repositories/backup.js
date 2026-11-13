/**
 * Backup / restore on the database. File handling lives in src/backup/;
 * the format + checks in domain/backup.js.
 *
 * Restore REPLACES all work data (owner's choice) in ONE transaction:
 * if anything fails, nothing changes. Rows keep their id and uid from the
 * backup, so a restored phone has the same records (sync-friendly).
 * Theme / mode and device_id are never touched.
 */
import { MIGRATIONS, query, transaction } from '../db/database';
import {
  BACKUP_META_KEYS,
  BACKUP_TABLES,
  makeBackup,
} from '@/domain/backup';

/** This app's database version (a backup newer than this is refused). */
export function currentSchemaVersion() {
  return MIGRATIONS.length;
}

async function columnsOf(table) {
  const rows = await query(`PRAGMA table_info(${table})`);
  return rows.map(r => r.name);
}

/** All work data + "This is me", as a backup object (domain/backup). */
export async function createBackupData() {
  const [{ user_version: schemaVersion }] = await query('PRAGMA user_version');
  const tables = {};
  for (const name of BACKUP_TABLES) {
    tables[name] = await query(`SELECT * FROM ${name} ORDER BY id`);
  }
  const meta = {};
  for (const key of BACKUP_META_KEYS) {
    const rows = await query('SELECT value FROM app_meta WHERE key = ?', [
      key,
    ]);
    meta[key] = rows[0] ? rows[0].value : null;
  }
  return makeBackup({ schemaVersion: Number(schemaVersion), tables, meta });
}

/**
 * Replace all work data with a CHECKED backup (parseBackup first).
 * Throws (and changes nothing) if any row doesn't fit the database.
 */
export async function restoreBackupData(backup) {
  const columns = {};
  for (const name of BACKUP_TABLES) {
    columns[name] = await columnsOf(name);
  }
  await transaction(async tx => {
    // children first (also fires the delete triggers → sync_deletions)
    for (const name of [...BACKUP_TABLES].reverse()) {
      await tx.execute(`DELETE FROM ${name}`);
    }
    // parents first, so every foreign key already exists
    for (const name of BACKUP_TABLES) {
      for (const row of backup.tables[name]) {
        // only columns this database has (an older backup may lack new ones)
        const keys = columns[name].filter(c => row[c] !== undefined);
        await tx.execute(
          `INSERT INTO ${name} (${keys.join(', ')})
           VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map(k => row[k]),
        );
      }
      // records that came back are not deletions
      await tx.execute(
        `DELETE FROM sync_deletions
         WHERE table_name = ? AND uid IN (SELECT uid FROM ${name})`,
        [name],
      );
    }
    // "This is me" — only if that person is in the backup
    const myself = backup.meta?.myself_uid ?? null;
    const found = myself
      ? (
          await tx.execute('SELECT 1 AS ok FROM people WHERE uid = ?', [
            myself,
          ])
        ).rows?.length
      : 0;
    if (found) {
      await tx.execute(
        `INSERT INTO app_meta (key, value) VALUES ('myself_uid', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [myself],
      );
    } else {
      await tx.execute("DELETE FROM app_meta WHERE key = 'myself_uid'");
    }
  });
}
