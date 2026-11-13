import { buildReport } from '../src/domain/report';
import { money, shortDate, qty } from '../src/utils/format';
import { lineTotal } from '../src/domain/lines';

const line = (
  person_name,
  rate_amount,
  {
    session = 'Lunch',
    quantity = 1,
    called_count = 0,
    called_amount = null,
  } = {},
) => ({
  person_name,
  rate_amount,
  quantity,
  called_count,
  called_amount,
  session,
});

const times = (n, fn) => Array.from({ length: n }, fn);

describe('format', () => {
  test('money uses Indian grouping', () => {
    expect(money(700)).toBe('₹700');
    expect(money(20650)).toBe('₹20,650');
    expect(money(1234567)).toBe('₹12,34,567');
    expect(money(12.5)).toBe('₹12.50');
  });
  test('shortDate has no weekday', () => {
    expect(shortDate('2026-10-17')).toBe('17/10/26');
  });
  test('qty', () => {
    expect(qty(1)).toBe('1');
    expect(qty(1.5)).toBe('1.5');
  });
});

describe('lineTotal', () => {
  test('own amount + people called × their amount', () => {
    expect(
      lineTotal({
        rate_amount: 700,
        quantity: 1,
        called_count: 3,
        called_amount: 600,
      }),
    ).toBe(2500);
  });
  test('no people called', () => {
    expect(
      lineTotal({
        rate_amount: 700,
        quantity: 1,
        called_count: 0,
        called_amount: null,
      }),
    ).toBe(700);
  });
  test('old entries with quantity still work', () => {
    expect(lineTotal({ rate_amount: 650, quantity: 15 })).toBe(9750);
  });
});

describe('buildReport', () => {
  // Rebuilds the sample "Work Payment Report" (grand total ₹20,650)
  const lines = [
    ...times(7, () => line('Aswin', 700)),
    line('Aswin', 400, { session: 'Setting' }),
    line('Aswin', 650, { session: 'Setting' }),
    ...times(3, () => line('Chakkara', 700)),
    line('Akshay', 700),
    line('Alan', 700),
    line('Boys', 650, { quantity: 15 }), // old-style entry
    line('Loading', 100, { quantity: 4 }),
  ];
  const extras = [
    { name: 'Petrol', amount: 600 },
    { name: 'Petrol', amount: 400 },
    { name: 'Work Extra', amount: 50 },
  ];
  const report = buildReport({ lines, extras });
  const row = label => report.workRows.find(r => r.label === label);

  test('grand total matches the sample', () => {
    expect(report.grandTotal).toBe(20650);
  });

  test('Setting session gets its own row', () => {
    expect(row('Aswin – Work')).toMatchObject({
      quantity: '7',
      rate: '₹700',
      total: 4900,
    });
    expect(row('Aswin – Setting')).toMatchObject({
      quantity: '2',
      rate: '₹400 + ₹650',
      total: 1050,
    });
  });

  test('person with only normal work shows just the name', () => {
    expect(row('Chakkara')).toMatchObject({ quantity: '3', total: 2100 });
    expect(row('Boys')).toMatchObject({
      quantity: '15',
      rate: '₹650',
      total: 9750,
    });
  });

  test('extras are grouped by name', () => {
    expect(report.extraRows).toEqual([
      { label: 'Petrol', quantity: '—', rate: '—', total: 1000 },
      { label: 'Work Extra', quantity: '—', rate: '—', total: 50 },
    ]);
  });

  test('people called get their own row right after the caller', () => {
    const r = buildReport({
      lines: [
        line('Aswin', 700, { called_count: 3, called_amount: 600 }),
        line('Akhil', 700),
        line('Aswin', 700, { called_count: 2, called_amount: 600 }),
      ],
      extras: [],
    });
    expect(r.workRows.map(x => x.label)).toEqual([
      'Aswin',
      "Aswin's people",
      'Akhil',
    ]);
    expect(r.workRows[0]).toMatchObject({
      quantity: '2',
      rate: '₹700',
      total: 1400,
    });
    expect(r.workRows[1]).toMatchObject({
      quantity: '5',
      rate: '₹600',
      total: 3000,
    });
    expect(r.grandTotal).toBe(1400 + 3000 + 700);
  });
});

describe('cateringStatus', () => {
  const { cateringStatus } = require('../src/domain/dues');
  test('empty / ok / pending', () => {
    expect(cateringStatus({ work_count: 0, to_collect: 0, to_pay: 0 })).toBe(
      'empty',
    );
    expect(cateringStatus({ work_count: 2, to_collect: 0, to_pay: 0 })).toBe(
      'ok',
    );
    expect(cateringStatus({ work_count: 2, to_collect: 500, to_pay: 0 })).toBe(
      'pending',
    );
    expect(cateringStatus({ work_count: 2, to_collect: 0, to_pay: 100 })).toBe(
      'pending',
    );
  });
});

describe('dayMonthYear', () => {
  const { dayMonthYear } = require('../src/utils/format');
  test('11-Nov-26 style', () => {
    expect(dayMonthYear('2026-11-11')).toBe('11-Nov-26');
    expect(dayMonthYear('2026-01-05')).toBe('05-Jan-26');
    expect(dayMonthYear(null)).toBe('—');
  });
});
