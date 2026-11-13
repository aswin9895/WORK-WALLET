import React from 'react';
import { act, create } from 'react-test-renderer';
import {
  SummaryTable,
  stretchedWidths,
} from '../src/screens/report/ReportTables';
import { DEFAULT_REPORT_OPTIONS } from '../src/screens/report/ReportOptionsSheet';

jest.mock('lucide-react-native', () => ({ SlidersHorizontal: 'Icon' }));
jest.mock('../src/components/kit', () => ({ FormSheet: 'FormSheet' }));
jest.mock('../src/components/ui', () => ({ FixedText: 'FixedText' }));
jest.mock('../src/components/form/Combo', () => 'Combo');
jest.mock('../src/components/form/DateField', () => 'DateField');
// theme widths, as in _report.scss
jest.mock('../src/theme', () => {
  const styles = {
    reportTableName: { width: 170 },
    reportTableQty: { width: 60 },
    reportTableWide: { width: 240 },
    reportTableMoney: { width: 125 },
  };
  return { useStyles: () => styles };
});

test('report opens on Both + To collect with every field shown', () => {
  expect(DEFAULT_REPORT_OPTIONS.type).toBe('both');
  expect(DEFAULT_REPORT_OPTIONS.status).toBe('to_collect');
  expect(DEFAULT_REPORT_OPTIONS.layout).toBe('table');
  expect(DEFAULT_REPORT_OPTIONS.range).toBe('all');
  expect(Object.values(DEFAULT_REPORT_OPTIONS.fields).every(Boolean)).toBe(
    true,
  );
});

test('stretchedWidths: stretch when there is room, keep widths otherwise', () => {
  expect(stretchedWidths([100, 100], 300)).toEqual([150, 150]);
  expect(stretchedWidths([100, 100], 150)).toEqual([100, 100]); // scroll
  expect(stretchedWidths([100, 100], 0)).toEqual([100, 100]); // not measured
  const out = stretchedWidths([170, 60, 240], 1000);
  expect(out.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1000);
});

test('table fills a wide (landscape) screen and scrolls on a narrow one', async () => {
  const report = {
    peopleRows: [
      { key: 'p', label: 'Aswin', quantity: '2', rate: '₹700', total: 1400 },
    ],
    extraRows: [],
  };
  const fields = { people: true, amounts: true, extras: false };
  let tree;
  await act(async () => {
    tree = create(<SummaryTable report={report} fields={fields} />);
  });
  // columns: name 170 + qty 60 + rate 240 + money 125 = 595
  const widthOf = () =>
    tree.root
      .findAllByType('FixedText')
      .slice(0, 4)
      .map(n =>
        n.props.style
          .filter(Boolean)
          .reduce((w, st) => (st.width ? st.width : w), 0),
      );
  const scroll = tree.root.findByProps({ horizontal: true });

  // portrait: 340 wide → keep theme widths (sideways scroll)
  await act(async () => {
    scroll.props.onLayout({ nativeEvent: { layout: { width: 340 } } });
  });
  expect(widthOf()).toEqual([170, 60, 240, 125]);

  // landscape: 800 wide → stretch to fill
  await act(async () => {
    scroll.props.onLayout({ nativeEvent: { layout: { width: 800 } } });
  });
  const wide = widthOf();
  expect(wide.reduce((a, b) => a + b, 0)).toBeGreaterThan(790);
  expect(wide.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(800);
  expect(wide[0]).toBeGreaterThan(170);
  await act(async () => {
    tree.unmount();
  });
});
