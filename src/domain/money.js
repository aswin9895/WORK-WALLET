/**
 * Money tracking — pure logic (no React, no SQL). Unit-tested.
 *
 * ALL amounts are INTEGER PAISE (₹1 = 100). Convert only at the edges:
 * toPaise('1,108.33') → 110833, moneyP(110833) → '₹1,108.33'.
 *
 * Owner's model (from their notes):
 * - Accounts: one SALARY account (HDFC) + normal accounts (SBI).
 * - A SALARY MONTH runs from a salary's date to the day before the next
 *   salary (salary day varies; spending on salary day belongs to the new
 *   month). Named by `for_month` (default: the month it mostly covers, see
 *   salaryMonthOf). All accounts share these months.
 * - Entry types and what they do:
 *     salary      +balance  starts a salary month (salary account only)
 *     income      +balance  helps the month (interest, cashback, work …)
 *     expense     −balance  spending
 *     savings     −balance  to a savings type (Post office, Mutual fund …)
 *     withdrawal  +balance  back from a savings type (not income)
 *     lend        −balance  "Will get back" from a person (lowers its month until repaid)
 *     repayment   +balance  part/all of a lend repaid, same account
 * - Monthly salary remaining (salary account) =
 *     salary + income − expenses − savings − will-get-back given this month
 *     and not repaid yet (a repayment counts for the month the money was
 *     given in, even if it comes later)   (can be negative)
 * - Closing a month: the owner types each bank's real balance (a "check",
 *   balance BEFORE the new salary's date). Missing / Extra =
 *   real − what the entries add up to. Later balances continue from the
 *   real balance.
 */
import { dayMonthYear, fromIso, money, parseNum, toIso } from '@/utils/format';

export const ENTRY_TYPES = Object.freeze({
  salary: { sign: 1, label: 'Salary' },
  income: { sign: 1, label: 'Income' },
  expense: { sign: -1, label: 'Expense' },
  savings: { sign: -1, label: 'Savings' },
  withdrawal: { sign: 1, label: 'Savings withdrawal' },
  lend: { sign: -1, label: 'Will get back' },
  repayment: { sign: 1, label: 'Repaid' },
});
export const ENTRY_TYPE_KEYS = Object.keys(ENTRY_TYPES);
/** Types the owner adds from "+ Add" (salary has its own flow, repayment
 * comes from the Will get back list). */
