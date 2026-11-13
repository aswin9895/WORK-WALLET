/**
 * Money repository on real SQLite (node:sqlite stands in for op-sqlite):
 * every save / delete rule, salary close with real balances, will get back,
 * savings, fixed items, sync columns, and the catering data untouched.
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
  buildPeriods,
  fixedItemsDue,
  openLendsByPerson,
  periodAccountSummary,
  savingsTotals,
} = require('../src/domain/money');

const P = r => Math.round(r * 100);

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

async function setup() {
  const { database, repo } = load();
  await database.initDb();
  const hdfc = await repo.saveMoneyAccount({
    name: 'HDFC',
    is_salary: true,
    opening_balance: P(24180.54),
    opening_date: '2026-10-31',
  });
  const sbi = await repo.saveMoneyAccount({
    name: 'SBI',
    opening_balance: P(383.35),
    opening_date: '2026-10-31',
  });
  const mf = await repo.saveSavingsType({ name: 'Mutual fund' });
  const po = await repo.saveSavingsType({
    name: 'Post office',
    opening_amount: P(1000),
  });
  return { database, repo, hdfc, sbi, mf, po };
}

const add = (repo, account_id, type, rupees, date, extra = {}) =>
  repo.saveMoneyEntry({
    account_id,
    type,
    amount: P(rupees),
    date,
    ...extra,
  });

describe('money on SQLite', () => {
  test('a salary month end to end, with a real-balance close', async () => {
    const { database, repo, hdfc, sbi, mf, po } = await setup();
    await repo.saveSalary({
      account_id: hdfc,
      amount: P(23275),
      date: '2026-10-31',
    });
    await add(repo, hdfc, 'expense', 6280, '2026-11-01', { name: 'Bike EMI' });
    await add(repo, hdfc, 'savings', 2000, '2026-11-05', {
      savings_type_id: mf,
    });
    const amma = await add(repo, hdfc, 'lend', 10062, '2026-11-03', {
      name: 'amma',
    });
    await add(repo, sbi, 'savings', 6650, '2026-11-02', {
      savings_type_id: po,
    });
    await add(repo, sbi, 'income', 7250, '2026-11-07', { name: 'Work' });
    await add(repo, hdfc, 'repayment', 5000, '2026-11-20', { lend_id: amma });

    let data = await repo.getMoneyData();
    // salary month defaulted from the date
    expect(data.entries.find(e => e.type === 'salary').for_month).toBe(
      '2026-11',
    );
    let [nov] = buildPeriods(data.entries);
    const accounts = Object.fromEntries(data.accounts.map(a => [a.name, a]));
    const h = periodAccountSummary(accounts.HDFC, nov, data.entries, []);
    expect(h.initial).toBe(P(47455.54));
    // amma still owes 5,062 of what she got this month
    expect(h.salaryRemaining).toBe(P(23275 - 6280 - 2000 - 5062));
    expect(h.computedEnd).toBe(P(47455.54 - 6280 - 2000 - 10062 + 5000));

    // close November: next salary + real balances (SBI 3 short)
    const sbiEnd = periodAccountSummary(
      accounts.SBI,
      nov,
      data.entries,
      [],
    ).computedEnd;
    const dec = await repo.saveSalary(
      { account_id: hdfc, amount: P(24000), date: '2026-11-30' },
      [
        { account_id: sbi, actual_balance: sbiEnd - P(3) },
        { account_id: hdfc, actual_balance: null }, // not typed
      ],
    );
    data = await repo.getMoneyData();
    expect(data.checks).toHaveLength(1);
    [nov] = buildPeriods(data.entries);
    expect(
      periodAccountSummary(accounts.SBI, nov, data.entries, data.checks)
        .difference,
    ).toBe(P(-3));

    // edit the real balance later; then clear it
    await repo.saveChecks(dec, [
      { account_id: sbi, actual_balance: sbiEnd + P(2) },
    ]);
    data = await repo.getMoneyData();
    expect(
      periodAccountSummary(accounts.SBI, nov, data.entries, data.checks)
        .difference,
    ).toBe(P(2));
    await repo.saveChecks(dec, [{ account_id: sbi, actual_balance: null }]);
    expect((await repo.getMoneyData()).checks).toHaveLength(0);

    // deleting a salary removes its checks; its month joins the previous one
    await repo.saveChecks(dec, [{ account_id: sbi, actual_balance: 0 }]);
    await repo.deleteMoneyEntry(dec);
    data = await repo.getMoneyData();
    expect(data.checks).toHaveLength(0);
    expect(buildPeriods(data.entries)).toHaveLength(1);

    // savings totals + will get back
    expect(
      savingsTotals(data.savingsTypes, data.entries).map(t => [
        t.type.name,
        t.total,
      ]),
    ).toEqual([
      ['Mutual fund', P(2000)],
      ['Post office', P(7650)],
    ]);
    expect(openLendsByPerson(data.entries)[0].remaining).toBe(P(5062));

    // money rows are sync-ready; deleting logs them
    const [row] = await database.query(
      'SELECT uid, updated_at FROM money_entries LIMIT 1',
    );
    expect(row.uid).toMatch(/^[0-9a-f]{32}$/);
    expect(row.updated_at).toMatch(/^\d{4}-\d\d-\d\dT/);
    const changes = await repo.getChangesSince(null);
    expect(changes.changes.money_accounts).toHaveLength(2);
    // deleting a lend deletes its repayments too (both logged)
    await repo.deleteMoneyEntry(amma);
    const del = await database.query(
      "SELECT uid FROM sync_deletions WHERE table_name = 'money_entries'",
    );
    expect(del.length).toBeGreaterThanOrEqual(3); // dec salary, amma, repayment
    expect(
      (await repo.getMoneyData()).entries.filter(e => e.type === 'repayment'),
    ).toHaveLength(0);
  });

  test('rules: every wrong save is refused and changes nothing', async () => {
    const { repo, hdfc, sbi, mf } = await setup();
    const before = JSON.stringify(await repo.getMoneyData());
    const refuse = (p, msg) => expect(p).rejects.toThrow(msg);

    await refuse(
      repo.saveMoneyAccount({
        name: 'hdfc',
        opening_balance: 0,
        opening_date: '2026-10-31',
      }),
      /already exists/,
    );
    await refuse(
      repo.saveMoneyAccount({
        name: 'Other',
        is_salary: true,
        opening_balance: 0,
        opening_date: '2026-10-31',
      }),
      /already the salary account/,
    );
    await refuse(
      repo.saveMoneyAccount({
        name: 'X',
        opening_balance: 1.5,
        opening_date: '2026-10-31',
      }),
      /balance/,
    );
    // salary only to the salary account, one per date
    await refuse(
      repo.saveSalary({ account_id: sbi, amount: 100, date: '2026-11-01' }),
      /salary account/,
    );
    await refuse(
      add(repo, hdfc, 'expense', 10, '2026-10-01'),
      /starts on 2026-10-31/,
    );
    await refuse(add(repo, hdfc, 'expense', 0, '2026-11-01'), /amount/);
    await refuse(add(repo, hdfc, 'savings', 10, '2026-11-01'), /savings type/);
    await refuse(
      add(repo, hdfc, 'withdrawal', 10, '2026-11-01', { savings_type_id: mf }),
      /more than is saved in Mutual fund/,
    );
    expect(JSON.stringify(await repo.getMoneyData())).toBe(before);

    await repo.saveSalary({
      account_id: hdfc,
      amount: P(100),
      date: '2026-11-01',
    });
    await refuse(
      repo.saveSalary({ account_id: hdfc, amount: P(5), date: '2026-11-01' }),
      /already saved on this date/,
    );
    // repayments: same account, not before the lend, not more than given
    const lend = await add(repo, hdfc, 'lend', 100, '2026-11-05', {
      name: 'Sruthi',
    });
    await refuse(
      add(repo, sbi, 'repayment', 10, '2026-11-06', { lend_id: lend }),
      /account it was paid from/,
    );
    await refuse(
      add(repo, hdfc, 'repayment', 10, '2026-11-04', { lend_id: lend }),
      /can't be earlier/,
    );
    await refuse(
      add(repo, hdfc, 'repayment', 101, '2026-11-06', { lend_id: lend }),
      /more than was given/,
    );
    const rep = await add(repo, hdfc, 'repayment', 60, '2026-11-06', {
      lend_id: lend,
    });
    // the lend can't shrink below what's repaid, move account, or change type
    const lendRow = (await repo.getMoneyData()).entries.find(
      e => e.id === lend,
    );
    await refuse(
      repo.saveMoneyEntry({ ...lendRow, amount: P(50) }),
      /more than was given/,
    );
    await refuse(
      repo.saveMoneyEntry({ ...lendRow, account_id: sbi }),
      /already repaid some/,
    );
    await refuse(
      repo.saveMoneyEntry({ ...lendRow, type: 'expense' }),
      /must stay "Will get back"/,
    );
    // a salary can't become another type
    const sal = (await repo.getMoneyData()).entries.find(
      e => e.type === 'salary',
    );
    await refuse(
      repo.saveMoneyEntry({ ...sal, type: 'income' }),
      /Delete it instead/,
    );
    // the salary account can't stop being one while it has salaries
    await refuse(
      repo.saveMoneyAccount({
        id: hdfc,
        name: 'HDFC',
        is_salary: false,
        opening_balance: 0,
        opening_date: '2026-10-31',
      }),
      /must stay the salary account/,
    );
    // nor move its start after its entries
    await refuse(
      repo.saveMoneyAccount({
        id: hdfc,
        name: 'HDFC',
        is_salary: true,
        opening_balance: 0,
        opening_date: '2026-11-02',
      }),
      /can't be later/,
    );
    // used accounts / savings types can't be deleted
    await refuse(repo.deleteMoneyAccount(hdfc), /Delete those first/);
    await add(repo, hdfc, 'savings', 10, '2026-11-07', { savings_type_id: mf });
    await refuse(repo.deleteSavingsType(mf), /not deleted/);
    // savings type opening can't drop below what's withdrawn
    await add(repo, hdfc, 'withdrawal', 10, '2026-11-08', {
      savings_type_id: mf,
    });
    expect(await repo.deleteMoneyEntry(rep)).toBeUndefined();
    // deleting the savings deposit would leave the withdrawal negative
    const dep = (await repo.getMoneyData()).entries.find(
      e => e.type === 'savings',
    );
    await refuse(repo.deleteMoneyEntry(dep.id), /more than is saved/);
    // an unused account / savings type can go
    const tmp = await repo.saveMoneyAccount({
      name: 'Tmp',
      opening_balance: 0,
      opening_date: '2026-11-01',
    });
    await repo.deleteMoneyAccount(tmp);
    const st = await repo.saveSavingsType({ name: 'Gold' });
    await repo.deleteSavingsType(st);
    expect(
      (await repo.getMoneyData()).savingsTypes.map(t => t.name),
    ).toEqual(['Mutual fund', 'Post office']);
  });

  test('fixed items: add all once a month, edits keep the link, removal keeps entries', async () => {
    const { repo, hdfc } = await setup();
    await repo.saveSalary({
      account_id: hdfc,
      amount: P(23275),
      date: '2026-10-31',
    });
    const bike = await repo.saveFixedItem({
      name: 'Bike EMI',
      type: 'expense',
      amount: P(6280),
      account_id: hdfc,
    });
    const sruthi = await repo.saveFixedItem({
      name: 'Sruthi EMI',
      type: 'lend',
      person: 'Sruthi',
      amount: P(6211),
      account_id: hdfc,
    });
    await expect(
      repo.saveFixedItem({
        name: 'X',
        type: 'lend',
        amount: 5,
        account_id: hdfc,
      }),
    ).rejects.toThrow(/who will give/);

    let data = await repo.getMoneyData();
    let [nov] = buildPeriods(data.entries);
    expect(fixedItemsDue(data.fixedItems, data.entries, nov)).toHaveLength(2);
    await repo.addFixedItems([bike, sruthi], '2026-11-01');
    data = await repo.getMoneyData();
    [nov] = buildPeriods(data.entries);
    expect(fixedItemsDue(data.fixedItems, data.entries, nov)).toHaveLength(0);
    const lend = data.entries.find(e => e.type === 'lend');
    expect(lend).toMatchObject({ name: 'Sruthi', note: 'Sruthi EMI' });

    // editing the entry (form doesn't send fixed_item_id) keeps the link
    const { fixed_item_id, ...withoutLink } = lend;
    expect(fixed_item_id).toBe(sruthi);
    await repo.saveMoneyEntry({ ...withoutLink, amount: P(6000) });
    data = await repo.getMoneyData();
    expect(data.entries.find(e => e.id === lend.id).fixed_item_id).toBe(
      sruthi,
    );

    // ending and removing items; entries stay
    await repo.saveFixedItem({
      ...data.fixedItems.find(f => f.id === bike),
      active: false,
    });
    await repo.deleteFixedItem(sruthi);
    data = await repo.getMoneyData();
    expect(data.fixedItems.map(f => [f.name, f.active])).toEqual([
      ['Bike EMI', 0],
    ]);
    expect(data.entries.find(e => e.id === lend.id).fixed_item_id).toBeNull();
    expect(data.entries).toHaveLength(3);
  });

  test('catering data is not touched by money', async () => {
    const { repo, hdfc } = await setup();
    const cat = await repo.saveCatering({ name: 'NANMA' });
    await add(repo, hdfc, 'expense', 10, '2026-11-01');
    expect((await repo.listCaterings()).map(c => c.id)).toEqual([cat]);
    expect((await repo.getMoneyData()).entries).toHaveLength(1);
  });
});
