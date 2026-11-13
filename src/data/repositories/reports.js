import { query } from '../db/database';
import { matchesWorkFilter } from '@/domain/dues';
import { listWorks } from './works';

/** Full works for configurable reports, oldest first; filters use work dates. */
export async function getReportWorks(cateringId, from, to, filter = 'all') {
  const works = await listWorks(cateringId);
  return works
    .filter(
      w =>
        (!from || w.date >= from) &&
        (!to || w.date <= to) &&
        matchesWorkFilter(w, filter),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

/**
 * Raw data for the payment report of one catering, optionally limited to a
 * date range (inclusive, 'YYYY-MM-DD') on the work date. Extras follow the
 * date of the work they belong to; people_count = how many people get it.
 * filter: all (default), pending, to_collect, to_pay; selects whole works.
 */
export async function getReportData(cateringId, from, to, filter = 'all') {
  const cond = [];
  const params = [cateringId];
  if (from) {
    cond.push('w.date >= ?');
    params.push(from);
  }
  if (to) {
    cond.push('w.date <= ?');
    params.push(to);
  }
  const where = `w.catering_id = ? ${
    cond.length ? 'AND ' + cond.join(' AND ') : ''
  }`;
  const lines = await query(
    `SELECT l.*, w.date, w.session FROM work_lines l JOIN works w ON w.id = l.work_id
     WHERE ${where} ORDER BY w.date, l.id`,
    params,
  );
  const extras = await query(
    `SELECT e.*, w.date,
       (SELECT COUNT(*) FROM extra_people ep WHERE ep.extra_id = e.id) AS people_count
     FROM extras e JOIN works w ON w.id = e.work_id
     WHERE ${where} ORDER BY w.date, e.id`,
    params,
  );
  if (filter === 'all') {
    return { lines, extras };
  }
  // Filter whole works using the same per-person balances as the works list.
  // Report amounts remain the original bill amounts, not unpaid balances.
  const works = await listWorks(cateringId);
  const ids = new Set(
    works.filter(w => matchesWorkFilter(w, filter)).map(w => w.id),
  );
  return {
    lines: lines.filter(l => ids.has(l.work_id)),
    extras: extras.filter(e => ids.has(e.work_id)),
  };
}