export const ADDABLE_TYPES = [
  'expense',
  'income',
  'savings',
  'withdrawal',
  'lend',
];
export const FIXED_ITEM_TYPES = ['expense', 'savings', 'lend'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/* ---------------------------------------------------------------------- */
/* amounts                                                                 */
/* ---------------------------------------------------------------------- */

/** '1,108.33' → 110833; '' / 'abc' / more than 2 decimals → NaN. */
export function toPaise(text) {
  const n = parseNum(text);
  if (!Number.isFinite(n)) {
    return NaN;
  }
  const p = Math.round(n * 100);
  // reject 1.234 (would silently round)
  return Math.abs(p - n * 100) > 1e-6 ? NaN : p;
}

/** 110833 → '₹1,108.33' */
export function moneyP(paise) {
  return money((Number(paise) || 0) / 100);
}

/** 110833 → '1108.33' (for editing in a text field) */
export function paiseText(paise) {
  if (paise === null || paise === undefined || paise === '') {
    return '';
  }
  const n = Math.round(Number(paise));
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}${rupees}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

/** Signed effect of an entry on its account's balance. */
export function signedAmount(entry) {
  const t = ENTRY_TYPES[entry.type];
  return t ? t.sign * entry.amount : 0;
}

/* ---------------------------------------------------------------------- */
/* salary months                                                           */
/* ---------------------------------------------------------------------- */

/** Salary on 30-Oct or 2-Nov → '2026-11' (day ≥ 15 counts for next month). */
export function salaryMonthOf(dateIso) {
  const [y, m, d] = dateIso.split('-').map(Number);
  if (d >= 15) {
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** '2026-11' → 'November 2026' */
export function monthName(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    return '—';
  }
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** 'YYYY-MM' options around a date, for the "For month" dropdown. */
export function monthOptions(dateIso) {
  const base = salaryMonthOf(dateIso);
  const [y, m] = base.split('-').map(Number);
  const out = [];
  for (let k = -2; k <= 1; k++) {
    const d = new Date(y, m - 1 + k, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}`;
    out.push({ value: ym, label: monthName(ym) });
  }
  return out;
}

const byDateThenId = (a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id;

/**
 * Salary months from the salary entries, oldest first:
 *   { key, salary, start, end, forMonth, label }
 *   end = next salary's date (exclusive) or null for the current month.
 * Entries before the first salary belong to a 'start' period
 * (key 'start', start null) — only listed when such entries exist.
 */
export function buildPeriods(entries) {
  const salaries = entries.filter(e => e.type === 'salary').sort(byDateThenId);
  const periods = salaries.map((salary, i) => ({
    key: `s${salary.id}`,
    salary,
    start: salary.date,
    end: salaries[i + 1] ? salaries[i + 1].date : null,
    forMonth: salary.for_month || salaryMonthOf(salary.date),
    label: monthName(salary.for_month || salaryMonthOf(salary.date)),
  }));
  const firstStart = periods.length ? periods[0].start : null;
  const hasEarly = entries.some(
    e => e.type !== 'salary' && (!firstStart || e.date < firstStart),
  );
  if (hasEarly || !periods.length) {
    periods.unshift({
      key: 'start',
      salary: null,
      start: null,
      end: firstStart,
      forMonth: null,
      label: periods.length ? 'Before first salary' : 'Before salary',
    });
  }
  return periods;
}

/** The period a date belongs to. */
export function periodOf(periods, dateIso) {
  return (
    periods.find(
      p => (!p.start || p.start <= dateIso) && (!p.end || dateIso < p.end),
    ) || periods[periods.length - 1]
  );
}

export const inPeriod = (period, dateIso) =>
  (!period.start || period.start <= dateIso) &&
  (!period.end || dateIso < period.end);

/* ---------------------------------------------------------------------- */
/* balances                                                                */
/* ---------------------------------------------------------------------- */

/** Real-balance checks of one account, with their salary date, oldest first. */
function accountChecks(accountId, checks, entries) {
  const salaryDate = {};
  entries.forEach(e => {
    if (e.type === 'salary') {
      salaryDate[e.id] = e.date;
    }
  });
  return checks
    .filter(c => c.account_id === accountId && salaryDate[c.salary_id])
    .map(c => ({ ...c, date: salaryDate[c.salary_id] }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Balance of an account from its entries BEFORE `beforeDate` (exclusive;
 * null = all entries), continuing from the latest real-balance check at or
 * before that date. ignoreCheckAt: a salary date whose check is skipped
 * (used to compute the Missing / Extra of that very check).
 */
export function balanceBefore(
  account,
  entries,
  checks,
  beforeDate = null,
  ignoreCheckAt = null,
) {
  const own = accountChecks(account.id, checks, entries).filter(
    c =>
      (!beforeDate || c.date <= beforeDate) &&
      (!ignoreCheckAt || c.date !== ignoreCheckAt),
  );
  const anchor = own[own.length - 1];
  let total = anchor ? anchor.actual_balance : account.opening_balance;
  const from = anchor ? anchor.date : null;
  for (const e of entries) {
    if (
      e.account_id === account.id &&
      (!from || e.date >= from) &&
      (!beforeDate || e.date < beforeDate)
    ) {
      total += signedAmount(e);
    }
  }
  return total;
}

/** Current balance (all entries). */
export const accountBalance = (account, entries, checks) =>
  balanceBefore(account, entries, checks, null);

const ZERO_TOTALS = () =>
  Object.fromEntries(ENTRY_TYPE_KEYS.map(k => [k, 0]));

/**
 * One account in one salary month — like a block of the owner's
 * "MONTHLY EXPENSE TOTAL" note:
 *   opening       balance when the month started (before its salary)
 *   initial       opening + salary (the notes' "Initial Balance")
 *   totals        per entry type
 *   computedEnd   what the entries add up to at the month's end
 *   actual        real balance typed when the month closed (or null)
 *   difference    actual − computedEnd (+ Extra / − Missing), or null
 *   closing       actual ?? computedEnd ("Remaining" / "Total remaining")
 *   lendOpen      given (will get back) in THIS month and not repaid yet —
 *                 repayments count for the month the money was given in,
 *                 whenever they come (owner's choice)
 *   salaryRemaining (salary account only)
 *                 salary + income − expense − savings − lendOpen
 */
export function periodAccountSummary(account, period, entries, checks) {
  const opening = period.start
    ? balanceBefore(account, entries, checks, period.start)
    : account.opening_balance;
  const totals = ZERO_TOTALS();
  let count = 0;
  for (const e of entries) {
    if (e.account_id === account.id && inPeriod(period, e.date)) {
      totals[e.type] += e.amount;
      count += 1;
    }
  }
  // money given this month that hasn't come back yet (any repayment date)
  let lendOpen = 0;
  if (totals.lend) {
    lendStatus(entries).forEach(l => {
      if (l.lend.account_id === account.id && inPeriod(period, l.lend.date)) {
        lendOpen += Math.max(0, l.remaining);
      }
    });
  }
  const computedEnd =
    opening +
    ENTRY_TYPE_KEYS.reduce(
      (sum, k) => sum + ENTRY_TYPES[k].sign * totals[k],
      0,
    );
  let actual = null;
  if (period.end) {
    const check = accountChecks(account.id, checks, entries).find(
      c => c.date === period.end,
    );
    actual = check ? check.actual_balance : null;
  }
  return {
    account,
    opening,
    initial: opening + totals.salary,
    totals,
    count,
    computedEnd,
    actual,
    difference: actual === null ? null : actual - computedEnd,
    closing: actual === null ? computedEnd : actual,
    lendOpen,
    salaryRemaining: account.is_salary
      ? totals.salary +
        totals.income -
        totals.expense -
        totals.savings -
        lendOpen
      : null,
  };
}

/** Every account's summary for a period, salary account first. */
export function periodSummary(period, accounts, entries, checks) {
  return sortAccounts(accounts).map(a =>
    periodAccountSummary(a, period, entries, checks),
  );
}

/** Salary account first, then by sort order / name. */
export function sortAccounts(accounts) {
  return [...accounts].sort(
    (a, b) =>
      (b.is_salary ? 1 : 0) - (a.is_salary ? 1 : 0) ||
      (a.sort_order || 0) - (b.sort_order || 0) ||
      String(a.name).localeCompare(String(b.name)),
  );
}

/**
 * What the Missing / Extra of a new check WOULD be (Got salary screen):
 * real balance typed − the account's balance from entries before `date`.
 */
export function checkDifference(account, entries, checks, date, actual) {
  return actual - balanceBefore(account, entries, checks, date, date);
}

/* ---------------------------------------------------------------------- */
/* will get back                                                           */
/* ---------------------------------------------------------------------- */

/** Every lend with its repayments, repaid and remaining (oldest first). */
export function lendStatus(entries) {
  const repaysBy = {};
  entries.forEach(e => {
    if (e.type === 'repayment' && e.lend_id) {
      (repaysBy[e.lend_id] = repaysBy[e.lend_id] || []).push(e);
    }
  });
  return entries
    .filter(e => e.type === 'lend')
    .sort(byDateThenId)
    .map(lend => {
      const repayments = (repaysBy[lend.id] || []).sort(byDateThenId);
      const repaid = repayments.reduce((s, r) => s + r.amount, 0);
      return {
        lend,
        repayments,
        repaid,
        remaining: lend.amount - repaid,
      };
    });
}

/** Open lends grouped by person (name, case-insensitive), most owed first. */
export function openLendsByPerson(entries) {
  const groups = new Map();
  lendStatus(entries)
    .filter(l => l.remaining > 0)
    .forEach(l => {
      const name = (l.lend.name || '').trim() || 'Someone';
      const key = name.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { name, items: [], remaining: 0 });
      }
      const g = groups.get(key);
      g.items.push(l);
      g.remaining += l.remaining;
    });
  return [...groups.values()].sort((a, b) => b.remaining - a.remaining);
}

/** Total still owed to the owner. */
export const totalOwed = entries =>
  lendStatus(entries).reduce((s, l) => s + Math.max(0, l.remaining), 0);

/* ---------------------------------------------------------------------- */
/* savings                                                                 */
/* ---------------------------------------------------------------------- */

/** Per savings type: opening + saved − withdrawn. */
export function savingsTotals(types, entries) {
  return types.map(t => {
    let saved = 0;
    let withdrawn = 0;
    entries.forEach(e => {
      if (e.savings_type_id === t.id) {
        if (e.type === 'savings') {
          saved += e.amount;
        } else if (e.type === 'withdrawal') {
          withdrawn += e.amount;
        }
      }
    });
    return {
      type: t,
      saved,
      withdrawn,
      total: (t.opening_amount || 0) + saved - withdrawn,
    };
  });
}

/* ---------------------------------------------------------------------- */
/* fixed monthly items                                                     */
/* ---------------------------------------------------------------------- */

/** Active fixed items not yet added in this period. */
export function fixedItemsDue(fixedItems, entries, period) {
  const added = new Set(
    entries
      .filter(e => e.fixed_item_id && inPeriod(period, e.date))
      .map(e => e.fixed_item_id),
  );
  return fixedItems.filter(f => f.active && !added.has(f.id));
}

/** Entry made from a fixed item (date chosen by the caller). */
export function entryFromFixedItem(item, date) {
  return {
    account_id: item.account_id,
    type: item.type,
    amount: item.amount,
    date,
    name: item.type === 'lend' ? item.person || item.name : item.name,
    note: item.type === 'lend' ? item.name : null,
    savings_type_id: item.type === 'savings' ? item.savings_type_id : null,
    fixed_item_id: item.id,
  };
}

/* ---------------------------------------------------------------------- */
/* suggestions + checks                                                    */
/* ---------------------------------------------------------------------- */

/** Earlier names for a type, most used first (Combo suggestions). */
export function nameSuggestions(entries, type) {
  const counts = new Map();
  entries.forEach(e => {
    const name = (e.name || '').trim();
    if (e.type === type && name) {
      const key = name.toLowerCase();
      const c = counts.get(key) || { name, n: 0 };
      c.n += 1;
      counts.set(key, c);
    }
  });
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .map(c => c.name);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a money entry (everything except other rows' consistency, which
 * the repository checks with fresh data). Returns an error message or null.
 */
export function entryError(e) {
  if (!ENTRY_TYPES[e.type]) {
    return 'Choose what kind of entry this is.';
  }
  if (!Number.isInteger(e.amount) || e.amount <= 0) {
    return 'Enter an amount above ₹0 (up to 2 decimals).';
  }
  if (!e.date || !DATE_RE.test(e.date)) {
    return 'Pick a date.';
  }
  if (!e.account_id) {
    return 'Choose an account.';
  }
  if ((e.type === 'savings' || e.type === 'withdrawal') && !e.savings_type_id) {
    return 'Choose the savings type.';
  }
  if (e.type === 'lend' && !(e.name || '').trim()) {
    return 'Type who will give it back.';
  }
  if (e.type === 'repayment' && !e.lend_id) {
    return 'Choose what was repaid.';
  }
  if (e.type === 'salary' && e.for_month && !/^\d{4}-\d{2}$/.test(e.for_month)) {
    return 'Choose the month this salary is for.';
  }
  return null;
}

/* ---------------------------------------------------------------------- */
/* everything the Money home needs                                         */
/* ---------------------------------------------------------------------- */

/**
 * data = getMoneyData() result; today = 'YYYY-MM-DD'.
 * current = the salary month containing today.
 */
export function deriveMoney(data, today) {
  const accounts = sortAccounts(data.accounts);
  const periods = buildPeriods(data.entries);
  const current = periodOf(periods, today);
  const summaries = periodSummary(current, accounts, data.entries, data.checks);
  return {
    accounts,
    periods,
    current,
    summaries,
    salaryAccount: accounts.find(a => a.is_salary) || null,
    salarySummary: summaries.find(x => x.account.is_salary) || null,
    balances: Object.fromEntries(
      accounts.map(a => [a.id, accountBalance(a, data.entries, data.checks)]),
    ),
    owed: totalOwed(data.entries),
    lendGroups: openLendsByPerson(data.entries),
    savings: savingsTotals(data.savingsTypes, data.entries),
    fixedDue: fixedItemsDue(data.fixedItems, data.entries, current),
  };
}

/** Date range of a salary month: "31-Oct-26 – 29-Nov-26" / "since 31-Oct-26". */
export function periodDates(period) {
  if (!period.start) {
    return period.end ? `until ${dayMonthYear(period.end)}` : 'No salary yet';
  }
  if (!period.end) {
    return `Since ${dayMonthYear(period.start)}`;
  }
  const last = fromIso(period.end); // local time
  last.setDate(last.getDate() - 1);
  return `${dayMonthYear(period.start)} – ${dayMonthYear(toIso(last))}`;
}

/* ---------------------------------------------------------------------- */
/* sorting a statement (month screen)                                      */
/* ---------------------------------------------------------------------- */

/** Sort choices (owner's): default = date, newest first. */
export const ENTRY_SORTS = [
  { value: 'date_desc', label: 'Newest' },
  { value: 'date_asc', label: 'Oldest' },
  { value: 'in_first', label: 'In first' },
  { value: 'out_first', label: 'Out first' },
  { value: 'in_big', label: 'Biggest in' },
  { value: 'out_big', label: 'Biggest out' },
];
export const DEFAULT_ENTRY_SORT = 'date_desc';

/** True for date sorts (the list is grouped under date headings). */
export const isDateSort = sort => sort === 'date_desc' || sort === 'date_asc';

const newestFirst = (a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id;
const oldestFirst = (a, b) => -newestFirst(a, b);
const biggestFirst = (a, b) => b.amount - a.amount || newestFirst(a, b);
const isIn = e => (ENTRY_TYPES[e.type]?.sign || 0) > 0;

/**
 * New sorted array (the input is not changed).
 * Money in = salary, income, repaid, savings withdrawal (the "+" rows);
 * money out = expense, savings, will get back (the "−" rows).
 *   in_first / out_first — that group first, each group newest first
 *   in_big / out_big     — that group first, each group biggest first
 */
export function sortEntries(entries, sort = DEFAULT_ENTRY_SORT) {
  const list = [...entries];
  if (sort === 'date_asc') {
    return list.sort(oldestFirst);
  }
  if (!['in_first', 'out_first', 'in_big', 'out_big'].includes(sort)) {
    return list.sort(newestFirst);
  }
  const inFirst = sort === 'in_first' || sort === 'in_big';
  const within =
    sort === 'in_big' || sort === 'out_big' ? biggestFirst : newestFirst;
  return list.sort((a, b) => {
    const ga = isIn(a) === inFirst ? 0 : 1;
    const gb = isIn(b) === inFirst ? 0 : 1;
    return ga - gb || within(a, b);
  });
}

/** Statement filter (owner's): all / money in ("+" rows) / money out. */
export const ENTRY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' },
];

export function filterEntries(entries, filter = 'all') {
  if (filter === 'in') {
    return entries.filter(isIn);
  }
  if (filter === 'out') {
    return entries.filter(e => !isIn(e));
  }
  return entries;
}
