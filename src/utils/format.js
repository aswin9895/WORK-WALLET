/** Formatting helpers (no Intl dependency, works the same on every phone). */

/** 20650 -> "₹20,650"   1234567.5 -> "₹12,34,567.50" (Indian grouping) */
export function money(value) {
  const n = Number(value) || 0;
  const negative = n < 0;
  const abs = Math.abs(n);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  const [intPart, dec] = abs.toFixed(2).split('.');

  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  return `${negative ? '-' : ''}₹${grouped}${hasPaise ? '.' + dec : ''}`;
}

/** Quantity without useless decimals: 1 -> "1", 1.5 -> "1.5" */
export function qty(value) {
  const n = Number(value) || 0;
  return String(Math.round(n * 100) / 100);
}

const pad = n => String(n).padStart(2, '0');

/** Date object -> 'YYYY-MM-DD' (local time) */
export function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

/** 'YYYY-MM-DD' -> Date (local time) */
export function fromIso(iso) {
  if (!iso) {
    return new Date();
  }
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso() {
  return toIso(new Date());
}

/** 'YYYY-MM-DD' -> '17/10/26' */
export function shortDate(iso) {
  if (!iso) {
    return '—';
  }
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** 'YYYY-MM-DD' -> '11-Nov-26' (date fields on redesigned screens) */
export function dayMonthYear(iso) {
  if (!iso) {
    return '—';
  }
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y.slice(2)}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' -> 'Fri, 17/10/26' */
export function longDate(iso) {
  if (!iso) {
    return '—';
  }
  return `${DAYS[fromIso(iso).getDay()]}, ${shortDate(iso)}`;
}

/** Parse a user-typed number; returns NaN for empty / invalid input. */
export function parseNum(text) {
  if (text === null || text === undefined) {
    return NaN;
  }
  const s = String(text).replace(/,/g, '').trim();
  if (s === '') {
    return NaN;
  }
  return Number(s);
}

/**
 * Amount typed in a field → shown with Indian commas while typing:
 * '4745554' → '47,45,554', '1108.335' → '1,108.33' (max 2 decimals),
 * letters / extra dots dropped. parseNum() reads it back (commas ignored).
 * allowNegative keeps a leading '-' (bank balances).
 */
export function formatAmountInput(text, allowNegative = false) {
  const raw = String(text ?? '').replace(/[^0-9.-]/g, '');
  const negative = allowNegative && raw.startsWith('-');
  const unsigned = raw.replace(/-/g, '');
  const dot = unsigned.indexOf('.');
  let intPart = dot < 0 ? unsigned : unsigned.slice(0, dot);
  const decPart =
    dot < 0 ? null : unsigned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  intPart = intPart.replace(/^0+(?=\d)/, '');
  if (intPart === '' && decPart !== null) {
    intPart = '0';
  }
  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  return `${negative ? '-' : ''}${grouped}${
    decPart !== null ? `.${decPart}` : ''
  }`;
}

/** A stored amount → field text with commas (rounded to paise first, so a
 * float like 699.9999999 shows 700, not 699.99). null/'' → ''. */
export function amountText(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return '';
  }
  return formatAmountInput(String(Math.round(n * 100) / 100), true);
}
