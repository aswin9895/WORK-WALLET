import { query, run, transaction } from '../db/database';
import { personKey, workTotals } from '@/domain/dues';
import { clean, groupBy } from './sql';
import { MYSELF_SQL } from './people';
import { isMyselfEntry } from '@/domain/earnings';

/** Attach lines, extras (with people), payments and totals to works. */
function assemble(works, lines, extras, extraPeople, payments) {
  const peopleBy = groupBy(extraPeople, 'extra_id');
  const extrasWithPeople = extras.map(e => ({
    ...e,
    people: peopleBy[e.id] || [],
  }));
  const linesBy = groupBy(lines, 'work_id');
  const extrasBy = groupBy(extrasWithPeople, 'work_id');
  const paymentsBy = groupBy(payments, 'work_id');
  return works.map(w => {
    const full = {
      ...w,
      lines: linesBy[w.id] || [],
      extras: extrasBy[w.id] || [],
      payments: paymentsBy[w.id] || [],
    };
    const t = workTotals(full);
    return {
      ...full,
      people_total: t.people,
      extra_total: t.extras,
      total: t.total,
    };
  });
}

/**
 * Load works matching `where` (on works alias w) with everything attached.
 * Shared by listWorks (one catering) and listAllWorks (home overview).
 */
async function loadWorks(where, params) {
  const works = await query(
    `SELECT w.* FROM works w WHERE ${where} ORDER BY w.date DESC, w.id DESC`,
    params,
  );
  const lines = await query(
    `SELECT l.* FROM work_lines l JOIN works w ON w.id = l.work_id
     WHERE ${where} ORDER BY l.id`,
    params,
  );
  const extras = await query(
    `SELECT e.* FROM extras e JOIN works w ON w.id = e.work_id
     WHERE ${where} ORDER BY e.id`,
    params,
  );
  const extraPeople = await query(
    `SELECT ep.* FROM extra_people ep
     JOIN extras e ON e.id = ep.extra_id
     JOIN works w ON w.id = e.work_id
     WHERE ${where} ORDER BY ep.id`,
    params,
  );
  const payments = await query(
    `SELECT p.* FROM payments p JOIN works w ON w.id = p.work_id
     WHERE ${where} ORDER BY p.paid_at, p.id`,
    params,
  );
  return assemble(works, lines, extras, extraPeople, payments);
}

/**
 * Works of one catering, newest first, each with lines, extras (with
 * people), payments and totals: people_total, extra_total, total.
 */
export function listWorks(cateringId) {
  return loadWorks('w.catering_id = ?', [cateringId]);
}

/** Every work of every catering (same shape as listWorks). */
export function listAllWorks() {
  return loadWorks('1 = 1', []);
}

/** One work with lines, extras (with people), payments and totals. */
export async function getWork(id) {
  const works = await query('SELECT * FROM works WHERE id = ?', [id]);
  if (!works[0]) {
    return null;
  }
  const lines = await query(
    'SELECT * FROM work_lines WHERE work_id = ? ORDER BY id',
    [id],
  );
  const extras = await query(
    'SELECT * FROM extras WHERE work_id = ? ORDER BY id',
    [id],
  );
  const extraPeople = await query(
    `SELECT ep.* FROM extra_people ep JOIN extras e ON e.id = ep.extra_id
     WHERE e.work_id = ? ORDER BY ep.id`,
    [id],
  );
  const payments = await query(
    'SELECT * FROM payments WHERE work_id = ? ORDER BY paid_at, id',
    [id],
  );
  return assemble(works, lines, extras, extraPeople, payments)[0];
}

/**
 * Save a work with its people (lines) and extras in one transaction.
 * Lines and extras are replaced. Payments are kept for people still on the
 * work; payments of people no longer on it are deleted (the screen asks
 * before saving). collected_at is not touched here (see setCollected).
 * lines:  [{person_id, person_name, rate_name?, rate_amount, quantity,
 *           called_count, called_amount}]
 * extras: [{name, amount, people: [{person_id, person_name}]}]
 */
export async function saveWork(work) {
  let workId = work.id;
  await transaction(async tx => {
    const myself = (await tx.execute(MYSELF_SQL)).rows[0];
    if (
      (work.lines || []).some(
        l => Number(l.called_count) > 0 && isMyselfEntry(l, myself),
      )
    ) {
      throw new Error(
        'People called cannot be added under yourself. Add those workers separately.',
      );
    }
    const params = [
      work.catering_id,
      work.date,
      clean(work.place),
      clean(work.session),
      clean(work.notes),
    ];
    if (workId) {
      await tx.execute(
        'UPDATE works SET catering_id = ?, date = ?, place = ?, session = ?, notes = ? WHERE id = ?',
        [...params, workId],
      );
      await tx.execute('DELETE FROM work_lines WHERE work_id = ?', [workId]);
      await tx.execute('DELETE FROM extras WHERE work_id = ?', [workId]);
    } else {
      const res = await tx.execute(
        'INSERT INTO works (catering_id, date, place, session, notes) VALUES (?, ?, ?, ?, ?)',
        params,
      );
      workId = res.insertId;
    }
    const keep = new Set();
    for (const l of work.lines || []) {
      const calledCount = Math.max(0, Math.round(Number(l.called_count) || 0));
      await tx.execute(
        `INSERT INTO work_lines
          (work_id, person_id, person_name, rate_name, rate_amount, quantity,
           called_count, called_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workId,
          l.person_id || null,
          l.person_name.trim(),
          l.rate_name || 'Work',
          Number(l.rate_amount),
          Number(l.quantity) || 1,
          calledCount,
          calledCount > 0 ? Number(l.called_amount) : null,
        ],
      );
      keep.add(personKey(l.person_name));
    }
    for (const e of work.extras || []) {
      const res = await tx.execute(
        'INSERT INTO extras (work_id, name, amount) VALUES (?, ?, ?)',
        [workId, clean(e.name), Number(e.amount)],
      );
      for (const p of e.people || []) {
        await tx.execute(
          'INSERT INTO extra_people (extra_id, person_id, person_name) VALUES (?, ?, ?)',
          [res.insertId, p.person_id || null, p.person_name.trim()],
        );
        keep.add(personKey(p.person_name));
      }
    }
    const paid = await tx.execute(
      'SELECT id, person_name FROM payments WHERE work_id = ?',
      [workId],
    );
    for (const p of paid.rows || []) {
      if (!keep.has(personKey(p.person_name))) {
        await tx.execute('DELETE FROM payments WHERE id = ?', [p.id]);
      }
    }
  });
  return workId;
}

/** Deletes the work; its lines, extras and payments go with it (CASCADE). */
export function deleteWork(id) {
  return run('DELETE FROM works WHERE id = ?', [id]);
}

/** Mark a work collected from the owner on `date` ('YYYY-MM-DD'), or null = to collect. */
export function setCollected(workId, date) {
  return run('UPDATE works SET collected_at = ? WHERE id = ?', [
    date || null,
    workId,
  ]);
}

/** Mark several works collected on `date` (all or nothing). */
export async function setCollectedMany(workIds, date) {
  await transaction(async tx => {
    for (const wid of workIds) {
      await tx.execute('UPDATE works SET collected_at = ? WHERE id = ?', [
        date,
        wid,
      ]);
    }
  });
}
