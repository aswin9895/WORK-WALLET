/**
 * Money calculations (domain/money.js) with the owner's real November
 * notes: HDFC (salary account) + SBI.
 */
import {
  balanceBefore,
  buildPeriods,
  checkDifference,
  entryError,
  entryFromFixedItem,
  fixedItemsDue,
  lendStatus,
  monthName,
  moneyP,
  nameSuggestions,
  openLendsByPerson,
  paiseText,
  periodAccountSummary,
  periodOf,
  periodSummary,
  salaryMonthOf,
  savingsTotals,
  signedAmount,
  toPaise,
  totalOwed,
} from '../src/domain/money';

const P = rupees => Math.round(rupees * 100);
const HDFC = {
  id: 1,
  name: 'HDFC',
  is_salary: 1,
  opening_balance: P(24180.54),
  opening_date: '2026-10-31',
};
const SBI = {
  id: 2,
  name: 'SBI',
  is_salary: 0,
  opening_balance: P(383.35),
  opening_date: '2026-10-31',
};
let nextId = 1;
const e = (account, type, rupees, date, extra = {}) => ({
  id: nextId++,
  account_id: account.id,
  type,
  amount: P(rupees),
  date,
  ...extra,
});

function november() {
  nextId = 1;
  const salary = e(HDFC, 'salary', 23275, '2026-10-31', {
    for_month: '2026-11',
  });
  const sruthi = e(HDFC, 'lend', 6211, '2026-11-01', {
    name: 'Sruthi',
    note: 'EMI',
  });
  const amma = e(HDFC, 'lend', 10062, '2026-11-03', { name: 'amma' });
  const entries = [
    salary,
    e(HDFC, 'expense', 6280, '2026-11-01', { name: 'Bike EMI' }),
    sruthi,
    e(HDFC, 'expense', 3087, '2026-11-02', { name: 'Goa train ticket' }),
    e(HDFC, 'expense', 2000, '2026-11-02', { name: 'Goa advance' }),
    e(HDFC, 'savings', 2000, '2026-11-05', { savings_type_id: 1 }),
    e(HDFC, 'expense', 1304, '2026-11-06', { name: 'athirapally' }),
    e(HDFC, 'expense', 1108.33, '2026-11-08', { name: 'petrol' }),
    e(HDFC, 'expense', 498, '2026-11-09', { name: 'sling bag' }),
    e(HDFC, 'expense', 300, '2026-11-10', { name: 'snacks' }),
    amma,
    // SBI
    e(SBI, 'savings', 6650, '2026-11-02', { savings_type_id: 2 }),
    e(SBI, 'expense', 526.75, '2026-11-04', { name: 'movie' }),
    e(SBI, 'expense', 140, '2026-11-04', { name: 'beer' }),
    e(SBI, 'expense', 100, '2026-11-05', { name: 'sruthi' }),
    e(SBI, 'expense', 60, '2026-11-05', { name: 'snack' }),
    e(SBI, 'income', 36.44, '2026-11-06', { name: 'Cashback' }),
    e(SBI, 'income', 7250, '2026-11-07', { name: 'Work' }),
  ];
  return { entries, salary, sruthi, amma };
}

describe('amounts', () => {
  test('paise in, rupees out', () => {
    expect(toPaise('1,108.33')).toBe(110833);
    expect(toPaise('0.1')).toBe(10);
    expect(toPaise('47455.54')).toBe(4745554);
    expect(toPaise('-3')).toBe(-300);
    expect(toPaise('1.234')).toBeNaN();
    expect(toPaise('')).toBeNaN();
    expect(toPaise('abc')).toBeNaN();
    expect(moneyP(110833)).toBe('₹1,108.33');
    expect(moneyP(-300)).toBe('-₹3');
    expect(paiseText(110833)).toBe('1108.33');
    expect(paiseText(110805)).toBe('1108.05');
    expect(paiseText(700000)).toBe('7000');
    expect(paiseText(-5)).toBe('-0.05');
    expect(signedAmount({ type: 'lend', amount: 5 })).toBe(-5);
    expect(signedAmount({ type: 'withdrawal', amount: 5 })).toBe(5);
  });
});

