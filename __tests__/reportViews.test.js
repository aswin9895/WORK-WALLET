import { buildReportViews } from '../src/domain/reportViews';

const work = (id, session, lines = [], extras = []) => ({
  id,
  session,
  date: '2026-11-12',
  place: 'Hall',
  lines,
  extras,
});
const person = (id, name, called, amount) => ({
  id,
  person_name: name,
  quantity: 1,
  rate_amount: 700,
  called_count: called,
  called_amount: amount,
});

test('summary combines Boys with rate quantities; details retain each caller and extra recipients', () => {
  const works = [
    work(
      1,
      'Lunch',
      [person(1, 'Aswin', 3, 600), person(2, 'Akhil', 2, 650)],
      [
        {
          id: 1,
          name: 'Loading',
          amount: 100,
          people: [{ person_name: 'Aswin' }, { person_name: 'Akhil' }],
        },
        { id: 2, name: 'Petrol', amount: 300, people: [] },
      ],
    ),
  ];
  const report = buildReportViews(works);
  expect(report.peopleRows.find(r => r.label === 'Boys')).toMatchObject({
    quantity: '5',
    rate: '3 × ₹600 + 2 × ₹650',
    total: 3100,
  });
  expect(report.details[0].peopleRows.map(r => r.label)).toEqual([
    'Aswin',
    'Boys (Aswin)',
    'Akhil',
    'Boys (Akhil)',
  ]);
  expect(report.extraRows[0]).toMatchObject({
    total: 200,
    rate: '2 × ₹100',
    recipients: ['Aswin', 'Akhil'],
  });
  expect(report.details[0].extraRows[1]).toMatchObject({
    total: 300,
    recipients: [],
    unassigned: true,
  });
  expect(report.grandTotal).toBe(5000);
  expect(report.details[0].total).toBe(5000);
  expect(
    [...report.peopleRows, ...report.extraRows].reduce(
      (sum, r) => sum + r.total,
      0,
    ),
  ).toBe(5000);
});

test('same-date works remain separate, Setting remains separate, extras-only and empty works remain visible', () => {
  const report = buildReportViews([
    work(1, 'Lunch', [person(1, 'Aswin', 1, 600)]),
    work(2, 'Setting', [person(2, 'Aswin', 2, 400)]),
    work(3, 'Dinner', [], [{ id: 3, name: 'Petrol', amount: 50, people: [] }]),
    work(4, ''),
  ]);
  expect(report.details).toHaveLength(4);
  expect(report.peopleRows.map(r => r.label)).toEqual([
    'Aswin – Work',
    'Aswin – Setting',
    'Boys – Work',
    'Boys – Setting',
  ]);
  expect(report.grandTotal).toBe(2850);
  expect(report.details.map(w => w.total)).toEqual([1300, 1500, 50, 0]);
  expect(buildReportViews([])).toEqual({
    peopleRows: [],
    extraRows: [],
    details: [],
    grandTotal: 0,
  });
});
