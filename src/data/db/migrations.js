/**
 * Schema migrations. Each entry runs once, in order, inside a transaction,
 * with foreign keys OFF (see database.js). The version is PRAGMA user_version.
 *
 * RULES
 * - Only APPEND new migrations. Never edit or reorder old ones: phones have
 *   already run them.
 * - Never DROP a table other tables still reference (SQLite then rejects
 *   inserts into them) — rebuild the referencing table instead (see v2).
 * - New synced tables must get sync columns + triggers: add them to
 *   SYNCED_TABLES handling (see v6 / syncSql below).
 */
/** v1–v5 (kept exactly as shipped). */
const MIGRATIONS_V1_V5 = [
  // v1 — initial schema
  [
    `CREATE TABLE IF NOT EXISTS caterings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      default_rate_id INTEGER REFERENCES rates(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS extra_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_amount REAL
    )`,
    `CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      place TEXT,
      session TEXT,
      notes TEXT
    )`,
    // person_name / rate_name / rate_amount are copied at save time, so
    // editing or deleting a person or rate never changes old records.
    `CREATE TABLE IF NOT EXISTS work_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      person_name TEXT NOT NULL,
      rate_id INTEGER REFERENCES rates(id) ON DELETE SET NULL,
      rate_name TEXT NOT NULL,
      rate_amount REAL NOT NULL,
      quantity REAL NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
      date TEXT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT
    )`,
    'CREATE INDEX IF NOT EXISTS idx_works_catering ON works(catering_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_lines_work ON work_lines(work_id)',
    'CREATE INDEX IF NOT EXISTS idx_extras_catering ON extras(catering_id, date)',
    // Starter data (editable / deletable in Settings)
    "INSERT INTO rates (name, amount) VALUES ('Work', 700), ('Boys', 650), ('Loading', 100)",
    "INSERT INTO extra_types (name, default_amount) VALUES ('Petrol', NULL), ('Reimbursement', NULL), ('Work Extra', NULL)",
  ],
  // v2 — remove the Rates and Extra Types masters (owner types them directly).
  // A person's fixed rate is now stored on the person as label + amount.
  // people and work_lines are rebuilt so no foreign key points at the dropped
  // rates table (SQLite rejects inserts into such tables). Runs with
  // foreign_keys OFF (see initDb) so dropping the old tables cascades nothing.
  [
    `CREATE TABLE people_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      default_rate_name TEXT,
      default_rate_amount REAL
    )`,
    `INSERT INTO people_new (id, name, phone, default_rate_name, default_rate_amount)
     SELECT p.id, p.name, p.phone, r.name, r.amount
     FROM people p LEFT JOIN rates r ON r.id = p.default_rate_id`,
    'DROP TABLE people',
    'ALTER TABLE people_new RENAME TO people',
    `CREATE TABLE work_lines_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      person_name TEXT NOT NULL,
      rate_name TEXT NOT NULL,
      rate_amount REAL NOT NULL,
      quantity REAL NOT NULL DEFAULT 1
    )`,
    `INSERT INTO work_lines_new (id, work_id, person_id, person_name, rate_name, rate_amount, quantity)
     SELECT id, work_id, person_id, person_name, rate_name, rate_amount, quantity FROM work_lines`,
    'DROP TABLE work_lines',
    'ALTER TABLE work_lines_new RENAME TO work_lines',
    'CREATE INDEX IF NOT EXISTS idx_lines_work ON work_lines(work_id)',
    'DROP TABLE IF EXISTS extra_types',
    'DROP TABLE IF EXISTS rates',
  ],
  // v3 — "people called": a person can bring extra workers paid at their own
  // amount. Line total = rate_amount * quantity + called_count * called_amount.
  // rate_name is no longer typed (new lines store 'Work'); people's
  // default_rate_name is no longer used (fixed rate = amount only).
  [
    'ALTER TABLE work_lines ADD COLUMN called_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE work_lines ADD COLUMN called_amount REAL',
  ],
  // v4 — extras belong to a work (Petrol on Work A, nothing on Work B).
  // The owner chose to delete the old catering-level extras (test data).
  [
    'DROP TABLE IF EXISTS extras',
    `CREATE TABLE extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_extras_work ON extras(work_id)',
  ],
  // v5 — money tracking.
  //  works.collected_at: date the owner paid this work (NULL = to collect).
  //    Collection is all-or-nothing per work (owner's decision).
  //  extra_people: who an extra is paid to. Each person gets the extra's
  //    amount; with no people the extra is counted once (owner's own cost).
  //  payments: money paid to a person for a work. Keyed by work + person
  //    name (not by line id) so editing a work keeps its payments.
  [
    'ALTER TABLE works ADD COLUMN collected_at TEXT',
    `CREATE TABLE extra_people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extra_id INTEGER NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      person_name TEXT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_extra_people_extra ON extra_people(extra_id)',
    `CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      person_name TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    'CREATE INDEX IF NOT EXISTS idx_payments_work ON payments(work_id)',
  ],
];

/* ------------------------------------------------------------------------ */
/* v6 — sync-ready data (for a future backend)                              */
/* ------------------------------------------------------------------------ */

/** Catering tables made sync-ready in v6 (this list must never change). */
const V6_SYNCED_TABLES = [
  'caterings',
  'people',
  'works',
  'work_lines',
  'extras',
  'extra_people',
  'payments',
];

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"; // UTC ISO-8601, ms
const NEW_UID = 'lower(hex(randomblob(16)))'; // 32 hex chars, random

/**
 * SQL that makes a table sync-ready:
 *  - uid: permanent random id (never changes; the id a backend would use)
 *  - updated_at: set on insert and on every update (UTC)
 *  - deletions are logged in sync_deletions (also for cascade deletes)
 * Inserting with an explicit uid/updated_at (e.g. from a server) keeps them.
 */
export function syncSql(table) {
  return [
    `ALTER TABLE ${table} ADD COLUMN uid TEXT`,
    `ALTER TABLE ${table} ADD COLUMN updated_at TEXT`,
    `UPDATE ${table} SET uid = ${NEW_UID}, updated_at = ${NOW}`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_${table}_uid ON ${table}(uid)`,
    // only fills what the insert left empty
    `CREATE TRIGGER trg_${table}_ins AFTER INSERT ON ${table}
     WHEN NEW.uid IS NULL OR NEW.updated_at IS NULL
     BEGIN
       UPDATE ${table}
       SET uid = COALESCE(NEW.uid, ${NEW_UID}),
           updated_at = COALESCE(NEW.updated_at, ${NOW})
       WHERE id = NEW.id;
     END`,
    // stamps updated_at when the caller didn't set it; skips the insert
    // trigger's own fill-in update (OLD.uid is NULL there)
    `CREATE TRIGGER trg_${table}_upd AFTER UPDATE ON ${table}
     WHEN NEW.updated_at IS OLD.updated_at AND OLD.uid IS NOT NULL
     BEGIN
       UPDATE ${table} SET updated_at = ${NOW} WHERE id = NEW.id;
     END`,
    `CREATE TRIGGER trg_${table}_del AFTER DELETE ON ${table}
     BEGIN
       INSERT INTO sync_deletions (table_name, uid, deleted_at)
       VALUES ('${table}', OLD.uid, ${NOW});
     END`,
  ];
}