describe('salary months', () => {
  test('salary late in a month is for the next month', () => {
    expect(salaryMonthOf('2026-10-31')).toBe('2026-11');
    expect(salaryMonthOf('2026-11-02')).toBe('2026-11');
    expect(salaryMonthOf('2026-12-30')).toBe('2027-01');
    expect(salaryMonthOf('2026-11-14')).toBe('2026-11');
    expect(salaryMonthOf('2026-11-15')).toBe('2026-12');
    expect(monthName('2026-11')).toBe('November 2026');
  });

  test('a month runs from salary day to the day before the next salary', () => {
    const { entries, salary } = november();
    const next = e(HDFC, 'salary', 24000, '2026-12-02');
    const periods = buildPeriods([...entries, next]);
    expect(periods.map(p => [p.key, p.start, p.end, p.label])).toEqual([
      [`s${salary.id}`, '2026-10-31', '2026-12-02', 'November 2026'],
      [`s${next.id}`, '2026-12-02', null, 'December 2026'],
    ]);
    // salary day spending goes to the new month
    expect(periodOf(periods, '2026-12-01').label).toBe('November 2026');
    expect(periodOf(periods, '2026-12-02').label).toBe('December 2026');
    // nothing yet → one open "Before salary" period
    expect(buildPeriods([]).map(p => p.key)).toEqual(['start']);
    // entries before the first salary get their own period
    const early = e(SBI, 'expense', 10, '2026-10-20');
    expect(buildPeriods([early, salary]).map(p => p.key)).toEqual([
      'start',
      `s${salary.id}`,
    ]);
  });
});

describe('November, like the owner\'s notes', () => {
  test('HDFC: initial 47,455.54; money given lowers salary remaining', () => {
    const { entries } = november();
    const [period] = buildPeriods(entries);
    const h = periodAccountSummary(HDFC, period, entries, []);
    expect(h.initial).toBe(P(47455.54));
    expect(h.totals.expense).toBe(P(14577.33));
    expect(h.totals.savings).toBe(P(2000));
    expect(h.totals.lend).toBe(P(16273));
    // salary + income − expenses − savings
    // 23,275 − 14,577.33 − 2,000 − (6,211 + 10,062 not repaid yet)
    expect(h.lendOpen).toBe(P(16273));
    expect(h.salaryRemaining).toBe(P(-9575.33));
    expect(h.computedEnd).toBe(P(14605.21));
    expect(h.actual).toBeNull();
    expect(h.closing).toBe(h.computedEnd);
  });

  // The note's items add up to 7,476.75 (its TOTAL says 7,616.75 — 140 too
  // much), so the real remaining is 193.04, not the note's 53.04.
  test('SBI: remaining from the items (193.04)', () => {
    const { entries } = november();
    const [period] = buildPeriods(entries);
    const sbi = periodAccountSummary(SBI, period, entries, []);
    expect(sbi.opening).toBe(P(383.35));
    expect(sbi.totals.expense).toBe(P(826.75));
    expect(sbi.totals.income).toBe(P(7286.44));
    expect(sbi.totals.savings).toBe(P(6650));
    expect(sbi.closing).toBe(P(193.04));
    expect(sbi.salaryRemaining).toBeNull();
    // salary account first
    expect(
      periodSummary(period, [SBI, HDFC], entries, []).map(x => x.account.name),
    ).toEqual(['HDFC', 'SBI']);
  });

  test('negative salary remaining when spending old money', () => {
    const { entries } = november();
    entries.push(e(HDFC, 'expense', 7000, '2026-11-20', { name: 'Phone' }));
    const [period] = buildPeriods(entries);
    expect(periodAccountSummary(HDFC, period, entries, []).salaryRemaining).toBe(
      P(-302.33 - 16273),
    );
  });

  test('closing with real balances: Missing / Extra, next month continues from real', () => {
    const { entries } = november();
    const dec = e(HDFC, 'salary', 24000, '2026-11-30');
    const all = [...entries, dec];
    // SBI bank shows 190.04 → 3 missing; HDFC matches
    expect(checkDifference(SBI, all, [], '2026-11-30', P(190.04))).toBe(P(-3));
    const checks = [
      { id: 1, salary_id: dec.id, account_id: SBI.id, actual_balance: P(190.04) },
      {
        id: 2,
        salary_id: dec.id,
        account_id: HDFC.id,
        actual_balance: P(14605.21),
      },
    ];
    const [nov, decP] = buildPeriods(all);
    const sbiNov = periodAccountSummary(SBI, nov, all, checks);
    expect(sbiNov.difference).toBe(P(-3));
    expect(sbiNov.closing).toBe(P(190.04));
    expect(periodAccountSummary(HDFC, nov, all, checks).difference).toBe(0);
    // December starts from the real balance
    const sbiDec = periodAccountSummary(SBI, decP, all, checks);
    expect(sbiDec.opening).toBe(P(190.04));
    expect(periodAccountSummary(HDFC, decP, all, checks).initial).toBe(
      P(14605.21 + 24000),
    );
    // a December entry moves the balance on from the real one
    all.push(e(SBI, 'expense', 10, '2026-12-01'));
    expect(balanceBefore(SBI, all, checks)).toBe(P(180.04));
    // editing a November entry later changes November's Missing, not December
    all.find(x => x.name === 'beer').amount = P(143);
    expect(periodAccountSummary(SBI, nov, all, checks).difference).toBe(0);
    expect(periodAccountSummary(SBI, decP, all, checks).opening).toBe(
      P(190.04),
    );
    // the check being typed is ignored when previewing its own difference
    expect(checkDifference(SBI, all, checks, '2026-11-30', P(190.04))).toBe(0);
  });
});

