import { personKey } from './dues';
import { toIso } from '@/utils/format';

/** Prefer the saved person link; use the snapshot name only without a link. */
export function isMyselfEntry(entry, myself) {
  if (!myself) {
    return false;
  }
  return entry.person_id != null
    ? entry.person_id === myself.id
    : personKey(entry.person_name) === personKey(myself.name);
}

export function earningsDateRange(range, from, to, now = new Date()) {
  if (range === 'custom') {
    return [from, to];
  }
  if (range === 'this' || range === 'last') {
    const offset = range === 'last' ? -1 : 0;
    return [
      toIso(new Date(now.getFullYear(), now.getMonth() + offset, 1)),
      toIso(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)),
    ];
  }
  return [null, null];
}

/** Actual payments, including assigned extras; never work totals or collections. */
export function paidEarnings({ payments, myself }, scope, from, to) {
  const sum = payments.reduce((total, payment) => {
    if ((from && payment.paid_at < from) || (to && payment.paid_at > to)) {
      return total;
    }
    const mine = isMyselfEntry(payment, myself);
    if ((scope === 'myself' && !mine) || (scope === 'people' && mine)) {
      return total;
    }
    return total + Number(payment.amount);
  }, 0);
  return Math.round(sum * 100) / 100;
}
