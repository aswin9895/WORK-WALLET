import React from 'react';
import { act, create } from 'react-test-renderer';
import EarningsFilterSheet from '../src/screens/caterings/home/EarningsFilterSheet';

jest.mock('lucide-react-native', () => ({ SlidersHorizontal: 'FilterIcon' }));

jest.mock('../src/theme', () => ({ useStyles: () => ({}) }));
jest.mock('../src/components/kit', () => ({
  FormSheet: 'FormSheet',
  SegmentedTabs: 'SegmentedTabs',
  ChoicePills: 'ChoicePills',
}));
jest.mock('../src/components/ui', () => ({ FixedText: 'FixedText' }));
jest.mock('../src/components/form/DateField', () => 'DateField');

test('filter changes stay drafts until Apply and invalid custom dates cannot apply', async () => {
  const value = {
    scope: 'myself',
    range: 'all',
    from: '2026-11-01',
    to: '2026-11-12',
  };
  const onApply = jest.fn();
  const onClose = jest.fn();
  let tree;
  await act(async () => {
    tree = create(
      <EarningsFilterSheet value={value} onApply={onApply} onClose={onClose} />,
    );
  });
  await act(async () => {
    tree.root.findByType('SegmentedTabs').props.onChange('people');
  });
  expect(onApply).not.toHaveBeenCalled();
  expect(value.scope).toBe('myself');
  await act(async () => {
    tree.root.findByType('FormSheet').props.onClose();
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onApply).not.toHaveBeenCalled();
  await act(async () => {
    tree.root.findByType('ChoicePills').props.onChange('custom');
  });
  await act(async () => {
    tree.root.findAllByType('DateField')[0].props.onChange('2026-12-01');
  });
  await act(async () => {
    tree.root.findByType('FormSheet').props.onSave();
  });
  expect(onApply).not.toHaveBeenCalled();
  await act(async () => {
    tree.root.findAllByType('DateField')[1].props.onChange('2026-12-31');
  });
  await act(async () => {
    tree.root.findByType('FormSheet').props.onSave();
  });
  expect(onApply).toHaveBeenCalledWith({
    scope: 'people',
    range: 'custom',
    from: '2026-12-01',
    to: '2026-12-31',
  });
  await act(async () => {
    tree.unmount();
  });
});