describe('will get back', () => {
  test('part repayments, carried to next month, grouped by person', () => {
    const { entries, amma, sruthi } = november();
    entries.push(
      e(HDFC, 'repayment', 5000, '2026-11-20', { lend_id: amma.id }),
      e(HDFC, 'repayment', 6211, '2026-11-25', { lend_id: sruthi.id }),
    );
    const status = lendStatus(entries);
    expect(status.map(l => [l.lend.name, l.repaid, l.remaining])).toEqual([
      ['Sruthi', P(6211), 0],
      ['amma', P(5000), P(5062)],
    ]);
    expect(openLendsByPerson(entries).map(g => [g.name, g.remaining])).toEqual(
      [['amma', P(5062)]],
    );
    expect(totalOwed(entries)).toBe(P(5062));
    // repaid money comes back into the month it was given in
    const [period] = buildPeriods(entries);
    const h = periodAccountSummary(HDFC, period, entries, []);
    expect(h.lendOpen).toBe(P(5062));
    expect(h.salaryRemaining).toBe(P(6697.67 - 5062));
    expect(h.computedEnd).toBe(P(14605.21 + 11211));
  });

  test('a repayment in a later month raises the month it was given in', () => {
    const { entries, amma } = november();
    const dec = e(HDFC, 'salary', 24000, '2026-11-30');
    entries.push(dec);
    let [nov, decP] = buildPeriods(entries);
    const before = periodAccountSummary(HDFC, nov, entries, []);
    const decBefore = periodAccountSummary(HDFC, decP, entries, []);
    // amma repays the rest in December
    entries.push(
      e(HDFC, 'repayment', 10062, '2026-12-05', { lend_id: amma.id }),
    );
    [nov, decP] = buildPeriods(entries);
    const after = periodAccountSummary(HDFC, nov, entries, []);
    const decAfter = periodAccountSummary(HDFC, decP, entries, []);
    expect(after.salaryRemaining - before.salaryRemaining).toBe(P(10062));
    expect(decAfter.salaryRemaining).toBe(decBefore.salaryRemaining);
    // ... while the money itself arrives in December's balance
    expect(decAfter.computedEnd - decBefore.computedEnd).toBe(P(10062));
    expect(decAfter.totals.repayment).toBe(P(10062));
    // SBI has no salary remaining at all
    expect(periodAccountSummary(SBI, nov, entries, []).salaryRemaining).toBeNull();
  });
});

