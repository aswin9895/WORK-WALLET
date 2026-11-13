import { run, transaction } from '../db/database';
import { pendingPayments } from '@/domain/dues';

const PAYMENT_INSERT =
  'INSERT INTO payments (work_id, person_id, person_name, amount, paid_at) VALUES (?, ?, ?, ?, ?)';

const paymentParams = p => [
  p.work_id,
  p.person_id || null,
  p.person_name.trim(),
  Number(p.amount),
  p.paid_at,
];

/** Record money paid to a person for a work. */
export async function addPayment(p) {
  const res = await run(PAYMENT_INSERT, paymentParams(p));
  return res.insertId;
}

/** Record several payments at once (all or nothing). */
export async function addPayments(list) {
  await transaction(async tx => {
    for (const p of list) {
      await tx.execute(PAYMENT_INSERT, paymentParams(p));
    }
  });
}

export function deletePayment(id) {
  return run('DELETE FROM payments WHERE id = ?', [id]);
}

/** Settle selected works atomically, using current balances inside the transaction. */
export async function collectAndPayWorks(workIds, date) {
  await transaction(async tx => {
    for (const id of new Set(workIds)) {
      const read = async (sql, params) =>
        (await tx.execute(sql, params)).rows || [];
      const [work] = await read('SELECT * FROM works WHERE id = ?', [id]);
      if (!work) {
        throw new Error(
          'A selected work no longer exists. Refresh and try again.',
        );
      }
      const lines = await read('SELECT * FROM work_lines WHERE work_id = ?', [
        id,
      ]);
      const extras = await read('SELECT * FROM extras WHERE work_id = ?', [id]);
      for (const extra of extras) {
        extra.people = await read(
          'SELECT * FROM extra_people WHERE extra_id = ?',
          [extra.id],
        );
      }
      const payments = await read('SELECT * FROM payments WHERE work_id = ?', [
        id,
      ]);
      const pending = pendingPayments(
        [{ ...work, lines, extras, payments }],
        date,
      );
      await tx.execute(
        'UPDATE works SET collected_at = ? WHERE id = ? AND collected_at IS NULL',
        [date, id],
      );
      for (const payment of pending) {
        await tx.execute(PAYMENT_INSERT, paymentParams(payment));
      }
    }
  });
}
