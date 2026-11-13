/**
 * Backup file format + checks. Pure (no React, no SQL, no files) — tested.
 *
 * A backup is one JSON object:
 *   {
 *     app: 'WorkAndWallet', kind: 'backup', format: 1,
 *     schemaVersion: <database version that made it>,
 *     createdAt: '2026-11-12T05:05:00.000Z',
 *     tables: { caterings: [...], people: [...], works: [...], work_lines,
 *               extras, extra_people, payments,
 *               money_accounts, savings_types, money_fixed_items,
 *               money_entries, money_checks },     // every column, incl. uid
 *     meta: { myself_uid: '…' | null },             // "This is me"
 *   }
 * Not included (owner's choice): theme / mode. Never included: device_id
 * (each phone keeps its own) and sync_deletions.
 */

export const BACKUP_APP = 'WorkAndWallet';
/** Backups made before the rename (app was "Work Tracker") still restore. */
export const OLD_BACKUP_APPS = ['WorkTracker'];
export const BACKUP_KIND = 'backup';
/** Version of the file layout above. Bump only if the layout changes. */
export const BACKUP_FORMAT = 1;
/** Oldest database version a backup can come from (v6 = sync-ready). */
export const MIN_BACKUP_SCHEMA = 6;

/**
 * Tables in the backup, parents first (insert order). Restore deletes them
 * in reverse order.
 */
export const BACKUP_TABLES = [
  'caterings',
  'people',
  'works',
  'work_lines',
  'extras',
  'extra_people',
  'payments',
  // money (v7) — amounts in paise
  'money_accounts',
  'savings_types',
  'money_fixed_items',
  'money_entries',
  'money_checks',
];

/**
 * Database version a table first appeared in. A backup made before that
 * simply has no such table: it restores as empty.
 */
export const TABLE_SINCE = {
  money_accounts: 7,
  savings_types: 7,
  money_fixed_items: 7,
  money_entries: 7,
  money_checks: 7,
};

/** app_meta keys that travel with the data. */
export const BACKUP_META_KEYS = ['myself_uid'];

/** A problem with the chosen file; message is shown to the owner as is. */
export class BackupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BackupError';
  }
}

const NOT_A_BACKUP = 'This file is not a Work & Wallet backup.';
const DAMAGED = 'This backup file is damaged or incomplete.';

const isPlainObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const isCell = v =>
  v === null ||
  typeof v === 'string' ||
  (typeof v === 'number' && Number.isFinite(v));

/** Build the backup object from rows read out of the database. */
export function makeBackup({ schemaVersion, tables, meta, now = new Date() }) {
  const out = {};
  for (const name of BACKUP_TABLES) {
    out[name] = tables[name] || [];
  }
  const outMeta = {};
  for (const key of BACKUP_META_KEYS) {
    outMeta[key] = meta?.[key] ?? null;
  }
  return {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    format: BACKUP_FORMAT,
    schemaVersion,
    createdAt: now.toISOString(),
    tables: out,
    meta: outMeta,
  };
}

/**
 * Read + check a backup file's text. Returns the backup object, or throws a
 * BackupError with a message for the owner. Nothing is written here.
 *   currentSchemaVersion — this app's database version (MIGRATIONS.length)
 */
export function parseBackup(text, currentSchemaVersion) {
  let data;
  try {
    data = JSON.parse(String(text ?? '').replace(/^﻿/, ''));
  } catch (e) {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (
    !isPlainObject(data) ||
    (data.app !== BACKUP_APP && !OLD_BACKUP_APPS.includes(data.app)) ||
    data.kind !== BACKUP_KIND
  ) {
    throw new BackupError(NOT_A_BACKUP);
  }
  const schema = data.schemaVersion;
  if (
    !Number.isInteger(data.format) ||
    !Number.isInteger(schema) ||
    data.format < 1 ||
    schema < MIN_BACKUP_SCHEMA
  ) {
    throw new BackupError(DAMAGED);
  }
  if (data.format > BACKUP_FORMAT || schema > currentSchemaVersion) {
    throw new BackupError(
      'This backup was made by a newer version of the app. Update the app first, then restore.',
    );
  }
  if (!isPlainObject(data.tables)) {
    throw new BackupError(DAMAGED);
  }
  for (const name of BACKUP_TABLES) {
    if (data.tables[name] === undefined && schema < (TABLE_SINCE[name] || 0)) {
      data.tables[name] = []; // older backup: table didn't exist yet
    }
    const rows = data.tables[name];
    if (!Array.isArray(rows)) {
      throw new BackupError(DAMAGED);
    }
    const ids = new Set();
    for (const row of rows) {
      if (
        !isPlainObject(row) ||
        !Number.isInteger(row.id) ||
        row.id < 1 ||
        ids.has(row.id) ||
        !Object.values(row).every(isCell)
      ) {
        throw new BackupError(DAMAGED);
      }
      ids.add(row.id);
    }
  }
  if (data.meta !== undefined && !isPlainObject(data.meta)) {
    throw new BackupError(DAMAGED);
  }
  return data;
}

/** Counts for the confirm message. */
export function backupSummary(backup) {
  const t = backup.tables;
  return {
    createdAt: backup.createdAt || null,
    caterings: t.caterings.length,
    works: t.works.length,
    people: t.people.length,
    payments: t.payments.length,
    accounts: t.money_accounts.length,
    moneyEntries: t.money_entries.length,
  };
}

/**
 * Safe file name: "WorkAndWallet-backup-12-Nov-26-1035.json".
 *   dayLabel — '12-Nov-26', time — Date for the hhmm part
 */
export function backupFileName(dayLabel, time = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const day = String(dayLabel || '').replace(/[^A-Za-z0-9-]/g, '');
  const hhmm = `${pad(time.getHours())}${pad(time.getMinutes())}`;
  return `WorkAndWallet-backup-${day ? `${day}-` : ''}${hhmm}.json`;
}