describe('savings, fixed items, suggestions, checks', () => {
  test('savings totals include what was saved before the app', () => {
    const { entries } = november();
    entries.push(
      e(SBI, 'withdrawal', 1000, '2026-11-28', { savings_type_id: 2 }),
    );
    const types = [
      { id: 1, name: 'Mutual fund', opening_amount: P(10000) },
      { id: 2, name: 'Post office', opening_amount: 0 },
    ];
    expect(
      savingsTotals(types, entries).map(t => [t.type.name, t.total]),
    ).toEqual([
      ['Mutual fund', P(12000)],
      ['Post office', P(5650)],
    ]);
    // a withdrawal is not income: salary remaining unchanged for SBI
    const [period] = buildPeriods(entries);
    expect(periodAccountSummary(SBI, period, entries, []).totals.income).toBe(
      P(7286.44),
    );
  });

  test('fixed items: due until added this month, gone when ended', () => {
    const { entries } = november();
    const bike = {
      id: 1,
      name: 'Bike EMI',
      type: 'expense',
      amount: P(6280),
      account_id: HDFC.id,
      active: 1,
    };
    const sruthi = {
      id: 2,
      name: 'Sruthi EMI',
      type: 'lend',
      person: 'Sruthi',
      amount: P(6211),
      account_id: HDFC.id,
      active: 1,
    };
    const old = { ...bike, id: 3, name: 'Old loan', active: 0 };
    const [period] = buildPeriods(entries);
    expect(fixedItemsDue([bike, sruthi, old], entries, period)).toHaveLength(
      2,
    );
    const added = { id: 99, ...entryFromFixedItem(sruthi, '2026-11-01') };
    expect(added).toMatchObject({
      type: 'lend',
      name: 'Sruthi',
      note: 'Sruthi EMI',
      fixed_item_id: 2,
    });
    expect(
      fixedItemsDue([bike, sruthi], [...entries, added], period).map(
        f => f.id,
      ),
    ).toEqual([1]);
  });

  test('name suggestions and entry checks', () => {
    const { entries } = november();
    entries.push(e(SBI, 'expense', 50, '2026-11-09', { name: 'Snack ' }));
    expect(nameSuggestions(entries, 'expense').slice(0, 1)).toEqual(['snack']);
    expect(nameSuggestions(entries, 'lend')).toEqual(['amma', 'Sruthi']);
    const ok = {
      type: 'expense',
      amount: 100,
      date: '2026-11-01',
      account_id: 1,
    };
    expect(entryError(ok)).toBeNull();
    expect(entryError({ ...ok, amount: 0 })).toMatch(/amount/);
    expect(entryError({ ...ok, amount: 1.5 })).toMatch(/amount/);
    expect(entryError({ ...ok, date: '1-11-26' })).toMatch(/date/);
    expect(entryError({ ...ok, type: 'savings' })).toMatch(/savings/);
    expect(entryError({ ...ok, type: 'lend', name: ' ' })).toMatch(/who/);
    expect(entryError({ ...ok, type: 'repayment' })).toMatch(/repaid/);
    expect(entryError({ ...ok, type: 'x' })).toMatch(/kind/);
  });
});

describe('deriveMoney (Money home)', () => {
  test('current month, balances, owed, savings, fixed items due', () => {
    const { deriveMoney } = require('../src/domain/money');
    const { entries } = november();
    const d = deriveMoney(
      {
        accounts: [SBI, HDFC],
        entries,
        checks: [],
        savingsTypes: [{ id: 2, name: 'Post office', opening_amount: 0 }],
        fixedItems: [
          {
            id: 1,
            name: 'Bike EMI',
            type: 'expense',
            amount: P(6280),
            account_id: 1,
            active: 1,
          },
        ],
      },
      '2026-11-12',
    );
    expect(d.current.label).toBe('November 2026');
    expect(d.accounts.map(a => a.name)).toEqual(['HDFC', 'SBI']);
    expect(d.salaryAccount.name).toBe('HDFC');
    expect(d.salarySummary.salaryRemaining).toBe(P(-9575.33));
    expect(d.balances[SBI.id]).toBe(P(193.04));
    expect(d.owed).toBe(P(16273));
    expect(d.savings[0].total).toBe(P(6650));
    expect(d.fixedDue).toHaveLength(1);
  });
});

