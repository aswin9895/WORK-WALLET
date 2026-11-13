/**
 * Builds the "Work Payment Report" table from raw lines + extras.
 * (First version — the owner plans to revisit the layout.)
 *
 * Rows, in the order people first appear:
 *  - "Aswin"            own pay: count = sum of quantity, rate = own amount(s)
 *  - "Aswin's people"   people Aswin called: count = sum of called_count,
 *                       rate = called amount(s)
 *  - Work from a session named "Setting" gets its own rows:
 *    "Aswin – Setting", "Aswin's people – Setting". When a person has both
 *    normal and Setting work, the normal row is labelled "Aswin – Work".
 *  - Different amounts in one row show joined: "₹400 + ₹650" (>3 → "Mixed").
 *  - Extras grouped by name (Petrol, Work Extra ...) and summed. An extra paid to N people counts N × amount
 *    (people_count from getReportData; missing = 1).
 *
 * lines need: person_name, rate_amount, quantity, called_count,
 *             called_amount, session
 */
import { money, qty } from '@/utils/format';

const isSetting = session => (session || '').trim().toLowerCase() === 'setting';

function rateText(amounts) {
  if (amounts.length === 1) {
    return money(amounts[0]);
  }
  if (amounts.length <= 3) {
    return amounts.map(money).join(' + ');
  }
  return 'Mixed';
}

export function buildReport({ lines, extras }) {
  const groups = new Map(); // key -> group
  const order = [];
  const kindsByPerson = new Map(); // person -> Set('work' | 'setting')

  const addTo = (key, init, count, amount) => {
    if (!groups.has(key)) {
      groups.set(key, { ...init, count: 0, total: 0, amounts: [] });
      order.push(key);
    }
    const g = groups.get(key);
    g.count += count;
    g.total += count * amount;
    if (!g.amounts.includes(amount)) {
      g.amounts.push(amount);
    }
  };

  lines.forEach(l => {
    const person = l.person_name;
    const p = person.trim().toLowerCase();
    const kind = isSetting(l.session) ? 'setting' : 'work';
    if (!kindsByPerson.has(p)) {
      kindsByPerson.set(p, new Set());
    }
    kindsByPerson.get(p).add(kind);

    addTo(
      `own|${p}|${kind}`,
      { person, p, kind, called: false },
      Number(l.quantity) || 0,
      Number(l.rate_amount) || 0,
    );
    const calledCount = Number(l.called_count) || 0;
    if (calledCount > 0) {
      addTo(
        `called|${p}|${kind}`,
        { person, p, kind, called: true },
        calledCount,
        Number(l.called_amount) || 0,
      );
    }
  });

  // Keep each person's "people called" row right after their own row.
  const ownKeys = order.filter(k => k.startsWith('own|'));
  const sorted = [];
  ownKeys.forEach(k => {
    sorted.push(k);
    const calledKey = k.replace(/^own\|/, 'called|');
    if (groups.has(calledKey)) {
      sorted.push(calledKey);
    }
  });

  const workRows = sorted.map(key => {
    const g = groups.get(key);
    const both = kindsByPerson.get(g.p).size > 1;
    const base = g.called ? `${g.person}'s people` : g.person;
    let label = base;
    if (g.kind === 'setting') {
      label = `${base} – Setting`;
    } else if (both) {
      label = `${base} – Work`;
    }
    return {
      label,
      quantity: qty(g.count),
      rate: rateText(g.amounts),
      total: g.total,
    };
  });

  const extraGroups = new Map();
  extras.forEach(e => {
    const key = e.name.trim().toLowerCase();
    if (!extraGroups.has(key)) {
      extraGroups.set(key, { label: e.name, total: 0 });
    }
    extraGroups.get(key).total +=
      (Number(e.amount) || 0) * Math.max(1, Number(e.people_count) || 0);
  });
  const extraRows = [...extraGroups.values()].map(g => ({
    label: g.label,
    quantity: '—',
    rate: '—',
    total: g.total,
  }));

  const workTotal = workRows.reduce((sum, r) => sum + r.total, 0);
  const extraTotal = extraRows.reduce((sum, r) => sum + r.total, 0);

  return {
    workRows,
    extraRows,
    workTotal,
    extraTotal,
    grandTotal: workTotal + extraTotal,
  };
}
