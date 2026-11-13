/**
 * Redesigned alert look (layout 'hero' / 'header') rendered by AlertHost.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import AlertHost from '../src/components/alert/AlertHost';
import KitButton from '../src/components/kit/KitButton';
import {
  showAlert,
  _resetAlertsForTests,
} from '../src/components/alert/alertService';

// every style / palette lookup returns a stub with a colour
jest.mock('../src/theme', () => {
  const styles = new Proxy({}, { get: () => ({ color: '#000' }) });
  return { useStyles: () => styles };
});
jest.mock('../src/components/graphics/GradientView', () => 'GradientView');
jest.mock('../src/components/graphics/MdiIcon', () => 'MdiIcon');
jest.mock('../src/components/ui', () => ({
  FixedText: 'FixedText',
  Button: 'Button',
}));

afterEach(() => _resetAlertsForTests());

async function mount() {
  let tree;
  await act(async () => {
    tree = create(<AlertHost />);
  });
  return tree;
}

const texts = tree =>
  tree.root.findAllByType('FixedText').map(t => t.props.children);
const button = (tree, title) =>
  tree.root.findAllByType(KitButton).find(b => b.props.title === title);

test('hero: icon, centred texts, one full-width button per row', async () => {
  const tree = await mount();
  let result;
  await act(async () => {
    result = showAlert({
      layout: 'hero',
      iconPath: 'M0',
      title: 'Back up data',
      message: 'Makes one file with all your data.',
      buttons: [
        { text: 'Share', value: 'share', style: 'primary' },
        { text: 'Save', value: 'save', style: 'default' },
        { text: 'Cancel', value: null, style: 'cancel' },
      ],
    });
  });
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Back up data', 'Makes one file with all your data.']),
  );
  const buttons = tree.root.findAllByType(KitButton);
  expect(buttons.map(b => [b.props.title, b.props.variant])).toEqual([
    ['Share', 'primary'],
    ['Save', 'tonal'],
    ['Cancel', 'outline'],
  ]);
  // each button in its own row
  expect(buttons.map(b => b.parent.props.children.length)).toEqual([1, 1, 1]);
  await act(async () => button(tree, 'Save').props.onPress());
  await expect(result).resolves.toMatchObject({
    value: 'save',
    cancelled: false,
  });
});

test('header: option cards select, buttons share a row unless wide, X cancels', async () => {
  const tree = await mount();
  let result;
  const config = {
    layout: 'header',
    iconPath: 'M0',
    title: 'Export report',
    subtitle: 'Both · All time · All',
    optionsTitle: 'Export format',
    options: [
      { value: 'pdf', label: 'PDF', description: 'Best for printing', tone: 'red' },
      { value: 'image', label: 'Image (PNG)', tone: 'blue' },
    ],
    selected: ['pdf'],
    requireSelection: true,
    buttons: [
      { text: 'Cancel', value: null, style: 'cancel' },
      { text: 'Save', value: 'save', style: 'default' },
      { text: 'Share', value: 'share', style: 'primary', wide: true },
    ],
  };
  await act(async () => {
    result = showAlert(config);
  });
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Export report', 'Both · All time · All', 'Export format']),
  );
  expect(button(tree, 'Cancel').parent.props.children).toHaveLength(2);
  expect(button(tree, 'Share').parent.props.children).toHaveLength(1);

  const radios = tree.root.findAll(
    n => n.props.accessibilityRole === 'radio' && n.props.onPress,
  );
  const checked = () => radios.map(r => r.props.accessibilityState.checked);
  expect(checked()).toEqual([true, false]);
  await act(async () => radios[1].props.onPress());
  expect(
    tree.root
      .findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress)
      .map(r => r.props.accessibilityState.checked),
  ).toEqual([false, true]);

  await act(async () => button(tree, 'Share').props.onPress());
  await expect(result).resolves.toMatchObject({
    value: 'share',
    selected: ['image'],
  });

  // close (X) → cancelled
  await act(async () => {
    result = showAlert(config);
  });
  const close = tree.root.find(
    n => n.props.accessibilityLabel === 'Close' && n.props.onPress,
  );
  await act(async () => close.props.onPress());
  await expect(result).resolves.toMatchObject({ value: null, cancelled: true });
});

test('helpers: icons/colours by type; 2 buttons side by side', async () => {
  const {
    confirmAction,
    confirmDelete,
    showSuccess,
    showError,
  } = require('../src/components/alert/helpers');
  const tree = await mount();
  let p;
  await act(async () => {
    p = confirmAction('Collected?', '2 works', 'Collected');
  });
  // Cancel | Collected in one row
  expect(button(tree, 'Cancel').parent.props.children).toHaveLength(2);
  expect(button(tree, 'Collected').props.variant).toBe('primary');
  expect(button(tree, 'Cancel').props.variant).toBe('outline');
  await act(async () => button(tree, 'Collected').props.onPress());
  await expect(p).resolves.toBe(true);

  await act(async () => {
    p = confirmDelete('"NANMA"', 'All works go too.');
  });
  expect(texts(tree)).toEqual(
    expect.arrayContaining([
      'Delete "NANMA"?',
      'All works go too.\n\nThis cannot be undone.',
    ]),
  );
  expect(button(tree, 'Delete').props.variant).toBe('danger');
  await act(async () => button(tree, 'Cancel').props.onPress());
  await expect(p).resolves.toBe(false);

  // success + error: one full-width button, default icons by tone
  await act(async () => {
    p = showSuccess('Saved to Downloads');
  });
  expect(tree.root.findAllByType(KitButton)).toHaveLength(1);
  expect(tree.root.findAllByType('MdiIcon')[0].props.path).toBe(
    require('@mdi/js').mdiCheckCircle,
  );
  await act(async () => button(tree, 'OK').props.onPress());
  await p;
  await act(async () => {
    p = showError(new Error('boom'));
  });
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Something went wrong', 'boom']),
  );
  expect(tree.root.findAllByType('MdiIcon')[0].props.path).toBe(
    require('@mdi/js').mdiAlertCircle,
  );
  await act(async () => button(tree, 'OK').props.onPress());
  await p;
});

test('no layout given: hero, or header when there are options', async () => {
  const tree = await mount();
  let p;
  await act(async () => {
    p = showAlert({ title: 'Plain', message: 'Hi' });
  });
  // hero → default info icon at 84px
  expect(tree.root.findAllByType('MdiIcon')[0].props.size).toBe(84);
  await act(async () => button(tree, 'OK').props.onPress());
  await p;
  await act(async () => {
    p = showAlert({
      title: 'Pick',
      options: [{ value: 'a', label: 'A' }],
      buttons: [{ text: 'OK', value: true, style: 'primary' }],
    });
  });
  expect(
    tree.root.findAll(
      n => n.props.accessibilityRole === 'radio' && n.props.onPress,
    ),
  ).toHaveLength(1);
  await act(async () => button(tree, 'OK').props.onPress());
  await p;
});

test('closeOnSelect: tapping an option answers at once', async () => {
  const tree = await mount();
  let p;
  await act(async () => {
    p = showAlert({
      layout: 'header',
      title: 'Sort',
      options: [
        { value: 'date_desc', label: 'Newest' },
        { value: 'in_big', label: 'Biggest in' },
      ],
      selected: ['date_desc'],
      closeOnSelect: true,
      buttons: [{ text: 'Cancel', value: null, style: 'cancel' }],
    });
  });
  const radios = tree.root.findAll(
    n => n.props.accessibilityRole === 'radio' && n.props.onPress,
  );
  await act(async () => radios[1].props.onPress());
  await expect(p).resolves.toMatchObject({
    value: 'in_big',
    selected: ['in_big'],
    cancelled: false,
  });
  // Cancel still cancels
  await act(async () => {
    p = showAlert({
      title: 'Sort',
      options: [{ value: 'a', label: 'A' }],
      closeOnSelect: true,
      buttons: [{ text: 'Cancel', value: null, style: 'cancel' }],
    });
  });
  await act(async () => button(tree, 'Cancel').props.onPress());
  await expect(p).resolves.toMatchObject({ value: null, cancelled: true });
});