describe('amount fields (commas while typing)', () => {
  test('Indian grouping, 2 decimals, read back exactly', () => {
    const { formatAmountInput } = require('../src/utils/format');
    expect(formatAmountInput('4745554')).toBe('47,45,554');
    expect(formatAmountInput('47455.54')).toBe('47,455.54');
    expect(formatAmountInput('47,455.549')).toBe('47,455.54');
    expect(formatAmountInput('1000')).toBe('1,000');
    expect(formatAmountInput('100000')).toBe('1,00,000');
    expect(formatAmountInput('999')).toBe('999');
    expect(formatAmountInput('1.2.3')).toBe('1.23');
    expect(formatAmountInput('.5')).toBe('0.5');
    expect(formatAmountInput('1000.')).toBe('1,000.');
    expect(formatAmountInput('007')).toBe('7');
    expect(formatAmountInput('12a3')).toBe('123');
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('-3,000')).toBe('3,000');
    expect(formatAmountInput('-3000', true)).toBe('-3,000');
    expect(formatAmountInput('5-0', true)).toBe('50');
    // what the field shows reads back to the same paise
    expect(toPaise(formatAmountInput('47455.54'))).toBe(4745554);
    expect(toPaise(formatAmountInput(paiseText(110805)))).toBe(110805);
    expect(toPaise(formatAmountInput('-1000.5', true))).toBe(-100050);
  });
});

describe('sorting a statement', () => {
  test('date, money in / out first, biggest first', () => {
    const { sortEntries, isDateSort } = require('../src/domain/money');
    const rows = [
      { id: 1, type: 'expense', amount: 500, date: '2026-11-02' },
      { id: 2, type: 'income', amount: 100, date: '2026-11-03' },
      { id: 3, type: 'lend', amount: 9000, date: '2026-11-01' },
      { id: 4, type: 'salary', amount: 2000, date: '2026-11-01' },
      { id: 5, type: 'expense', amount: 500, date: '2026-11-04' },
      { id: 6, type: 'repayment', amount: 300, date: '2026-11-05' },
    ];
    const ids = sort => sortEntries(rows, sort).map(r => r.id);
    expect(ids('date_desc')).toEqual([6, 5, 2, 1, 4, 3]);
    expect(ids(undefined)).toEqual([6, 5, 2, 1, 4, 3]);
    expect(ids('date_asc')).toEqual([3, 4, 1, 2, 5, 6]);
    // in = salary, income, repayment; each group newest first
    expect(ids('in_first')).toEqual([6, 2, 4, 5, 1, 3]);
    expect(ids('out_first')).toEqual([5, 1, 3, 6, 2, 4]);
    // biggest first; equal amounts → newest first
    expect(ids('in_big')).toEqual([4, 6, 2, 3, 5, 1]);
    expect(ids('out_big')).toEqual([3, 5, 1, 4, 6, 2]);
    // input not changed
    expect(rows.map(r => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(isDateSort('date_asc')).toBe(true);
    expect(isDateSort('in_big')).toBe(false);
  });
});

describe('filtering a statement', () => {
  test('money in / money out / all', () => {
    const { filterEntries } = require('../src/domain/money');
    const rows = [
      { id: 1, type: 'expense', amount: 5 },
      { id: 2, type: 'income', amount: 5 },
      { id: 3, type: 'lend', amount: 5 },
      { id: 4, type: 'salary', amount: 5 },
      { id: 5, type: 'savings', amount: 5 },
      { id: 6, type: 'withdrawal', amount: 5 },
      { id: 7, type: 'repayment', amount: 5 },
    ];
    expect(filterEntries(rows, 'in').map(r => r.id)).toEqual([2, 4, 6, 7]);
    expect(filterEntries(rows, 'out').map(r => r.id)).toEqual([1, 3, 5]);
    expect(filterEntries(rows, 'all')).toHaveLength(7);
    expect(filterEntries(rows)).toHaveLength(7);
  });
});
