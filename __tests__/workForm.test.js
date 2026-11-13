import { extraPersonOptions, workFormSnapshot } from '../src/domain/workForm';
import { workPeopleCount } from '../src/domain/lines';

test('extra choices use work snapshots and preserve selected recipients, including deleted people', () => {
  const lines = [
    { person_id: 1, person_name: 'Aswin' },
    { person_id: null, person_name: 'Alan' },
  ];
  const selected = [
    { person_id: 1, person_name: ' ASWIN ' },
    { person_id: null, person_name: 'Typed person' },
  ];
  expect(extraPersonOptions(lines, selected).map(o => o.key)).toEqual([
    'aswin',
    'alan',
    'typed person',
  ]);
  expect(extraPersonOptions([], selected).map(o => o.label)).toEqual([
    ' ASWIN ',
    'Typed person',
  ]);
  expect(extraPersonOptions(lines)[1].p).toEqual({ id: null, name: 'Alan' });
});

test('attendance includes named quantities and called workers', () => {
  expect(workPeopleCount([])).toBe(0);
  expect(
    workPeopleCount([
      { quantity: 1, called_count: 3 },
      { quantity: 1, called_count: 2 },
    ]),
  ).toBe(7);
  expect(workPeopleCount([{ quantity: 15, called_count: 0 }])).toBe(15);
});

test('dirty snapshot ignores UI state but detects editable fields and added rows', () => {
  const form = {
    date: '2026-11-12',
    lines: [{ person_name: 'A', rate_amount: 700, quantity: 1 }],
    extras: [{ name: 'Petrol', amount: 100, people: [] }],
  };
  const base = workFormSnapshot(form);
  expect(
    workFormSnapshot({
      ...form,
      extras: [
        { ...form.extras[0], key: 'new', search: 'typing', amount: '100' },
      ],
    }),
  ).toBe(base);
  for (const patch of [
    { place: 'Hall' },
    { date: '2026-11-13' },
    { session: 'Lunch' },
    { notes: 'Test' },
    { lines: [] },
    { extras: [] },
  ]) {
    expect(workFormSnapshot({ ...form, ...patch })).not.toBe(base);
  }
  expect(
    workFormSnapshot({
      date: form.date,
      extras: [{ name: '', amount: '', people: [] }],
    }),
  ).not.toBe(workFormSnapshot({ date: form.date }));
});

describe('amount commas in the work form', () => {
  test('commas never count as an unsaved change; real edits still do', () => {
    const { amountText } = require('../src/utils/format');
    const saved = {
      date: '2026-11-12',
      extras: [{ name: 'Petrol', amount: 1000, people: [] }],
    };
    const shown = {
      date: '2026-11-12',
      extras: [{ name: 'Petrol', amount: amountText(1000), people: [] }],
    };
    expect(shown.extras[0].amount).toBe('1,000');
    expect(workFormSnapshot(shown)).toBe(workFormSnapshot(saved));
    expect(
      workFormSnapshot({
        ...shown,
        extras: [{ ...shown.extras[0], amount: '1,001' }],
      }),
    ).not.toBe(workFormSnapshot(saved));
    // an empty extra row still compares as text
    expect(
      workFormSnapshot({ ...shown, extras: [{ name: '', amount: '', people: [] }] }),
    ).not.toBe(workFormSnapshot(saved));
  });

  test('stored amounts show with commas, rounded to paise', () => {
    const { amountText, parseNum } = require('../src/utils/format');
    expect(amountText(700)).toBe('700');
    expect(amountText(12200)).toBe('12,200');
    expect(amountText(699.9999999)).toBe('700');
    expect(amountText(0.1 + 0.2)).toBe('0.3');
    expect(amountText(null)).toBe('');
    expect(amountText('')).toBe('');
    expect(parseNum(amountText(150000.5))).toBe(150000.5);
  });
});
