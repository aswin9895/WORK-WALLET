import {
  earningsDateRange,
  isMyselfEntry,
  paidEarnings,
} from '../src/domain/earnings';

test('earnings use payment dates and split personal vs other payments', () => {
  const data = {
    myself: { id: 1, name: 'Me' },
    payments: [
      {
        person_id: 1,
        person_name: 'Old name',
        paid_at: '2026-11-01',
        amount: 300,
      },
      {
        person_id: null,
        person_name: ' ME ',
        paid_at: '2026-11-30',
        amount: 200,
      },
      { person_id: 2, person_name: 'Me', paid_at: '2026-11-15', amount: 400 },
      { person_id: 1, person_name: 'Me', paid_at: '2026-12-01', amount: 100 },
    ],
  };
  expect(paidEarnings(data, 'myself', '2026-11-01', '2026-11-30')).toBe(500);
  expect(paidEarnings(data, 'people', '2026-11-01', '2026-11-30')).toBe(400);
  expect(paidEarnings(data, 'all', '2026-11-01', '2026-11-30')).toBe(900);
  expect(paidEarnings(data, 'all')).toBe(1000);
  expect(paidEarnings({ ...data, myself: null }, 'myself')).toBe(0);
  expect(isMyselfEntry({ person_id: 2, person_name: 'Me' }, data.myself)).toBe(
    false,
  );
});

test('month filters handle year and leap-year boundaries', () => {
  expect(earningsDateRange('last', null, null, new Date(2027, 0, 5))).toEqual([
    '2026-12-01',
    '2026-12-31',
  ]);
  expect(earningsDateRange('this', null, null, new Date(2028, 1, 5))).toEqual([
    '2028-02-01',
    '2028-02-29',
  ]);
  expect(earningsDateRange('all')).toEqual([null, null]);
  expect(earningsDateRange('custom', '2026-11-01', '2026-11-12')).toEqual([
    '2026-11-01',
    '2026-11-12',
  ]);
});
