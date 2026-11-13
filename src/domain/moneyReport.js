/**
 * Money report as plain table data — ONE source for the screen
 * (MoneyReportScreen), the PDF (export/moneyReportHtml) and the image
 * (MoneyExportView). Same table model as domain/reportTableModel:
 *   column { key, label, size: name|qty|wide|date|money, align: left|right }
 *   row    { key, cells: { [columnKey]: string } }
 *
 * options:
 *   type      'summary' | 'entries' | 'both'
 *   from, to  salary-month keys (buildPeriods keys), inclusive
 *   accounts  account ids to show (empty = none)
 *   types     entry types to show (hides those rows / entries; balances and
 *             remaining always use ALL entries, like the catering report)
 *   savings   true → a "Savings totals" table at the end
 */
import {
  buildPeriods,
  ENTRY_TYPES,
  ENTRY_TYPE_KEYS,
  moneyP,
  periodSummary,
  savingsTotals,
  sortAccounts,
} from './money';
import { dayMonthYear } from '@/utils/format';

export const MONEY_REPORT_TYPES = [
  { value: 'summary', label: 'Month summary' },
  { value: 'entries', label: 'Entries' },
  { value: 'both', label: 'Both' },
];

/** Summary rows: [key, label, value(summary) → paise|null, entry type]. */
const SUMMARY_ROWS = [
  ['initial', 'Initial balance', x =>
    x.account.is_salary ? x.initial : x.opening],
  ['salary', 'Salary', x => (x.account.is_salary ? x.totals.salary : null), 'salary'],
  ['income', 'Income', x => x.totals.income, 'income'],
  ['expense', 'Expenses', x => x.totals.expense, 'expense'],
  ['savings', 'Savings', x => x.totals.savings, 'savings'],
  ['withdrawal', 'Taken from savings', x => x.totals.withdrawal, 'withdrawal'],
  ['lend', 'Given (will get back)', x => x.totals.lend, 'lend'],
  ['repayment', 'Repaid to you', x => x.totals.repayment, 'repayment'],
  ['lendOpen', 'Given this month, not repaid yet', x =>
    x.account.is_salary ? x.lendOpen : null, 'lend'],
  ['difference', 'Missing / Extra', x => x.difference],
  ['salaryRemaining', 'Monthly salary remaining', x => x.salaryRemaining],
  ['closing', 'Remaining', x => x.closing],
];

/** Default options: this salary month, everything. */
export function defaultMoneyReportOptions(periodKey, accounts) {
  return {
    type: 'both',
    from: periodKey,
    to: periodKey,
    accounts: accounts.map(a => a.id),
    types: [...ENTRY_TYPE_KEYS],
    savings: true,
  };
}

function summaryTable(period, accounts, data, options) {
  const sums = periodSummary(period, accounts, data.entries, data.checks);
  const columns = [
    { key: 'label', label: 'Item', size: 'wide', align: 'left' },
    ...sums.map(x => ({
      key: `a${x.account.id}`,
      label: x.account.name,
      size: 'money',
      align: 'right',
    })),
  ];
  const rows = [];
  for (const [key, label, get, type] of SUMMARY_ROWS) {
    if (type && !options.types.includes(type)) {
      continue;
    }
    const values = sums.map(get);
    // hide rows that are empty for every account (keep the main ones)
    const main = ['initial', 'expense', 'closing'].includes(key);
    if (!main && values.every(v => v === null || v === 0)) {
      continue;
    }
    const cells = { label: key === 'closing' && !period.end ? 'Balance now' : label };
    sums.forEach((x, i) => {
      cells[`a${x.account.id}`] = values[i] === null ? '—' : moneyP(values[i]);
    });
    rows.push({ key, cells, strong: key === 'closing' || key === 'salaryRemaining' });
  }
  return { columns, rows };
}

