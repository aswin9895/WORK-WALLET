import React from 'react';
import { act, create } from 'react-test-renderer';
import ReportOptionsSheet from '../src/screens/report/ReportOptionsSheet';
import { SummaryTable, DetailsTable } from '../src/screens/report/ReportTables';

jest.mock('lucide-react-native', () => ({ SlidersHorizontal: 'Icon' }));
jest.mock('../src/theme', () => ({ useStyles: () => ({}) }));
jest.mock('../src/components/kit', () => ({ FormSheet: 'FormSheet' }));
jest.mock('../src/components/ui', () => ({ FixedText: 'FixedText' }));
jest.mock('../src/components/form/Combo', () => 'Combo');
jest.mock('../src/components/form/DateField', () => 'DateField');
const fields = {
  date: true,
  place: true,
  session: true,
  people: true,
  amounts: true,
  extras: true,
  total: true,
};

test('report dropdowns keep drafts and multi-select fields until Apply', async () => {
  const value = {
    type: 'summary',
    layout: 'table',
    status: 'all',
    range: 'all',
    fields,
  };
  const onApply = jest.fn();
  let tree;
  await act(async () => {
    tree = create(
      <ReportOptionsSheet value={value} onApply={onApply} onClose={() => {}} />,
    );
  });
  const combos = () => tree.root.findAllByType('Combo');
  expect(combos()).toHaveLength(5);
  expect(combos()[1].props.placeholder).toBe('Table view');
  expect(combos()[4].props.selectedKeys).toHaveLength(8);
  await act(async () => {
    combos()[1].props.onPick({ key: 'list' });
  });
  await act(async () => {
    combos()[4].props.onPick({ key: 'place' });
  });
  expect(value.fields.place).toBe(true);
  expect(onApply).not.toHaveBeenCalled();
  expect(combos()[4].props.selectedKeys).not.toContain('place');
  await act(async () => {
    tree.root.findByType('FormSheet').props.onSave();
  });
  expect(onApply).toHaveBeenLastCalledWith(
    expect.objectContaining({
      layout: 'list',
      fields: { ...fields, place: false },
    }),
  );
  await act(async () => {
    combos()[4].props.onPick({ key: '__all' });
  });
  expect(combos()[4].props.selectedKeys).toHaveLength(8);
  await act(async () => {
    tree.unmount();
  });
});

test('tables respect field visibility and retain Boys and extra recipients', async () => {
  const report = {
    peopleRows: [
      { key: 'p', label: 'Boys', quantity: '3', rate: '3 × ₹600', total: 1800 },
    ],
    extraRows: [
      {
        key: 'e',
        label: 'Loading',
        quantity: '1',
        rate: '₹100',
        total: 100,
        recipients: ['Aswin'],
        unassigned: false,
      },
    ],
    details: [
      {
        id: 1,
        date: '2026-11-12',
        place: 'Hall',
        session: 'Lunch',
        total: 1900,
        peopleRows: [
          {
            key: 'b',
            label: 'Boys (Aswin)',
            quantity: '3',
            rate: '₹600',
            total: 1800,
          },
        ],
        extraRows: [
          {
            key: 'e',
            label: 'Loading',
            quantity: '1',
            rate: '₹100',
            total: 100,
            recipients: ['Aswin'],
            unassigned: false,
          },
        ],
      },
    ],
  };
  let tree;
  const text = () =>
    tree.root
      .findAllByType('FixedText')
      .map(n => n.props.children)
      .join(' ');
  await act(async () => {
    tree = create(<SummaryTable report={report} fields={fields} />);
  });
  expect(text()).toContain('Boys');
  expect(text()).toContain('3 × ₹600');
  expect(text()).toContain('Aswin');
  await act(async () => {
    tree.update(
      <DetailsTable
        report={report}
        fields={{ ...fields, amounts: false, total: false, place: false }}
      />,
    );
  });
  expect(text()).toContain('Boys (Aswin)');
  expect(text()).toContain('Loading');
  expect(text()).not.toContain('₹');
  expect(text()).not.toContain('Hall');
  await act(async () => {
    tree.unmount();
  });
});
