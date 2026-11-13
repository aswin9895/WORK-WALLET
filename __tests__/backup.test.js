/**
 * Backup / restore: the file format checks (domain/backup) and a full
 * round trip on real SQLite (node:sqlite stands in for op-sqlite, as in
 * db.test.js).
 */
jest.mock('@op-engineering/op-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const plain = rows => rows.map(r => ({ ...r }));
  const wrap = db => {
    const execute = async (sql, params = []) => {
      const st = db.prepare(sql);
      if (/^\s*(SELECT|PRAGMA|WITH)/i.test(sql)) {
        return { rows: plain(st.all(...params)), rowsAffected: 0 };
      }
      const res = st.run(...params);
      return {
        rows: [],
        insertId: Number(res.lastInsertRowid),
        rowsAffected: Number(res.changes),
      };
    };
    return {
      execute,
      transaction: async fn => {
        db.exec('BEGIN');
        try {
          await fn({ execute });
          db.exec('COMMIT');
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    };
  };
  return { open: () => wrap(new DatabaseSync(':memory:')) };
});

const {
  BACKUP_TABLES,
  BackupError,
  backupFileName,
  backupSummary,
  makeBackup,
  parseBackup,
} = require('../src/domain/backup');

function load() {
  let mods;
  jest.isolateModules(() => {
    mods = {
      database: require('../src/data/db/database'),
      repo: require('../src/data'),
    };
  });
  return mods;
}

async function seed(repo) {
  const cat = await repo.saveCatering({ name: 'NANMA', phone: '98470' });
  const me = await repo.savePerson({ name: 'Me', is_myself: true });
  const akhil = await repo.savePerson({
    name: 'Akhil',
    default_rate_amount: 650,
  });
  const work = await repo.saveWork({
    catering_id: cat,
    date: '2026-11-01',
    session: 'Lunch',
    place: 'Hall',
    lines: [
      { person_id: me, person_name: 'Me', rate_amount: 700, quantity: 1 },
      {
        person_id: akhil,
        person_name: 'Akhil',
        rate_amount: 650,
        quantity: 1,
        called_count: 2,
        called_amount: 600,
      },
    ],
    extras: [
      {
        name: 'Loading',
        amount: 100,
        people: [{ person_id: akhil, person_name: 'Akhil' }],
      },
      { name: 'Petrol', amount: 500, people: [] },
    ],
  });
  await repo.setCollected(work, '2026-11-02');
  await repo.addPayment({
    work_id: work,
    person_id: akhil,
    person_name: 'Akhil',
    amount: 300,
    paid_at: '2026-11-03',
  });
  return { cat, me, akhil, work };
}

async function dump(database) {
  const out = {};
  for (const t of BACKUP_TABLES) {
    out[t] = await database.query(`SELECT * FROM ${t} ORDER BY id`);
  }
  return out;
}

const meta = async (database, key) =>
  (await database.query('SELECT value FROM app_meta WHERE key = ?', [key]))[0]
    ?.value ?? null;

describe('backup file checks (domain/backup)', () => {
  const good = () =>
    makeBackup({
      schemaVersion: 6,
      tables: { caterings: [{ id: 1, name: 'A', uid: 'x' }] },
      meta: { myself_uid: null },
      now: new Date('2026-11-12T05:05:00.000Z'),
    });

  test('a good backup passes; every table is present', () => {
    const b = parseBackup(JSON.stringify(good()), 6);
    expect(b.createdAt).toBe('2026-11-12T05:05:00.000Z');
    expect(Object.keys(b.tables)).toEqual(BACKUP_TABLES);
    expect(backupSummary(b)).toMatchObject({ caterings: 1, works: 0 });
    // BOM from some file apps is fine
    expect(() => parseBackup(`﻿${JSON.stringify(good())}`, 6)).not.toThrow();
  });

  test('wrong, damaged and newer files are refused with clear messages', () => {
    const bad = (text, v = 6) => {
      try {
        parseBackup(text, v);
      } catch (e) {
        expect(e).toBeInstanceOf(BackupError);
        return e.message;
      }
      throw new Error('should have been refused');
    };
    expect(bad('not json')).toMatch(/not a Work & Wallet backup/);
    // backups made before the rename (app "WorkTracker") still restore
    expect(
      parseBackup(JSON.stringify({ ...good(), app: 'WorkTracker' }), 6).app,
    ).toBe('WorkTracker');
    expect(bad(JSON.stringify({ app: 'Other' }))).toMatch(/not a Work/);
    expect(bad(JSON.stringify({ ...good(), schemaVersion: 7 }))).toMatch(
      /newer version/,
    );
    expect(bad(JSON.stringify({ ...good(), format: 2 }))).toMatch(
      /newer version/,
    );
    expect(bad(JSON.stringify({ ...good(), schemaVersion: 5 }))).toMatch(
      /damaged/,
    );
    const noTable = good();
    delete noTable.tables.works;
    expect(bad(JSON.stringify(noTable))).toMatch(/damaged/);
    const dupId = good();
    dupId.tables.people = [{ id: 1 }, { id: 1 }];
    expect(bad(JSON.stringify(dupId))).toMatch(/damaged/);
    const objCell = good();
    objCell.tables.people = [{ id: 1, name: { x: 1 } }];
    expect(bad(JSON.stringify(objCell))).toMatch(/damaged/);
    const noId = good();
    noId.tables.people = [{ name: 'A' }];
    expect(bad(JSON.stringify(noId))).toMatch(/damaged/);
  });

  test('file name', () => {
    expect(backupFileName('12-Nov-26', new Date(2026, 10, 12, 9, 5))).toBe(
      'WorkAndWallet-backup-12-Nov-26-0905.json',
    );
  });
});

describe('backup + restore on the database', () => {
  test('restore brings back exactly the backed-up data (ids, uids, me)', async () => {
    const { database, repo } = load();
    await database.initDb();
    const { me } = await seed(repo);
    await repo.setMeta('theme_mode', 'dark');
    const deviceId = await meta(database, 'device_id');
    const before = await dump(database);

    // through JSON, like a real file
    const text = JSON.stringify(await repo.createBackupData());
    const backup = parseBackup(text, repo.currentSchemaVersion());
    expect(backup.schemaVersion).toBe(database.MIGRATIONS.length);
    expect(backup.meta.myself_uid).toBe(await meta(database, 'myself_uid'));
    expect(backup.tables.theme_mode).toBeUndefined();
    expect(JSON.stringify(backup)).not.toContain(deviceId);
    expect(backupSummary(backup)).toMatchObject({
      caterings: 1,
      works: 1,
      people: 2,
      payments: 1,
    });

    // change everything after the backup
    const extra = await repo.saveCatering({ name: 'Added later' });
    const extraUid = (
      await database.query('SELECT uid FROM caterings WHERE id = ?', [extra])
    )[0].uid;
    await repo.deletePerson(me);
    await repo.setMeta('theme_mode', 'light');

    await repo.restoreBackupData(backup);

    expect(await dump(database)).toEqual(before);
    expect(await meta(database, 'myself_uid')).toBe(backup.meta.myself_uid);
    expect((await repo.listPeople()).find(p => p.id === me).is_myself).toBe(1);
    // theme and device id untouched
    expect(await meta(database, 'theme_mode')).toBe('light');
    expect(await meta(database, 'device_id')).toBe(deviceId);
    // restored rows are not "deleted" for sync; the removed catering is
    const deleted = (
      await database.query('SELECT uid FROM sync_deletions')
    ).map(r => r.uid);
    expect(deleted).toContain(extraUid);
    for (const t of BACKUP_TABLES) {
      for (const row of before[t]) {
        expect(deleted).not.toContain(row.uid);
      }
    }
    // the app keeps working on restored data
    const w = (await repo.listAllWorks())[0];
    expect((await repo.getWork(w.id)).total).toBe(700 + 650 + 1200 + 600);
    const next = await repo.saveCatering({ name: 'After restore' });
    expect(next).toBeGreaterThan(extra);
    const [{ fk }] = await database.query(
      'SELECT COUNT(*) AS fk FROM pragma_foreign_key_check',
    );
    expect(fk).toBe(0);
  });

  test('a bad row fails the whole restore and changes nothing', async () => {
    const { database, repo } = load();
    await database.initDb();
    await seed(repo);
    const backup = parseBackup(
      JSON.stringify(await repo.createBackupData()),
      repo.currentSchemaVersion(),
    );
    await repo.saveCatering({ name: 'Current only' });
    const current = await dump(database);
    const myself = await meta(database, 'myself_uid');

    // a work line pointing at a work that isn't in the file
    backup.tables.work_lines[0].work_id = 999;
    await expect(repo.restoreBackupData(backup)).rejects.toThrow();
    expect(await dump(database)).toEqual(current);
    expect(await meta(database, 'myself_uid')).toBe(myself);

    // a missing required value
    const b2 = JSON.parse(JSON.stringify(backup));
    b2.tables.work_lines[0].work_id = backup.tables.works[0].id;
    b2.tables.caterings[0].name = null;
    await expect(repo.restoreBackupData(b2)).rejects.toThrow();
    expect(await dump(database)).toEqual(current);
  });

  test('"This is me" is cleared when the backup has no such person', async () => {
    const { database, repo } = load();
    await database.initDb();
    const empty = parseBackup(
      JSON.stringify(await repo.createBackupData()),
      repo.currentSchemaVersion(),
    );
    await seed(repo);
    expect(await meta(database, 'myself_uid')).not.toBeNull();
    await repo.restoreBackupData(empty);
    expect(await meta(database, 'myself_uid')).toBeNull();
    expect(await repo.listCaterings()).toEqual([]);
    expect(await repo.listPeople()).toEqual([]);
  });
});

describe('money data in backups (v7)', () => {
  test('money rows round-trip, incl. repayments and real-balance checks', async () => {
    const { database, repo } = load();
    await database.initDb();
    await seed(repo);
    const hdfc = await repo.saveMoneyAccount({
      name: 'HDFC',
      is_salary: true,
      opening_balance: 2418054,
      opening_date: '2026-10-31',
    });
    const sbi = await repo.saveMoneyAccount({
      name: 'SBI',
      opening_balance: 38335,
      opening_date: '2026-10-31',
    });
    const po = await repo.saveSavingsType({ name: 'Post office' });
    await repo.saveSalary({
      account_id: hdfc,
      amount: 2327500,
      date: '2026-10-31',
    });
    const lend = await repo.saveMoneyEntry({
      account_id: hdfc,
      type: 'lend',
      amount: 1006200,
      date: '2026-11-03',
      name: 'amma',
    });
    await repo.saveMoneyEntry({
      account_id: hdfc,
      type: 'repayment',
      amount: 500000,
      date: '2026-11-20',
      lend_id: lend,
    });
    await repo.saveMoneyEntry({
      account_id: sbi,
      type: 'savings',
      amount: 665000,
      date: '2026-11-02',
      savings_type_id: po,
    });
    await repo.saveFixedItem({
      name: 'Bike EMI',
      type: 'expense',
      amount: 628000,
      account_id: hdfc,
    });
    await repo.saveSalary(
      { account_id: hdfc, amount: 2400000, date: '2026-11-30' },
      [{ account_id: sbi, actual_balance: 1000 }],
    );
    const before = await dump(database);
    expect(before.money_entries).toHaveLength(5);
    const backup = parseBackup(
      JSON.stringify(await repo.createBackupData()),
      repo.currentSchemaVersion(),
    );
    expect(backupSummary(backup)).toMatchObject({
      accounts: 2,
      moneyEntries: 5,
    });
    // wipe money, then restore
    await repo.deleteMoneyEntry(lend);
    await repo.restoreBackupData(backup);
    expect(await dump(database)).toEqual(before);
    const data = await repo.getMoneyData();
    expect(data.checks).toHaveLength(1);
    expect(data.entries.find(e => e.type === 'repayment').lend_id).toBe(lend);
  });

  test('a backup from before money (v6) still restores; money is cleared', async () => {
    const { database, repo } = load();
    await database.initDb();
    await seed(repo);
    const v6 = JSON.parse(JSON.stringify(await repo.createBackupData()));
    v6.schemaVersion = 6;
    ['money_accounts', 'savings_types', 'money_fixed_items', 'money_entries', 'money_checks'].forEach(
      t => delete v6.tables[t],
    );
    await repo.saveMoneyAccount({
      name: 'HDFC',
      opening_balance: 0,
      opening_date: '2026-10-31',
    });
    const backup = parseBackup(JSON.stringify(v6), repo.currentSchemaVersion());
    expect(backup.tables.money_entries).toEqual([]);
    await repo.restoreBackupData(backup);
    expect((await repo.getMoneyData()).accounts).toEqual([]);
    expect((await repo.listCaterings()).length).toBe(1);
    // but a v7 backup missing a money table is damaged
    const bad = JSON.parse(JSON.stringify(await repo.createBackupData()));
    delete bad.tables.money_entries;
    expect(() =>
      parseBackup(JSON.stringify(bad), repo.currentSchemaVersion()),
    ).toThrow(/damaged/);
  });
});
