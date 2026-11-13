/** Shared SQL fragments + helpers for the repositories. */

/** Trim to null: '' / '  ' / undefined → null. */
export const clean = v => {
  if (v === undefined || v === null) {
    return null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** SQL version of lineTotal() in src/domain/lines.js — keep both in sync. */
export const LINE_TOTAL_SQL =
  'l.rate_amount * l.quantity + l.called_count * COALESCE(l.called_amount, 0)';

/**
 * SQL total of one work `w` — same as workTotals() in src/domain/dues.js:
 * lines + extras (amount × people, at least 1).
 */
export const WORK_TOTAL_SQL = `(
  COALESCE((SELECT SUM(${LINE_TOTAL_SQL}) FROM work_lines l WHERE l.work_id = w.id), 0)
  + COALESCE((SELECT SUM(e.amount * MAX(1,
      (SELECT COUNT(*) FROM extra_people ep WHERE ep.extra_id = e.id)))
    FROM extras e WHERE e.work_id = w.id), 0)
)`;

export const groupBy = (rows, field) => {
  const by = {};
  rows.forEach(r => {
    (by[r[field]] = by[r[field]] || []).push(r);
  });
  return by;
};