function entriesTable(period, accounts, data, options, savingsTypes, lendsById) {
  const ids = new Set(accounts.map(a => a.id));
  const name = id => accounts.find(a => a.id === id)?.name || '';
  const columns = [
    { key: 'date', label: 'Date', size: 'date', align: 'left' },
    ...(accounts.length > 1
      ? [{ key: 'account', label: 'Account', size: 'qty', align: 'left' }]
      : []),
    { key: 'kind', label: 'Kind', size: 'name', align: 'left' },
    { key: 'what', label: 'What / who', size: 'wide', align: 'left' },
    { key: 'amount', label: 'Amount', size: 'money', align: 'right' },
  ];
  const rows = data.entries
    .filter(
      e =>
        ids.has(e.account_id) &&
        options.types.includes(e.type) &&
        (!period.start || period.start <= e.date) &&
        (!period.end || e.date < period.end),
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
    .map(e => {
      const plus = ENTRY_TYPES[e.type].sign > 0;
      let what = e.name || '';
      if (e.type === 'savings' || e.type === 'withdrawal') {
        what = savingsTypes.find(t => t.id === e.savings_type_id)?.name || '';
      } else if (e.type === 'repayment') {
        what = lendsById[e.lend_id]?.name || '';
      }
      return {
        key: `e${e.id}`,
        cells: {
          date: dayMonthYear(e.date),
          account: name(e.account_id),
          kind: ENTRY_TYPES[e.type].label,
          what: [what, e.note].filter(Boolean).join(' · '),
          amount: `${plus ? '+' : '−'}${moneyP(e.amount)}`,
        },
      };
    });
  return { columns, rows };
}

/**
 * data = getMoneyData(); returns
 *   { months: [{ key, label, dates, summary, entries }], savings, empty }
 */
export function buildMoneyReport(data, options) {
  const periods = buildPeriods(data.entries);
  const keys = periods.map(p => p.key);
  let a = keys.indexOf(options.from);
  let b = keys.indexOf(options.to);
  if (a < 0) {
    a = keys.length - 1;
  }
  if (b < 0) {
    b = keys.length - 1;
  }
  if (a > b) {
    [a, b] = [b, a];
  }
  const accounts = sortAccounts(data.accounts).filter(acc =>
    options.accounts.includes(acc.id),
  );
  const lendsById = Object.fromEntries(
    data.entries.filter(e => e.type === 'lend').map(e => [e.id, e]),
  );
  const months = accounts.length
    ? periods.slice(a, b + 1).map(period => ({
        key: period.key,
        label: period.label,
        period,
        summary:
          options.type !== 'entries'
            ? summaryTable(period, accounts, data, options)
            : null,
        entries:
          options.type !== 'summary'
            ? entriesTable(
                period,
                accounts,
                data,
                options,
                data.savingsTypes,
                lendsById,
              )
            : null,
      }))
    : [];
  const savings =
    options.savings && data.savingsTypes.length
      ? {
          columns: [
            { key: 'name', label: 'Savings', size: 'wide', align: 'left' },
            { key: 'saved', label: 'Saved', size: 'money', align: 'right' },
            { key: 'out', label: 'Taken out', size: 'money', align: 'right' },
            { key: 'total', label: 'Total now', size: 'money', align: 'right' },
          ],
          rows: savingsTotals(data.savingsTypes, data.entries).map(x => ({
            key: `s${x.type.id}`,
            cells: {
              name: x.type.name,
              saved: moneyP((x.type.opening_amount || 0) + x.saved),
              out: moneyP(x.withdrawn),
              total: moneyP(x.total),
            },
          })),
        }
      : null;
  return { months, savings, empty: !months.length && !savings };
}

/** "November 2026" or "October 2026 – November 2026". */
export function moneyReportPeriodLabel(report) {
  if (!report.months.length) {
    return 'No months';
  }
  const first = report.months[0].label;
  const last = report.months[report.months.length - 1].label;
  return first === last ? first : `${first} – ${last}`;
}
