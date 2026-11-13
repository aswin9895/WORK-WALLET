/**
 * Runs the real database.js + repo.js against SQLite (Node's built-in
 * node:sqlite stands in for op-sqlite), so every query, migration and
 * foreign key is exercised exactly as on the phone.
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
  return {
    open: () => wrap(global.__seedDb || new DatabaseSync(':memory:')),
  };
});

const { DatabaseSync } = require('node:sqlite');

function load() {
  let mods;
  jest.isolateModules(() => {
    mods = {
      database: require('../src/data/db/database'),
      repo: require('../src/data'),
      report: require('../src/domain/report'),
    };
  });
  return mods;
}

afterEach(() => {
  delete global.__seedDb;
});

describe('fresh install', () => {
  test('every repo function works end to end', async () => {
    const { database, repo, report } = load();
    await database.initDb();

    // schema version + tables
    const [{ user_version }] = await database.query('PRAGMA user_version');
    expect(user_version).toBe(database.MIGRATIONS.length);
    const tables = (
      await database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%' ORDER BY name",
      )
    ).map(t => t.name);
    expect(tables).toEqual([
      'app_meta',
      'caterings',
      'extra_people',
      'extras',
      'money_accounts',
      'money_checks',
      'money_entries',
      'money_fixed_items',
      'payments',
      'people',
      'savings_types',
      'sync_deletions',
      'work_lines',
      'works',
    ]);
    const [{ foreign_keys }] = await database.query('PRAGMA foreign_keys');
    expect(foreign_keys).toBe(1);

    // caterings
    const nanma = await repo.saveCatering({
      name: ' NANMA ',
      phone: '',
      notes: '',
    });
    expect(await repo.getCatering(nanma)).toMatchObject({
      name: 'NANMA',
      phone: null,
    });
    await repo.saveCatering({
      id: nanma,
      name: 'NANMA',
      phone: '999',
      notes: 'x',
    });
    expect((await repo.getCatering(nanma)).phone).toBe('999');

    // people (fixed amount optional)
    const aswin = await repo.savePerson({
      name: 'Aswin',
      default_rate_amount: 700,
    });
    const akhil = await repo.savePerson({ name: 'Akhil' });
    await repo.savePerson({
      id: akhil,
      name: 'Akhil',
      phone: '1',
      default_rate_amount: '',
    });
    const people = await repo.listPeople();
    expect(people.map(p => [p.name, p.default_rate_amount])).toEqual([
      ['Akhil', null],
      ['Aswin', 700],
    ]);

    // works with people called
    const w1 = await repo.saveWork({
      catering_id: nanma,
      date: '2026-10-17',
      place: 'Work place',
      session: 'Lunch',
      notes: '',
      lines: [
        {
          person_id: aswin,
          person_name: 'Aswin',
          rate_amount: 700,
          quantity: 1,
          called_count: 3,
          called_amount: 600,
        },
        {
          person_id: akhil,
          person_name: 'Akhil',
          rate_amount: 700,
          quantity: 1,
          called_count: 0,
          called_amount: null,
        },
      ],
    });
    const w2 = await repo.saveWork({
      catering_id: nanma,
      date: '2026-10-25',
      place: '',
      session: 'Setting',
      notes: '',
      lines: [
        {
          person_id: aswin,
          person_name: 'Aswin',
          rate_amount: 400,
          quantity: 1,
          called_count: 0,
        },
      ],
    });

    let works = await repo.listWorks(nanma);
    expect(works.map(w => [w.id, w.total])).toEqual([
      [w2, 400],
      [w1, 700 + 3 * 600 + 700],
    ]);
    const got = await repo.getWork(w1);
    expect(got.place).toBe('Work place');
    expect(got.lines[0]).toMatchObject({
      rate_name: 'Work',
      called_count: 3,
      called_amount: 600,
    });
    expect(got.lines[1]).toMatchObject({
      called_count: 0,
      called_amount: null,
    });

    // edit a work (lines are replaced)
    await repo.saveWork({ ...got, lines: [got.lines[0]] });
    expect((await repo.getWork(w1)).lines).toHaveLength(1);
    works = await repo.listWorks(nanma);
    expect(works.find(w => w.id === w1).total).toBe(2500);

    // extras belong to a work: Petrol on w1, nothing on w2
    const w1Now = await repo.getWork(w1);
    expect(w1Now.extras).toEqual([]);
    await repo.saveWork({
      ...w1Now,
      extras: [
        { name: ' Petrol ', amount: 1000 },
        { name: 'Work Extra', amount: 50 },
      ],
    });
    const w1Saved = await repo.getWork(w1);
    expect(w1Saved.extras.map(x => [x.name, x.amount])).toEqual([
      ['Petrol', 1000],
      ['Work Extra', 50],
    ]);
    expect(w1Saved.lines).toHaveLength(1); // lines kept when extras change
    expect((await repo.getWork(w2)).extras).toEqual([]);
    works = await repo.listWorks(nanma);
    expect(
      works.map(w => [w.id, w.people_total, w.extra_total, w.total]),
    ).toEqual([
      [w2, 400, 0, 400],
      [w1, 2500, 1050, 3550],
    ]);

    // catering list total = SQL version of lineTotal + extras
    const [c] = await repo.listCaterings();
    expect(c).toMatchObject({
      work_count: 2,
      last_date: '2026-10-25',
      total: 2500 + 400 + 1050,
    });

    // report (all time, and a date range)
    const all = report.buildReport(await repo.getReportData(nanma));
    expect(all.grandTotal).toBe(2500 + 400 + 1050);
    expect(all.workRows.map(r => r.label)).toEqual([
      'Aswin – Work',
      "Aswin's people – Work",
      'Aswin – Setting',
    ]);
    const oct17 = report.buildReport(
      await repo.getReportData(nanma, '2026-10-17', '2026-10-17'),
    );
    expect(oct17.grandTotal).toBe(2500 + 1050); // w1 + its extras only
    expect(oct17.extraRows.map(x => x.label)).toEqual(['Petrol', 'Work Extra']);
    const oct25 = report.buildReport(
      await repo.getReportData(nanma, '2026-10-25', '2026-10-31'),
    );
    expect(oct25.grandTotal).toBe(400);
    expect(oct25.extraRows).toEqual([]);

    // deleting a person keeps their history
    await repo.deletePerson(aswin);
    expect((await repo.getWork(w1)).lines[0]).toMatchObject({
      person_id: null,
      person_name: 'Aswin',
    });

    // deletes + cascade
    await repo.saveWork({ ...(await repo.getWork(w1)), extras: [] });
    expect((await repo.getWork(w1)).extras).toEqual([]);
    await repo.saveWork({
      ...(await repo.getWork(w1)),
      extras: [{ name: 'Petrol', amount: 300 }],
    });
    await repo.deleteWork(w2);
    expect(await repo.getWork(w2)).toBeNull();
    await repo.deleteCatering(nanma);
    expect(await database.query('SELECT * FROM works')).toEqual([]);
    expect(await database.query('SELECT * FROM work_lines')).toEqual([]);
    expect(await database.query('SELECT * FROM extras')).toEqual([]);
  });
});

describe('upgrade from the first app version (v1)', () => {
  test('keeps data and everything still saves', async () => {
    const { database: seed } = load();
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    seed.MIGRATIONS[0].forEach(sql => db.exec(sql));
    db.exec('PRAGMA user_version = 1');
    db.exec(`
      INSERT INTO caterings(name) VALUES ('NANMA');
      INSERT INTO people(name, default_rate_id) VALUES ('Aswin', 1), ('Alan', NULL);
      INSERT INTO works(catering_id, date, session) VALUES (1, '2026-10-17', 'Lunch');
      INSERT INTO work_lines(work_id, person_id, person_name, rate_id, rate_name, rate_amount, quantity)
        VALUES (1, 1, 'Aswin', 1, 'Work', 700, 1), (1, NULL, 'Boys', 2, 'Boys', 650, 15);
      INSERT INTO extras(catering_id, date, name, amount) VALUES (1, '2026-10-17', 'Petrol', 500);
    `);
    global.__seedDb = db;

    const { database, repo } = load();
    await database.initDb();

    expect((await database.query('PRAGMA user_version'))[0].user_version).toBe(
      database.MIGRATIONS.length,
    );
    expect(
      (await repo.listPeople()).map(p => [p.name, p.default_rate_amount]),
    ).toEqual([
      ['Alan', null],
      ['Aswin', 700],
    ]);
    const old = await repo.getWork(1);
    expect(
      old.lines.map(l => [l.person_name, l.quantity, l.called_count]),
    ).toEqual([
      ['Aswin', 1, 0],
      ['Boys', 15, 0],
    ]);
    // old catering-level extras are deleted by v4 (owner's choice)
    expect(old.extras).toEqual([]);
    expect((await repo.listCaterings())[0].total).toBe(700 + 650 * 15);

    // saving into rebuilt tables works (this failed before the v2 rebuild)
    await repo.saveWork({
      ...old,
      lines: [
        ...old.lines,
        {
          person_id: 2,
          person_name: 'Alan',
          rate_amount: 700,
          quantity: 1,
          called_count: 2,
          called_amount: 600,
        },
      ],
      extras: [{ name: 'Petrol', amount: 500 }],
    });
    expect((await repo.listWorks(1))[0].total).toBe(
      700 + 9750 + 700 + 1200 + 500,
    );
    expect((await repo.listCaterings())[0].total).toBe(
      700 + 9750 + 700 + 1200 + 500,
    );
    await repo.savePerson({ name: 'New', default_rate_amount: 650 });
    const fk = await database.query('PRAGMA foreign_key_check');
    expect(fk).toEqual([]);
  });
});

describe('money: collected, extras paid to people, payments', () => {
  test('dues, payments, collection and totals stay correct', async () => {
    const { database, repo, report } = load();
    const {
      workDues,
      personDues,
      peopleSummary,
      workTotals,
    } = require('../src/domain/dues');
    await database.initDb();

    const cat = await repo.saveCatering({ name: 'NANMA' });
    const aswin = await repo.savePerson({ name: 'Aswin' });
    const akhil = await repo.savePerson({ name: 'Akhil' });
    const alan = await repo.savePerson({ name: 'Alan' });

    const line = (
      person_id,
      person_name,
      amt,
      called = 0,
      calledAmt = null,
    ) => ({
      person_id,
      person_name,
      rate_amount: amt,
      quantity: 1,
      called_count: called,
      called_amount: calledAmt,
    });

    // Work A: Aswin (+3 called at 600), Akhil; Loading ₹100 to Aswin, Akhil,
    // Alan; Petrol ₹500 to nobody (owner's own cost)
    const wa = await repo.saveWork({
      catering_id: cat,
      date: '2026-11-01',
      session: 'Lunch',
      lines: [line(aswin, 'Aswin', 700, 3, 600), line(akhil, 'Akhil', 700)],
      extras: [
        {
          name: 'Loading',
          amount: 100,
          people: [
            { person_id: aswin, person_name: 'Aswin' },
            { person_id: akhil, person_name: 'Akhil' },
            { person_id: alan, person_name: 'Alan' },
          ],
        },
        { name: 'Petrol', amount: 500, people: [] },
      ],
    });
    // Work B: Akhil only
    const wb = await repo.saveWork({
      catering_id: cat,
      date: '2026-11-02',
      session: 'Dinner',
      lines: [line(akhil, 'Akhil', 650)],
      extras: [],
    });

    let a = await repo.getWork(wa);
    const aTotal = 2500 + 700 + 300 + 500;
    expect(a.total).toBe(aTotal);
    expect(workTotals(a)).toEqual({ people: 3200, extras: 800, total: aTotal });
    expect(a.extras[0].people.map(p => p.person_name)).toEqual([
      'Aswin',
      'Akhil',
      'Alan',
    ]);

    let d = workDues(a);
    expect(d.rows.map(r => [r.name, r.due, r.pending])).toEqual([
      ['Aswin', 2600, 2600],
      ['Akhil', 800, 800],
      ['Alan', 100, 100],
    ]);
    expect(d.pending).toBe(3500); // Petrol (no person) is not payable

    // SQL totals == JS totals; nothing collected yet
    let [c] = await repo.listCaterings();
    expect(c.total).toBe(aTotal + 650);
    expect(c.to_collect).toBe(aTotal + 650);

    // collect work A
    await repo.setCollected(wa, '2026-11-05');
    [c] = await repo.listCaterings();
    expect(c.to_collect).toBe(650);
    expect((await repo.getWork(wa)).collected_at).toBe('2026-11-05');

    // part payment to Aswin, full to Alan
    await repo.addPayment({
      work_id: wa,
      person_id: aswin,
      person_name: 'Aswin',
      amount: 1000,
      paid_at: '2026-11-06',
    });
    await repo.addPayment({
      work_id: wa,
      person_id: alan,
      person_name: 'Alan',
      amount: 100,
      paid_at: '2026-11-06',
    });
    d = workDues(await repo.getWork(wa));
    expect(d.rows.map(r => [r.name, r.paid, r.pending])).toEqual([
      ['Aswin', 1000, 1600],
      ['Akhil', 0, 800],
      ['Alan', 100, 0],
    ]);

    // Akhil asks: his pending across this catering = 800 (A) + 650 (B)
    let works = await repo.listWorks(cat);
    let akhilDues = personDues(works, 'akhil');
    expect(akhilDues.pending).toBe(1450);
    expect(akhilDues.works.map(r => r.work.id).sort()).toEqual([wa, wb].sort());
    // pay only work B
    await repo.addPayments([
      {
        work_id: wb,
        person_id: akhil,
        person_name: 'Akhil',
        amount: 650,
        paid_at: '2026-11-07',
      },
    ]);
    works = await repo.listWorks(cat);
    expect(personDues(works, 'akhil').pending).toBe(800);
    expect(
      peopleSummary(works).map(p => [p.name, p.due, p.paid, p.pending]),
    ).toEqual([
      ['Aswin', 2600, 1000, 1600],
      ['Akhil', 1450, 650, 800],
      ['Alan', 100, 100, 0],
    ]);

    // editing the work keeps payments of people still on it, and keeps
    // the collected date
    a = await repo.getWork(wa);
    await repo.saveWork({
      ...a,
      notes: 'edited',
      extras: a.extras.map(e => ({ ...e, people: e.people })),
    });
    a = await repo.getWork(wa);
    expect(a.payments).toHaveLength(2);
    expect(a.collected_at).toBe('2026-11-05');

    // removing Alan from the Loading extra deletes his payment for this work
    await repo.saveWork({
      ...a,
      extras: [
        {
          name: 'Loading',
          amount: 100,
          people: a.extras[0].people.filter(p => p.person_name !== 'Alan'),
        },
        { name: 'Petrol', amount: 500, people: [] },
      ],
    });
    a = await repo.getWork(wa);
    expect(a.payments.map(p => p.person_name)).toEqual(['Aswin']);
    expect(a.total).toBe(2500 + 700 + 200 + 500);

    // undo a payment
    await repo.deletePayment(a.payments[0].id);
    expect((await repo.getWork(wa)).payments).toEqual([]);

    // report counts extras × people
    const r = report.buildReport(await repo.getReportData(cat));
    expect(r.extraRows).toEqual([
      { label: 'Loading', quantity: '—', rate: '—', total: 200 },
      { label: 'Petrol', quantity: '—', rate: '—', total: 500 },
    ]);
    [c] = await repo.listCaterings();
    expect(r.grandTotal).toBe(c.total);

    // home overview: status + exact to_pay (matches per-work dues)
    const emptyCat = await repo.saveCatering({ name: 'Empty' });
    let overview = await repo.listCateringsOverview();
    let mine = overview.find(x => x.id === cat);
    works = await repo.listWorks(cat);
    expect(mine.to_pay).toBe(
      works.reduce((t, x) => t + workDues(x).pending, 0),
    );
    expect(mine.status).toBe('pending');
    expect(overview.find(x => x.id === emptyCat)).toMatchObject({
      status: 'empty',
      to_pay: 0,
      work_count: 0,
    });

    // bulk: mark both works collected, then pay everything pending in both
    const { pendingPayments } = require('../src/domain/dues');
    await repo.setCollectedMany([wa, wb], '2026-11-10');
    [c] = await repo.listCaterings();
    expect(c.to_collect).toBe(0);
    works = await repo.listWorks(cat);
    expect(works.every(w => w.collected_at === '2026-11-10')).toBe(true);
    const bulk = pendingPayments(works, '2026-11-10');
    expect(bulk.map(p => [p.person_name, p.amount]).sort()).toEqual(
      [
        ['Aswin', 2600], // A: 2500 + Loading 100 (earlier payment undone)
        ['Akhil', 800], // A: 700 + Loading 100 (B already paid)
      ].sort(),
    );
    await repo.addPayments(bulk);
    works = await repo.listWorks(cat);
    expect(works.map(w => workDues(w).pending)).toEqual([0, 0]);
    expect(pendingPayments(works, '2026-11-10')).toEqual([]);
    overview = await repo.listCateringsOverview();
    mine = overview.find(x => x.id === cat);
    expect(mine).toMatchObject({ status: 'ok', to_pay: 0, to_collect: 0 });

    // deleting a work removes its extras, extra_people and payments
    await repo.deleteWork(wb);
    expect(
      await database.query('SELECT * FROM payments WHERE work_id = ?', [wb]),
    ).toEqual([]);
    await repo.deleteWork(wa);
    expect(await database.query('SELECT * FROM extra_people')).toEqual([]);
    expect(await database.query('SELECT * FROM extras')).toEqual([]);
    expect(await database.query('PRAGMA foreign_key_check')).toEqual([]);
  });
});

describe('work status filters', () => {
  test('myself persists uniquely, earnings include paid extras, and called workers are blocked', async () => {
    const { database, repo } = load();
    const { paidEarnings } = require('../src/domain/earnings');
    await database.initDb();
    const cat = await repo.saveCatering({ name: 'Earnings' });
    const me = await repo.savePerson({ name: 'Me', is_myself: true });
    const other = await repo.savePerson({ name: 'Other' });
    const work = {
      catering_id: cat,
      date: '2026-10-01',
      lines: [
        { person_id: me, person_name: 'Me', rate_amount: 700, quantity: 1 },
      ],
      extras: [
        {
          name: 'Petrol',
          amount: 100,
          people: [{ person_id: me, person_name: 'Me' }],
        },
      ],
    };
    const id = await repo.saveWork(work);
    await repo.setCollected(id, '2026-11-01');
    expect(paidEarnings(await repo.getEarningsData(), 'myself')).toBe(0);
    await repo.addPayment({
      work_id: id,
      person_id: me,
      person_name: 'Me',
      amount: 300,
      paid_at: '2026-11-02',
    });
    expect(paidEarnings(await repo.getEarningsData(), 'myself')).toBe(300);
    await repo.collectAndPayWorks([id], '2026-11-03');
    expect(paidEarnings(await repo.getEarningsData(), 'myself')).toBe(800);
    expect(
      paidEarnings(
        await repo.getEarningsData(),
        'myself',
        '2026-10-01',
        '2026-10-31',
      ),
    ).toBe(0);
    await repo.savePerson({ id: me, name: 'Renamed' });
    expect(paidEarnings(await repo.getEarningsData(), 'myself')).toBe(800);
    expect((await repo.listPeople()).find(p => p.id === me).is_myself).toBe(1);
    await expect(
      repo.saveWork({
        ...work,
        id,
        lines: [{ ...work.lines[0], called_count: 2, called_amount: 500 }],
      }),
    ).rejects.toThrow('People called cannot');
    expect((await repo.getWork(id)).lines[0].called_count).toBe(0);
    await expect(
      repo.saveWork({
        ...work,
        lines: [
          {
            person_name: ' renamed ',
            rate_amount: 700,
            called_count: 1,
            called_amount: 500,
          },
        ],
      }),
    ).rejects.toThrow('People called cannot');
    const calledId = await repo.saveWork({
      ...work,
      lines: [
        {
          person_id: other,
          person_name: 'Other',
          rate_amount: 500,
          called_count: 1,
          called_amount: 500,
        },
      ],
    });
    await expect(
      repo.savePerson({ id: other, name: 'Other', is_myself: true }),
    ).rejects.toThrow('saved works');
    expect((await repo.getEarningsData()).myself.id).toBe(me);
    await repo.deleteWork(calledId);
    await repo.savePerson({ id: other, name: 'Other', is_myself: true });
    expect(
      (await repo.listPeople()).filter(p => p.is_myself).map(p => p.id),
    ).toEqual([other]);
    expect(paidEarnings(await repo.getEarningsData(), 'people')).toBe(800);
    await repo.savePerson({ id: other, name: 'Other', is_myself: false });
    expect((await repo.getEarningsData()).myself).toBeNull();
    await repo.savePerson({ id: me, name: 'Renamed', is_myself: true });
    await repo.deletePerson(me);
    expect((await repo.getEarningsData()).myself).toBeNull();
    expect(paidEarnings(await repo.getEarningsData(), 'all')).toBe(800);
  });

  test('combined settlement preserves collection dates, avoids duplicate pay and rolls back on failure', async () => {
    const { database, repo } = load();
    await database.initDb();
    const cat = await repo.saveCatering({ name: 'Settlement' });
    const make = () =>
      repo.saveWork({
        catering_id: cat,
        date: '2026-11-01',
        lines: [{ person_name: 'A', rate_amount: 100, quantity: 1 }],
        extras: [
          { name: 'Loading', amount: 50, people: [{ person_name: 'B' }] },
        ],
      });
    const a = await make();
    const b = await make();
    await repo.setCollected(a, '2026-11-02');
    await repo.addPayment({
      work_id: a,
      person_name: 'A',
      amount: 40,
      paid_at: '2026-11-02',
    });
    await repo.collectAndPayWorks([a, b, a], '2026-11-03');
    expect((await repo.getWork(a)).collected_at).toBe('2026-11-02');
    expect((await repo.getWork(b)).collected_at).toBe('2026-11-03');
    expect((await repo.getWork(a)).payments.map(p => p.amount)).toEqual([
      40, 60, 50,
    ]);
    expect((await repo.getWork(b)).payments.map(p => p.amount)).toEqual([
      100, 50,
    ]);
    await repo.collectAndPayWorks([a, b], '2026-11-04');
    expect((await repo.getWork(a)).payments).toHaveLength(3);
    expect((await repo.getWork(b)).payments).toHaveLength(2);
    const c = await make();
    await database.run(`CREATE TRIGGER fail_settlement BEFORE INSERT ON payments
      WHEN NEW.person_name = 'B' BEGIN SELECT RAISE(ABORT, 'test failure'); END`);
    await expect(repo.collectAndPayWorks([c], '2026-11-05')).rejects.toThrow(
      'test failure',
    );
    expect((await repo.getWork(c)).collected_at).toBeNull();
    expect((await repo.getWork(c)).payments).toEqual([]);
  });

  test('list and report agree across collection, partial pay, extras and dates', async () => {
    const { database, repo, report } = load();
    const { matchesWorkFilter } = require('../src/domain/dues');
    await database.initDb();
    const cat = await repo.saveCatering({ name: 'Filters' });
    const otherCat = await repo.saveCatering({ name: 'Other' });
    const make = (cateringId, date, extrasOnly = false) =>
      repo.saveWork({
        catering_id: cateringId,
        date,
        lines: extrasOnly
          ? []
          : [{ person_name: 'A', rate_amount: 100, quantity: 1 }],
        extras: [
          { name: 'Loading', amount: 50, people: [{ person_name: 'A' }] },
        ],
      });
    const both = await make(cat, '2026-11-01');
    const collectOnly = await make(cat, '2026-11-02');
    const payOnly = await make(cat, '2026-11-03', true);
    const settled = await make(cat, '2026-11-04');
    await make(otherCat, '2026-11-02');
    await repo.setCollectedMany([payOnly, settled], '2026-11-05');
    const pay = (id, amount) =>
      repo.addPayment({
        work_id: id,
        person_name: 'A',
        amount,
        paid_at: '2026-11-05',
      });
    await pay(collectOnly, 150);
    await pay(payOnly, 20); // Still owes 30 for an extra-only work.
    await pay(settled, 150);
    const works = await repo.listWorks(cat);
    const expected = {
      all: [both, collectOnly, payOnly, settled],
      pending: [both, collectOnly, payOnly],
      to_collect: [both, collectOnly],
      to_pay: [both, payOnly],
      paid: [settled],
    };
    for (const [filter, ids] of Object.entries(expected)) {
      expect(
        works
          .filter(w => matchesWorkFilter(w, filter))
          .map(w => w.id)
          .sort(),
      ).toEqual([...ids].sort());
      expect(
        (await repo.getReportWorks(cat, null, null, filter)).map(w => w.id),
      ).toEqual(ids);
      const data = await repo.getReportData(cat, null, null, filter);
      expect(
        [
          ...new Set([...data.lines, ...data.extras].map(r => r.work_id)),
        ].sort(),
      ).toEqual([...ids].sort());
    }
    expect(
      (
        await repo.getReportWorks(cat, '2026-11-02', '2026-11-03', 'pending')
      ).map(w => w.id),
    ).toEqual([collectOnly, payOnly]);
    const dated = await repo.getReportData(
      cat,
      '2026-11-02',
      '2026-11-03',
      'pending',
    );
    expect(dated.lines.map(l => l.work_id)).toEqual([collectOnly]);
    expect(dated.extras.map(e => e.work_id)).toEqual([collectOnly, payOnly]);
    expect(report.buildReport(dated).grandTotal).toBe(200); // Full bill, not balance.
    expect(
      await repo.getReportData(cat, '2026-12-01', null, 'pending'),
    ).toEqual({ lines: [], extras: [] });
    await pay(payOnly, 30);
    expect(matchesWorkFilter(await repo.getWork(payOnly), 'paid')).toBe(true);
    await repo.setCollected(payOnly, null);
    expect(matchesWorkFilter(await repo.getWork(payOnly), 'pending')).toBe(
      true,
    );
    const ownCost = await repo.saveWork({
      catering_id: cat,
      date: '2026-11-06',
      lines: [],
      extras: [{ name: 'Petrol', amount: 50, people: [] }],
    });
    await repo.setCollected(ownCost, '2026-11-06');
    expect(matchesWorkFilter(await repo.getWork(ownCost), 'paid')).toBe(true);
  });
});

describe('sync-ready data (v6)', () => {
  test('uid, updated_at and deletion log', async () => {
    const { database, repo } = load();
    await database.initDb();
    const { SYNCED_TABLES, MONEY_TABLES } = require('../src/data/db/migrations');
    // money tables are synced too (rows tested in moneyDb.test.js)
    expect(SYNCED_TABLES).toEqual(expect.arrayContaining(MONEY_TABLES));
    const CATERING_TABLES = SYNCED_TABLES.filter(
      t => !MONEY_TABLES.includes(t),
    );

    const deviceId = await repo.getDeviceId();
    expect(deviceId).toMatch(/^[0-9a-f]{32}$/);

    const cat = await repo.saveCatering({ name: 'NANMA' });
    const p = await repo.savePerson({ name: 'Aswin' });
    const w = await repo.saveWork({
      catering_id: cat,
      date: '2026-11-01',
      lines: [
        { person_id: p, person_name: 'Aswin', rate_amount: 700, quantity: 1 },
      ],
      extras: [
        {
          name: 'Loading',
          amount: 100,
          people: [{ person_id: p, person_name: 'Aswin' }],
        },
      ],
    });
    await repo.addPayment({
      work_id: w,
      person_id: p,
      person_name: 'Aswin',
      amount: 100,
      paid_at: '2026-11-02',
    });

    // every synced row has a unique uid and an updated_at
    for (const table of CATERING_TABLES) {
      const rows = await database.query(`SELECT uid, updated_at FROM ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach(r => {
        expect(r.uid).toMatch(/^[0-9a-f]{32}$/);
        expect(r.updated_at).toMatch(/^\d{4}-\d\d-\d\dT/);
      });
    }

    // uid never changes; updated_at moves on every update
    const before = await repo.getCatering(cat);
    await database.query(
      "UPDATE caterings SET updated_at = '2000-01-01T00:00:00.000Z'",
    );
    await repo.saveCatering({ id: cat, name: 'NANMA 2' });
    const after = await repo.getCatering(cat);
    expect(after.uid).toBe(before.uid);
    expect(after.updated_at > '2000-01-01T00:00:00.000Z').toBe(true);

    // a row inserted with its own uid (e.g. from a server) keeps it
    await database.query(
      "INSERT INTO people (name, uid, updated_at) VALUES ('Server', 'abc123', '2025-01-01T00:00:00.000Z')",
    );
    const [server] = await database.query(
      "SELECT uid, updated_at FROM people WHERE name = 'Server'",
    );
    expect(server).toEqual({
      uid: 'abc123',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // only uid given → updated_at stamped; only updated_at given → uid made
    await database.query(
      "INSERT INTO people (name, uid) VALUES ('OnlyUid', 'u1')",
    );
    await database.query(
      "INSERT INTO people (name, updated_at) VALUES ('OnlyTime', '2024-05-05T00:00:00.000Z')",
    );
    const [onlyUid] = await database.query(
      "SELECT uid, updated_at FROM people WHERE name = 'OnlyUid'",
    );
    const [onlyTime] = await database.query(
      "SELECT uid, updated_at FROM people WHERE name = 'OnlyTime'",
    );
    expect(onlyUid.uid).toBe('u1');
    expect(onlyUid.updated_at).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(onlyTime.uid).toMatch(/^[0-9a-f]{32}$/);
    expect(onlyTime.updated_at).toBe('2024-05-05T00:00:00.000Z');

    // changes since a time
    const all = await repo.getChangesSince(null);
    expect(all.changes.works).toHaveLength(1);
    const none = await repo.getChangesSince('2999-01-01T00:00:00.000Z');
    expect(none.changes.caterings).toEqual([]);

    // deletes are logged, including cascade deletes
    const uids = {
      work: (await repo.getWork(w)).uid,
      lines: (await database.query('SELECT uid FROM work_lines')).map(
        r => r.uid,
      ),
      payments: (await database.query('SELECT uid FROM payments')).map(
        r => r.uid,
      ),
    };
    await repo.deleteCatering(cat);
    const del = await database.query(
      'SELECT table_name, uid FROM sync_deletions',
    );
    const logged = t => del.filter(d => d.table_name === t).map(d => d.uid);
    expect(logged('caterings')).toEqual([before.uid]);
    expect(logged('works')).toContain(uids.work);
    uids.lines.forEach(u => expect(logged('work_lines')).toContain(u));
    uids.payments.forEach(u => expect(logged('payments')).toContain(u));
    expect(logged('extras')).toHaveLength(1);
    expect(logged('extra_people')).toHaveLength(1);
    expect((await repo.getChangesSince(null)).deletions.length).toBe(
      del.length,
    );

    // app_meta
    await repo.setMeta('theme', 'default');
    expect(await repo.getMeta('theme')).toBe('default');
    await repo.setMeta('theme', 'blue');
    expect(await repo.getMeta('theme')).toBe('blue');
  });
});
