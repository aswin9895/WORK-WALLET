/**
 * App-wide alert queue (no React needed to call it).
 *
 *   const { value, selected, cancelled, auto } = await showAlert({
 *     title: 'Delete work?',
 *     message: 'This cannot be undone.',
 *     buttons: [
 *       { text: 'Cancel', value: false, style: 'cancel' },
 *       { text: 'Delete', value: true, style: 'destructive' },
 *     ],
 *     options: [{ value: 'a', label: 'Option A', description: '…' }], // optional
 *     multiple: false,         // with options: checkboxes instead of radio
 *     selected: ['a'],         // initially selected option values
 *     requireSelection: false, // disable non-cancel buttons until one is picked
 *     autoCloseMs: 2000,       // optional: close by itself → { auto: true }
 *     autoCloseValue: true,    // value returned when it auto-closes
 *     cancelable: true,        // back button / tap outside → { cancelled: true }
 *     closeOnSelect: false,    // single-choice options: tapping one closes the
 *                              // alert → { value: thatOption, selected: [it] }
 *     layout: 'hero',          // optional: redesigned look ('hero' | 'header'),
 *                              // with iconPath, subtitle, optionsTitle,
 *                              // options[].iconPath/tone, buttons[].Icon/wide
 *                              // — see KitAlertCard.js
 *   });
 *
 * Alerts are queued: a second call waits until the first one closes.
 * <AlertHost /> (mounted once in AppRoot) renders them.
 */

let host = null;
const queue = [];

export const DEFAULT_BUTTONS = [{ text: 'OK', value: true, style: 'primary' }];

/** Called by <AlertHost/>: receives a function to display the next alert. */
export function registerAlertHost(showFn) {
  host = showFn;
  flush();
  return () => {
    if (host === showFn) {
      host = null;
    }
  };
}

let showing = false;

function flush() {
  if (showing || !host || !queue.length) {
    return;
  }
  showing = true;
  const { config, resolve } = queue.shift();
  host(config, result => {
    showing = false;
    resolve(result);
    flush();
  });
}

export function showAlert(config) {
  return new Promise(resolve => {
    queue.push({
      config: {
        buttons: DEFAULT_BUTTONS,
        cancelable: true,
        multiple: false,
        selected: [],
        requireSelection: false,
        ...config,
      },
      resolve,
    });
    flush();
  });
}

/** For tests: drop any queued alerts. */
export function _resetAlertsForTests() {
  queue.length = 0;
  showing = false;
  host = null;
}
