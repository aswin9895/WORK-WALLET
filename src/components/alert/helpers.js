/**
 * Ready-made alerts built on showAlert(). Use these in screens.
 * All use the redesigned dialog (KitAlertCard); icons / colours by type
 * (owner's choice):
 *   showMessage   → orange info        showSuccess → green check
 *   showError     → red warning        confirmDelete → red trash
 *   confirmAction → orange question (pass { iconPath } for a better one,
 *                   e.g. mdiCashMultiple for pay / collected);
 *                   { destructive: true } → red warning + red button
 *   selectOption  → header layout with option cards
 * Two buttons sit side by side: Cancel (outline) | action.
 */
import {
  mdiAlert,
  mdiDelete,
  mdiHelpCircle,
  mdiInformation,
} from '@mdi/js';
import { showAlert } from './alertService';

/** Info / validation message. Pass { autoCloseMs } to close by itself. */
export async function showMessage(
  message,
  { title = 'Check the details', autoCloseMs } = {},
) {
  await showAlert({
    layout: 'hero',
    iconPath: mdiInformation,
    title,
    message,
    autoCloseMs,
  });
}

/** Success note, e.g. "Paid ₹700". Auto-closes only if autoCloseMs is given. */
export async function showSuccess(
  message,
  { title = 'Done', autoCloseMs } = {},
) {
  await showAlert({
    layout: 'hero',
    tone: 'success',
    title,
    message,
    autoCloseMs,
  });
}

export async function showError(e) {
  await showAlert({
    layout: 'hero',
    tone: 'danger',
    title: 'Something went wrong',
    message: String(e?.message || e),
  });
}

/** Yes/no. Resolves true when confirmed. */
export async function confirmAction(
  title,
  message,
  okText = 'OK',
  { destructive = false, iconPath } = {},
) {
  const { value } = await showAlert({
    layout: 'hero',
    tone: destructive ? 'danger' : undefined,
    iconPath: iconPath || (destructive ? mdiAlert : mdiHelpCircle),
    title,
    message,
    buttons: [
      { text: 'Cancel', value: false, style: 'cancel' },
      {
        text: okText,
        value: true,
        style: destructive ? 'destructive' : 'primary',
      },
    ],
  });
  return value === true;
}

/** "Delete X?" with "This cannot be undone." Resolves true when confirmed. */
export function confirmDelete(what, extra = '') {
  return confirmAction(
    `Delete ${what}?`,
    `${extra ? extra + '\n\n' : ''}This cannot be undone.`,
    'Delete',
    { destructive: true, iconPath: mdiDelete },
  );
}

/**
 * Pick from a list.
 *   single: resolves the chosen value, or null if cancelled
 *   multiple: resolves an array of values, or null if cancelled
 */
export async function selectOption({
  title,
  message,
  options,
  multiple = false,
  selected = [],
  confirmText = 'OK',
}) {
  const res = await showAlert({
    layout: 'header',
    title,
    subtitle: message,
    options,
    multiple,
    selected,
    requireSelection: !multiple,
    buttons: [
      { text: 'Cancel', value: false, style: 'cancel' },
      { text: confirmText, value: true, style: 'primary' },
    ],
  });
  if (res.value !== true) {
    return null;
  }
  return multiple ? res.selected : res.selected[0] ?? null;
}
