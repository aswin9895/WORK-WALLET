import { query, run, transaction } from '../db/database';
import { clean } from './sql';
import { isMyselfEntry } from '@/domain/earnings';

export const MYSELF_SQL = `SELECT * FROM people
  WHERE uid = (SELECT value FROM app_meta WHERE key = 'myself_uid')`;

export async function getMyself() {
  return (await query(MYSELF_SQL))[0] || null;
}

export function listPeople() {
  return query(`SELECT *, CASE WHEN uid =
    (SELECT value FROM app_meta WHERE key = 'myself_uid') THEN 1 ELSE 0 END AS is_myself
    FROM people ORDER BY name COLLATE NOCASE`);
}

/**
 * default_rate_amount: optional fixed amount for this person (filled in when
 * they are added to a work). default_rate_name is no longer used (always NULL).
 */
export async function savePerson({
  id,
  name,
  phone,
  default_rate_amount,
  is_myself,
}) {
  const amt =
    default_rate_amount === '' ||
    default_rate_amount === null ||
    default_rate_amount === undefined
      ? null
      : Number(default_rate_amount);
  const params = [clean(name), clean(phone), amt];
  let personId = id;
  await transaction(async tx => {
    if (personId) {
      await tx.execute(
        'UPDATE people SET name = ?, phone = ?, default_rate_name = NULL, default_rate_amount = ? WHERE id = ?',
        [...params, personId],
      );
    } else {
      const res = await tx.execute(
        'INSERT INTO people (name, phone, default_rate_amount) VALUES (?, ?, ?)',
        params,
      );
      personId = res.insertId;
    }
    const res = await tx.execute('SELECT * FROM people WHERE id = ?', [
      personId,
    ]);
    const person = res.rows[0];
    if (!person) {
      throw new Error('This person no longer exists.');
    }
    const current = (await tx.execute(MYSELF_SQL)).rows[0];
    if (is_myself || (is_myself === undefined && current?.id === personId)) {
      const called = (
        await tx.execute('SELECT * FROM work_lines WHERE called_count > 0')
      ).rows;
      if (called.some(l => isMyselfEntry(l, person))) {
        throw new Error(
          'This person has people called in saved works. Move those workers to separate entries before marking this person as yourself.',
        );
      }
      await tx.execute(
        `INSERT INTO app_meta (key, value) VALUES ('myself_uid', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [person.uid],
      );
    } else if (is_myself === false && current?.id === personId) {
      await tx.execute("DELETE FROM app_meta WHERE key = 'myself_uid'");
    }
  });
  return personId;
}

/** Past work keeps the person's name (lines/payments store a copy). */
export function deletePerson(id) {
  return run('DELETE FROM people WHERE id = ?', [id]);
}
