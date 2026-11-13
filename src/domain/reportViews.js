import { buildReport } from './report';
import { extraTotal, workTotals, personKey } from './dues';
import { money, qty } from '@/utils/format';

const round = n => Math.round(n * 100) / 100;
const breakdown = rates =>
  [...rates]
    .map(([rate, count]) => `${qty(count)} × ${money(rate)}`)
    .join(' + ');

/** All calculations use full works. Display options never change billed totals. */
export function buildReportViews(works) {
  const lines = works.flatMap(w =>
    w.lines.map(l => ({ ...l, session: w.session })),
  );
  const own = buildReport({
    lines: lines.map(l => ({ ...l, called_count: 0 })),
    extras: [],
  });
  const boys = new Map();
  lines.forEach(l => {
    const count = Number(l.called_count) || 0;
    if (!count) {
      return;
    }
    const kind = personKey(l.session) === 'setting' ? 'setting' : 'work';
    if (!boys.has(kind)) {
      boys.set(kind, { count: 0, total: 0, rates: new Map() });
    }
    const group = boys.get(kind);
    const rate = Number(l.called_amount) || 0;
    group.count += count;
    group.total += count * rate;
    group.rates.set(rate, (group.rates.get(rate) || 0) + count);
  });
  const peopleRows = own.workRows.map((r, i) => ({ ...r, key: `person-${i}` }));
  boys.forEach((g, kind) =>
    peopleRows.push({
      key: `boys-${kind}`,
      label:
        kind === 'setting'
          ? 'Boys – Setting'
          : boys.size > 1
          ? 'Boys – Work'
          : 'Boys',
      quantity: qty(g.count),
      rate: breakdown(g.rates),
      total: round(g.total),
    }),
  );

  const extraGroups = new Map();
  works.forEach(w =>
    w.extras.forEach(e => {
      const key = personKey(e.name);
      if (!extraGroups.has(key)) {
        extraGroups.set(key, {
          key: `extra-${key}`,
          label: e.name,
          total: 0,
          rates: new Map(),
          recipients: new Map(),
          unassigned: 0,
        });
      }
      const group = extraGroups.get(key);
      const count = Math.max(1, e.people.length);
      const rate = Number(e.amount) || 0;
      group.total += extraTotal(e);
      group.rates.set(rate, (group.rates.get(rate) || 0) + count);
      e.people.forEach(p =>
        group.recipients.set(personKey(p.person_name), p.person_name),
      );
      if (!e.people.length) {
        group.unassigned += 1;
      }
    }),
  );
  const extraRows = [...extraGroups.values()].map(g => ({
    key: g.key,
    label: g.label,
    total: round(g.total),
    rate: breakdown(g.rates),
    quantity: qty([...g.rates.values()].reduce((s, count) => s + count, 0)),
    recipients: [...g.recipients.values()],
    unassigned: g.unassigned > 0,
  }));
  const details = works.map(w => ({
    id: w.id,
    date: w.date,
    place: w.place,
    session: w.session,
    peopleRows: w.lines.flatMap(l => {
      const rows = [
        {
          key: `person-${l.id}`,
          label: l.person_name,
          quantity: qty(l.quantity),
          rate: money(l.rate_amount),
          total: round(Number(l.quantity) * Number(l.rate_amount)),
        },
      ];
      if (l.called_count > 0) {
        rows.push({
          key: `boys-${l.id}`,
          label: `Boys (${l.person_name})`,
          quantity: qty(l.called_count),
          rate: money(l.called_amount),
          total: round(l.called_count * Number(l.called_amount)),
        });
      }
      return rows;
    }),
    extraRows: w.extras.map(e => ({
      key: `extra-${e.id}`,
      label: e.name,
      quantity: qty(Math.max(1, e.people.length)),
      rate: money(e.amount),
      total: round(extraTotal(e)),
      recipients: e.people.map(p => p.person_name),
      unassigned: !e.people.length,
    })),
    total: round(workTotals(w).total),
  }));
  return {
    peopleRows,
    extraRows,
    details,
    grandTotal: round(details.reduce((sum, w) => sum + w.total, 0)),
  };
}