const V6_SYNC = [
  `CREATE TABLE sync_deletions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    uid TEXT,
    deleted_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sync_deletions_at ON sync_deletions(deleted_at)',
  // key/value settings: device_id, last sync time, theme choice, …
  `CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `INSERT INTO app_meta (key, value) VALUES ('device_id', ${NEW_UID})`,
  ...V6_SYNCED_TABLES.flatMap(syncSql),
];

/* ------------------------------------------------------------------------ */
/* v7 — money tracking (bank accounts, salary months, savings, lending)     */
/* ------------------------------------------------------------------------ */

/**
 * Money tables (sync-ready from the start). ALL money amounts are INTEGER
 * PAISE (₹1 = 100) so sums never drift; see src/domain/money.js.
 */
export const MONEY_TABLES = [
  'money_accounts',
  'savings_types',
  'money_fixed_items',
  'money_entries',
  'money_checks',
];

const V7_MONEY = [
  // HDFC (salary account), SBI … opening_balance in paise on opening_date
  `CREATE TABLE money_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_salary INTEGER NOT NULL DEFAULT 0,
    opening_balance INTEGER NOT NULL DEFAULT 0,
    opening_date TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Post office, Mutual fund … (owner-created); opening_amount = already saved
  `CREATE TABLE savings_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    opening_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Bike EMI, Sruthi EMI … added each salary month with one tap
  `CREATE TABLE money_fixed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'savings', 'lend')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    account_id INTEGER NOT NULL REFERENCES money_accounts(id) ON DELETE CASCADE,
    savings_type_id INTEGER REFERENCES savings_types(id) ON DELETE CASCADE,
    person TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // every money movement; salary rows start a salary month (for_month YYYY-MM);
  // repayment rows point at their lend row (lend_id)
  `CREATE TABLE money_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES money_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('salary', 'income', 'expense', 'savings',
      'withdrawal', 'lend', 'repayment')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL,
    name TEXT,
    note TEXT,
    for_month TEXT,
    savings_type_id INTEGER REFERENCES savings_types(id) ON DELETE RESTRICT,
    lend_id INTEGER REFERENCES money_entries(id) ON DELETE CASCADE,
    fixed_item_id INTEGER REFERENCES money_fixed_items(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS idx_money_entries_account ON money_entries(account_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_money_entries_lend ON money_entries(lend_id)',
  // real bank balance typed when a salary month closes (balance BEFORE that
  // salary's date); Missing / Extra = actual − what the entries add up to
  `CREATE TABLE money_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salary_id INTEGER NOT NULL REFERENCES money_entries(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES money_accounts(id) ON DELETE CASCADE,
    actual_balance INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (salary_id, account_id)
  )`,
  ...MONEY_TABLES.flatMap(syncSql),
];

/** Tables whose rows are synced. Each has uid + updated_at + triggers. */
export const SYNCED_TABLES = [...V6_SYNCED_TABLES, ...MONEY_TABLES];

/** All migrations in order. Append new ones at the END of this list. */
export const MIGRATIONS = [...MIGRATIONS_V1_V5, V6_SYNC, V7_MONEY];
