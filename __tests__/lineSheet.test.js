import React from 'react';
import { act, create } from 'react-test-renderer';
import LineSheet from '../src/components/sheets/LineSheet';

jest.mock('../src/theme', () => ({ useStyles: () => ({}) }));
jest.mock('../src/components/sheets/Sheet', () => 'Sheet');
jest.mock('../src/components/form/Combo', () => 'Combo');
jest.mock('../src/components/form/Stepper', () => 'Stepper');
jest.mock('../src/components/ui', () => ({ Field: 'Field' }));
jest.mock('../src/data', () => ({ savePerson: jest.fn() }));

test('Myself has no called-workers stepper and cannot submit a called-workers line', async () => {
  const onSave = jest.fn();
  let tree;
  const props = {
    visible: true,
    people: [{ id: 1, name: 'Me', is_myself: 1 }],
    line: {
      person_id: 1,
      person_name: 'Me',
      rate_amount: 700,
      quantity: 1,
      called_count: 2,
      called_amount: 500,
    },
    onSave,
  };
  await act(async () => {
    tree = create(<LineSheet {...props} />);
  });
  expect(tree.root.findAllByType('Stepper')).toHaveLength(0);
  await act(async () => {
    tree.root.findByType('Sheet').props.onSave();
  });
  expect(onSave).not.toHaveBeenCalled();
  await act(async () => {
    tree.unmount();
  });
  await act(async () => {
    tree = create(
      <LineSheet
        {...props}
        line={{ ...props.line, person_id: 2, person_name: 'Other' }}
      />,
    );
  });
  expect(tree.root.findAllByType('Stepper')).toHaveLength(1);
  await act(async () => {
    tree.unmount();
  });
});
