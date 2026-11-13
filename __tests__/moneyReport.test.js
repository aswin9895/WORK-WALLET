/**
 * Money report tables (domain/moneyReport) and its PDF template
 * (export/moneyReportHtml).
 */
import {
  buildMoneyReport,
  defaultMoneyReportOptions,
  moneyReportPeriodLabel,
} from '../src/domain/moneyReport';
import { buildMoneyReportHtml } from '../src/export/moneyReportHtml';
import { buildPeriods } from '../src/domain/money';

const P = r => Math.round(r * 100);
const HDFC = {
  id: 1,
  name: 'HDFC',
  is_salary: 1,
  opening_balance: P(24180.54),
  opening_date: '2026-10-31',
};
const SBI = {
  id: 2,
  name: 'SBI <&>',
  is_salary: 0,
  opening_balance: P(383.35),
  opening_date: '2026-10-31',
};
let n = 1;
const e = (acc, type, r, date, extra = {}) => ({
  id: n++,
  account_id: acc.id,
  type,
  amount: P(r),
  date,
  ...extra,
});

function data() {
  n = 1;
  const amma = e(HDFC, 'lend', 10062, '2026-11-03', { name: 'amma' });
  const entries = [
    e(HDFC, 'salary', 23275, '2026-10-31', { for_month: '2026-11' }),
    e(HDFC, 'expense', 6280, '2026-11-01', { name: 'Bike EMI' }),
    amma,
    e(HDFC, 'repayment', 5000, '2026-11-20', { lend_id: amma.id }),
    e(SBI, 'savings', 6650, '2026-11-02', { savings_type_id: 1 }),
    e(SBI, 'expense', 140, '2026-11-04', { name: '<b>beer</b>' }),
    e(SBI, 'income', 7250, '2026-11-07', { name: 'Work' }),
    e(HDFC, 'salary', 24000, '2026-11-30'),
    e(HDFC, 'expense', 100, '2026-12-01', { name: 'Snacks' }),
  ];
  return {
    accounts: [HDFC, SBI],
    entries,
    checks: [
      { id: 1, salary_id: 8, account_id: SBI.id, actual_balance: P(840.35) },
    ],
    savingsTypes: [{ id: 1, name: 'Post office', opening_amount: P(1000) }],
    fixedItems: [],
  };
}

test('summary rows like the notes; entries signed; filters hide rows only', () => {
  const d = data();
  const [nov, dec] = buildPeriods(d.entries);
  const opts = { ...defaultMoneyReportOptions(nov.key, d.accounts) };
  const r = buildMoneyReport(d, opts);
  expect(r.months.map(m => m.label)).toEqual(['November 2026']);
  expect(moneyReportPeriodLabel(r)).toBe('November 2026');
  const sum = r.months[0].summary;
  expect(sum.columns.map(c => c.label)).toEqual(['Item', 'HDFC', 'SBI <&>']);
  const row = key => sum.rows.find(x => x.key === key)?.cells;
  expect(row('initial')).toMatchObject({ a1: '₹47,455.54', a2: '₹383.35' });
  expect(row('salaryRemaining')).toMatchObject({ a1: '₹11,933', a2: '—' });
  expect(row('lendOpen')).toMatchObject({ a1: '₹5,062' });
  // SBI: 383.35 − 6,650 − 140 + 7,250 = 843.35; bank showed 840.35 → −3
  expect(row('difference')).toMatchObject({ a2: '-₹3', a1: '—' });
  expect(row('closing').a2).toBe('₹840.35');
  const ent = r.months[0].entries;
  expect(ent.rows.map(x => x.cells.amount)).toEqual([
    '+₹23,275',
    '−₹6,280',
    '−₹6,650',
    '−₹10,062',
    '−₹140',
    '+₹7,250',
    '+₹5,000',
  ]);
  expect(ent.rows.find(x => x.cells.kind === 'Repaid').cells.what).toBe('amma');
  expect(ent.rows.find(x => x.cells.kind === 'Savings').cells.what).toBe(
    'Post office',
  );
  expect(r.savings.rows[0].cells.total).toBe('₹7,650');

  // only expenses, only SBI, two months
  const only = buildMoneyReport(d, {
    ...opts,
    to: dec.key,
    accounts: [SBI.id],
    types: ['expense'],
    savings: false,
  });
  expect(moneyReportPeriodLabel(only)).toBe('November 2026 – December 2026');
  expect(only.months[0].entries.rows).toHaveLength(1);
  expect(only.months[0].entries.columns.map(c => c.key)).not.toContain(
    'account',
  );
  expect(only.months[0].summary.rows.map(x => x.key)).not.toContain('income');
  // remaining still counts everything
  expect(
    only.months[0].summary.rows.find(x => x.key === 'closing').cells.a2,
  ).toBe('₹840.35');
  expect(only.savings).toBeNull();
  // no accounts chosen → empty
  expect(buildMoneyReport(d, { ...opts, accounts: [], savings: false }).empty).toBe(
    true,
  );
});

test('PDF: escaped text, month sections, savings, portrait CSS', () => {
  const d = data();
  const [nov] = buildPeriods(d.entries);
  const r = buildMoneyReport(d, defaultMoneyReportOptions(nov.key, d.accounts));
  const html = buildMoneyReportHtml(
    r,
    {
      typeLabel: 'Both',
      periodLabel: 'November 2026',
      accountsLabel: 'All accounts',
      generatedLabel: '13-Nov-26, 10:00',
    },
    {
      page: '#fff',
      text: '#111',
      muted: '#666',
      accent: '#e50',
      accentDark: '#c40',
      headBg: '#fed',
      zebra: '#fafafa',
      border: '#eee',
      totalBg: '#fff1e4',
      bannerBg: '#15121f',
      bannerText: '#ffffff',
      bannerMuted: '#d6d3d1',
      bannerAccent: '#fb923c',
    },
  );
  expect(html).toContain('<h2>November 2026</h2>');
  expect(html).toContain('31-Oct-26 – 29-Nov-26');
  expect(html).toContain('<h2>Savings totals</h2>');
  expect(html).toContain('size: A4 portrait');
  expect(html).toContain('SBI &lt;&amp;&gt;');
  expect(html).toContain('&lt;b&gt;beer&lt;/b&gt;');
  expect(html).not.toContain('<b>beer</b>');
  expect(html).toContain('Monthly salary remaining');
  expect(html).toContain('<h1>Work &amp; Wallet</h1>');
  expect(html).toContain('src="data:image/png;base64,');
});
