/**
 * One work line = one person on a work day.
 *   own pay      = rate_amount × quantity   (quantity is 1 for new entries;
 *                                            older entries may have more)
 *   people called = called_count × called_amount
 * Keep this in sync with LINE_TOTAL_SQL in src/db/repo.js.
 */
export function lineTotal(l) {
  const own = (Number(l.rate_amount) || 0) * (Number(l.quantity) || 0);
  const called = (Number(l.called_count) || 0) * (Number(l.called_amount) || 0);
  return own + called;
}

/** Attendance count: named workers (legacy quantity included) plus called workers. */
export function workPeopleCount(lines) {
  return lines.reduce(
    (count, l) =>
      count +
      Math.max(0, Number(l.quantity) || 0) +
      Math.max(0, Number(l.called_count) || 0),
    0,
  );
}
