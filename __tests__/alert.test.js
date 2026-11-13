import {
  registerAlertHost,
  showAlert,
  _resetAlertsForTests,
} from '../src/components/alert/alertService';

afterEach(() => _resetAlertsForTests());

test('alerts are queued and shown one at a time', async () => {
  const shown = [];
  let finish;
  registerAlertHost((config, done) => {
    shown.push(config.title);
    finish = done;
  });

  const a = showAlert({ title: 'A' });
  const b = showAlert({ title: 'B' });
  expect(shown).toEqual(['A']); // B waits

  finish({ value: true });
  await expect(a).resolves.toEqual({ value: true });
  expect(shown).toEqual(['A', 'B']);

  finish({ value: null, cancelled: true });
  await expect(b).resolves.toEqual({ value: null, cancelled: true });
});

test('alerts wait until a host is mounted, with defaults filled in', async () => {
  const p = showAlert({ title: 'Early', autoCloseMs: 1500 });
  let got;
  registerAlertHost((config, done) => {
    got = config;
    done({ value: true, auto: true });
  });
  await expect(p).resolves.toEqual({ value: true, auto: true });
  expect(got).toMatchObject({
    title: 'Early',
    autoCloseMs: 1500,
    cancelable: true,
    multiple: false,
    buttons: [{ text: 'OK', value: true, style: 'primary' }],
  });
});
