import { query, run } from '../db/database';
import { cateringStatus, workDues } from '@/domain/dues';
import { clean, WORK_TOTAL_SQL } from './sql';
import { listAllWorks } from './works';

/** Caterings with work count, last date, total and to_collect (not collected yet). */
export function listCaterings() {
  return query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM works w WHERE w.catering_id = c.id) AS work_count,
       (SELECT MAX(date) FROM works w WHERE w.catering_id = c.id) AS last_date,
       COALESCE((SELECT SUM(${WORK_TOTAL_SQL}) FROM works w
                 WHERE w.catering_id = c.id), 0) AS total,
       COALESCE((SELECT SUM(${WORK_TOTAL_SQL}) FROM works w
                 WHERE w.catering_id = c.id AND w.collected_at IS NULL), 0)
         AS to_collect
     FROM caterings c
     ORDER BY (last_date IS NULL), last_date DESC, c.name COLLATE NOCASE`,
  );
}

export async function getCatering(id) {
  const rows = await query('SELECT * FROM caterings WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function saveCatering({ id, name, phone, notes }) {
  const params = [clean(name), clean(phone), clean(notes)];
  if (id) {
    await run(
      'UPDATE caterings SET name = ?, phone = ?, notes = ? WHERE id = ?',
      [...params, id],
    );
    return id;
  }
  const res = await run(
    'INSERT INTO caterings (name, phone, notes) VALUES (?, ?, ?)',
    params,
  );
  return res.insertId;
}

/** Deletes the catering and (CASCADE) all its works, lines, extras, payments. */
export function deleteCatering(id) {
  return run('DELETE FROM caterings WHERE id = ?', [id]);
}

/**
 * Caterings for the Home screen: listCaterings() plus
 *   to_pay — still to pay people (exact, per person, via domain/dues)
 *   status — 'empty' | 'ok' | 'pending' (domain cateringStatus)
 */
export async function listCateringsOverview() {
  const [caterings, works] = await Promise.all([
    listCaterings(),
    listAllWorks(),
  ]);
  const toPay = {};
  works.forEach(w => {
    toPay[w.catering_id] = (toPay[w.catering_id] || 0) + workDues(w).pending;
  });
  return caterings.map(c => {
    const row = { ...c, to_pay: Math.round((toPay[c.id] || 0) * 100) / 100 };
    return { ...row, status: cateringStatus(row) };
  });
}
