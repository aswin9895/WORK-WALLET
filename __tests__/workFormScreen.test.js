import React from 'react';
import { TextInput } from 'react-native';
import { act, create } from 'react-test-renderer';
import { usePreventRemove } from '@react-navigation/native';
import { saveWork, listPeople } from '../src/data';
import { confirmAction, showError } from '../src/components/alert';
import WorkFormScreen from '../src/screens/works/WorkFormScreen';

jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: 'Scroll',
}));
jest.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'Calculator',
      'CalendarDays',
      'FileText',
      'Layers',
      'MapPin',
      'Trash2',
      'Users',
      'Utensils',
      'X',
    ].map(k => [k, 'Icon']),
  ),
);
jest.mock('../src/theme', () => ({
  useStyles: () => new Proxy({}, { get: () => ({}) }),
}));
jest.mock('../src/components/ui', () => ({ FixedText: 'FixedText' }));
jest.mock('../src/components/kit', () => ({
  KitButton: 'KitButton',
  ScreenHeader: 'ScreenHeader',
}));
jest.mock('../src/components/form/Combo', () => 'Combo');
jest.mock('../src/components/form/DateField', () => 'DateField');
jest.mock('../src/components/sheets/LineSheet', () => 'LineSheet');
jest.mock('../src/data', () => ({
  saveWork: jest.fn(),
  listPeople: jest.fn(),
}));
jest.mock('../src/components/alert', () => ({
  confirmAction: jest.fn(),
  showError: jest.fn(),
  showMessage: jest.fn(),
}));

test('fresh form exits freely; changed form asks once, cancel stays, successful save bypasses warning', async () => {
  listPeople.mockResolvedValue([]);
  saveWork.mockResolvedValue(1);
  const navigation = { goBack: jest.fn(), dispatch: jest.fn() };
  let tree;
  const guard = () => usePreventRemove.mock.calls.at(-1);
  await act(async () => {
    tree = create(
      <WorkFormScreen
        navigation={navigation}
        route={{ params: { cateringId: 1 } }}
      />,
    );
  });
  expect(guard()[0]).toBe(false);
  await act(async () => {
    tree.root
      .findAllByType(TextInput)
      .find(n => n.props.placeholder === 'Work place')
      .props.onChangeText('Hall');
  });
  expect(guard()[0]).toBe(true);
  confirmAction.mockResolvedValueOnce(false);
  const action = { type: 'GO_BACK' };
  await act(async () => {
    guard()[1]({ data: { action } });
    guard()[1]({ data: { action } });
  });
  expect(confirmAction).toHaveBeenCalledTimes(1);
  expect(navigation.dispatch).not.toHaveBeenCalled();
  confirmAction.mockResolvedValueOnce(true);
  await act(async () => {
    guard()[1]({ data: { action } });
  });
  expect(navigation.dispatch).toHaveBeenCalledWith(action);
  saveWork.mockRejectedValueOnce(new Error('Save failed'));
  await act(async () => {
    await tree.root.findByType('KitButton').props.onPress();
  });
  expect(showError).toHaveBeenCalled();
  expect(guard()[0]).toBe(true);
  expect(navigation.goBack).not.toHaveBeenCalled();
  await act(async () => {
    await tree.root.findByType('KitButton').props.onPress();
  });
  expect(guard()[0]).toBe(false);
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(confirmAction).toHaveBeenCalledTimes(2);
  await act(async () => {
    tree.unmount();
  });
});
