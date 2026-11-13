import { personKey } from './dues';
import { parseNum } from '@/utils/format';

/** Only work participants and recipients already selected for this extra. */
export function extraPersonOptions(lines, selected = []) {
  const people = new Map();
  [...lines, ...selected].forEach(p => {
    const key = personKey(p.person_name);
    if (key && !people.has(key)) {
      people.set(key, {
        key,
        label: p.person_name,
        p: { id: p.person_id || null, name: p.person_name },
      });
    }
  });
  return [...people.values()];
}

/** Compare editable values only, excluding UI keys, search and payment history. */

/** Amount for comparing: number when it parses (commas ignored), else text. */
const amountKey = v => {
  const n = parseNum(v);
  return Number.isNaN(n) ? String(v ?? '').trim() : n;
};

export function workFormSnapshot({
  date,
  place = '',
  session = '',
  notes = '',
  lines = [],
  extras = [],
}) {
  return JSON.stringify({
    date,
    place: place || '',
    session: session || '',
    notes: notes || '',
    lines: lines.map(l => ({
      person_id: l.person_id || null,
      person_name: l.person_name,
      rate_name: l.rate_name || 'Work',
      rate_amount: Number(l.rate_amount),
      quantity: Number(l.quantity) || 1,
      called_count: Number(l.called_count) || 0,
      called_amount: Number(l.called_amount) || 0,
    })),
    extras: extras.map(e => ({
      name: e.name,
      amount: amountKey(e.amount), // '1,000' and 1000 are the same
      people: e.people.map(p => ({
        person_id: p.person_id || null,
        person_name: p.person_name,
      })),
    })),
  });
}
