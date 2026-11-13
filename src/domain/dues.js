/**
 * Who is owed what for a work, and how much is already paid.
 *
 * A person's due on a work = their line(s) (own amount + people they called)
 *                          + their share of extras paid to them.
 * Payments are matched to people by name (case/space-insensitive), the same
 * name that is copied onto lines, extra_people and payments when saved.
 *
 * work needs: lines[], extras[] (each with people[]), payments[]
 */
import { lineTotal } from '@/domain/lines';

export const personKey = name => (name || '').trim().toLowerCase();

const round2 = n => Math.round(n * 100) / 100;

/** Work-level filters shared by the works list and payment report. */
export function matchesWorkFilter(work, filter) {
  if (filter === 'all') {
    return true;
  }
  const toCollect = !work.collected_at;
  if (filter === 'to_collect') {
    return toCollect;
  }
  const toPay = workDues(work).pending > 0;
  if (filter === 'to_pay') {
    return toPay;
  }
  if (filter === 'paid') {
    return !toCollect && !toPay;
  }
  return toCollect || toPay;
}

/** Amount the owner pays for an extra: amount × people (at least 1). */
export function extraTotal(e) {
  const n = (e.people || []).length;
  return (Number(e.amount) || 0) * (n || 1);
}

export function workTotals(work) {
  const people = (work.lines || []).reduce((s, l) => s + lineTotal(l), 0);
  const extras = (work.extras || []).reduce((s, e) => s + extraTotal(e), 0);
  return { people, extras, total: people + extras };
}

/**
 * Per-person dues for one work, in the order people appear.
 * Returns { rows: [{key, name, person_id, linesDue, extrasDue, due, paid,
 *                   pending, overpaid, payments}], due, paid, pending }
 * Extras with no people are the owner's own cost and are not in rows.
 */
export function workDues(work) {
  const map = new Map();
  const get = (name, personId) => {
    const key = personKey(name);
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: name.trim(),
        person_id: personId || null,
        linesDue: 0,
        extrasDue: 0,
        paid: 0,
        payments: [],
      });
    }
    const row = map.get(key);
    if (!row.person_id && personId) {
      row.person_id = personId;
    }
    return row;
  };

  (work.lines || []).forEach(l => {
    get(l.person_name, l.person_id).linesDue += lineTotal(l);
  });
  (work.extras || []).forEach(e => {
    (e.people || []).forEach(p => {
      get(p.person_name, p.person_id).extrasDue += Number(e.amount) || 0;
    });
  });
  (work.payments || []).forEach(p => {
    const row = get(p.person_name, p.person_id);
    row.paid += Number(p.amount) || 0;
    row.payments.push(p);
  });

  const rows = [...map.values()].map(r => {
    const due = round2(r.linesDue + r.extrasDue);
    const paid = round2(r.paid);
    return {
      ...r,
      due,
      paid,
      pending: Math.max(0, round2(due - paid)),
      overpaid: Math.max(0, round2(paid - due)),
    };
  });
  return {
    rows,
    due: round2(rows.reduce((s, r) => s + r.due, 0)),
    paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
    pending: round2(rows.reduce((s, r) => s + r.pending, 0)),
  };
}

/**
 * One person's dues across many works (e.g. all works of a catering).
 * Returns { works: [{work, due, paid, pending, overpaid, payments}],
 *           due, paid, pending }  — only works where they are owed or paid.
 */
export function personDues(works, key) {
  const list = [];
  works.forEach(w => {
    const row = workDues(w).rows.find(r => r.key === key);
    if (row) {
      list.push({ work: w, ...row });
    }
  });
  return {
    works: list,
    due: round2(list.reduce((s, r) => s + r.due, 0)),
    paid: round2(list.reduce((s, r) => s + r.paid, 0)),
    pending: round2(list.reduce((s, r) => s + r.pending, 0)),
  };
}

/**
 * Payments that clear everything pending in these works: one per person per
 * work, for their full pending amount, dated `paidAt`.
 */
export function pendingPayments(works, paidAt) {
  const list = [];
  works.forEach(w => {
    workDues(w).rows.forEach(r => {
      if (r.pending > 0) {
        list.push({
          work_id: w.id,
          person_id: r.person_id,
          person_name: r.name,
          amount: r.pending,
          paid_at: paidAt,
        });
      }
    });
  });
  return list;
}

/**
 * Status of a catering for its avatar:
 *   'empty'   — no work yet
 *   'ok'      — everything collected from the owner and paid to people
 *   'pending' — money still to collect or to pay
 */
export function cateringStatus({ work_count, to_collect, to_pay }) {
  if (!work_count) {
    return 'empty';
  }
  return to_collect > 0 || to_pay > 0 ? 'pending' : 'ok';
}

/** Everyone owed or paid in these works, with totals, sorted by pending. */
export function peopleSummary(works) {
  const map = new Map();
  works.forEach(w => {
    workDues(w).rows.forEach(r => {
      if (!map.has(r.key)) {
        map.set(r.key, {
          key: r.key,
          name: r.name,
          due: 0,
          paid: 0,
          pending: 0,
        });
      }
      const m = map.get(r.key);
      m.due = round2(m.due + r.due);
      m.paid = round2(m.paid + r.paid);
      m.pending = round2(m.pending + r.pending);
    });
  });
  return [...map.values()].sort(
    (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
  );
}
