/**
 * Money tracking on SQLite. Amounts are INTEGER PAISE (see domain/money.js).
 * Every write checks the rules with fresh data inside one transaction, so a
 * rejected save changes nothing.
 */
import { query, transaction } from '../db/database';
import { clean } from './sql';
import {
  entryError,
  entryFromFixedItem,
  FIXED_ITEM_TYPES,
  lendStatus,
  salaryMonthOf,
  savingsTotals,
} from '@/domain/money';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isPaise = v => Number.isInteger(v);

/** Everything the money screens need (small tables; logic in domain/money). */
export async function getMoneyData() {
  const [accounts, entries, checks, savingsTypes, fixedItems] =
    await Promise.all([
      query('SELECT * FROM money_accounts ORDER BY sort_order, id'),
      query('SELECT * FROM money_entries ORDER BY date, id'),
      query('SELECT * FROM money_checks ORDER BY id'),
      query('SELECT * FROM savings_types ORDER BY name COLLATE NOCASE'),
      query('SELECT * FROM money_fixed_items ORDER BY active DESC, id'),
    ]);
  return { accounts, entries, checks, savingsTypes, fixedItems };
}

const one = async (tx, sql, params) => (await tx.execute(sql, params)).rows[0];
const all = async (tx, sql, params) =>
  (await tx.execute(sql, params)).rows || [];

/* ---------------------------------------------------------------------- */
/* accounts                                                                */
/* ---------------------------------------------------------------------- */

/**
 * { id?, name, is_salary, opening_balance (paise), opening_date }
 * Only one salary account. Returns the id.
 */
export async function saveMoneyAccount(acc) {
  const name = clean(acc.name);
  if (!name) {
    throw new Error('Type the account name.');
  }
  if (!isPaise(acc.opening_balance)) {
    throw new Error('Enter the balance (up to 2 decimals).');
  }
  if (!acc.opening_date || !DATE_RE.test(acc.opening_date)) {
    throw new Error('Pick the date of this balance.');
  }
  const isSalary = acc.is_salary ? 1 : 0;
  let id = acc.id;
  await transaction(async tx => {
    const same = await one(
      tx,
      'SELECT id FROM money_accounts WHERE name = ? COLLATE NOCASE AND id IS NOT ?',
      [name, id || null],
    );
    if (same) {
      throw new Error(`An account called "${name}" already exists.`);
    }
    if (isSalary) {
      const other = await one(
        tx,
        'SELECT name FROM money_accounts WHERE is_salary = 1 AND id IS NOT ?',
        [id || null],
      );
      if (other) {
        throw new Error(
          `"${other.name}" is already the salary account. Only one account can get the salary.`,
        );
      }
    }
    if (id) {
      const salaries = await one(
        tx,
        "SELECT COUNT(*) AS n FROM money_entries WHERE account_id = ? AND type = 'salary'",
        [id],
      );
      if (!isSalary && salaries.n > 0) {
        throw new Error(
          'This account has salaries saved, so it must stay the salary account.',
        );
      }
      const early = await one(
        tx,
        'SELECT MIN(date) AS d FROM money_entries WHERE account_id = ?',
        [id],
      );
      if (early?.d && early.d < acc.opening_date) {
        throw new Error(
          `This account has entries from ${early.d}. The balance date can't be later than that.`,
        );
      }
      await tx.execute(
        'UPDATE money_accounts SET name = ?, is_salary = ?, opening_balance = ?, opening_date = ? WHERE id = ?',
        [name, isSalary, acc.opening_balance, acc.opening_date, id],
      );
    } else {
      const res = await tx.execute(
        `INSERT INTO money_accounts (name, is_salary, opening_balance, opening_date, sort_order)
         VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM money_accounts))`,
        [name, isSalary, acc.opening_balance, acc.opening_date],
      );
      id = res.insertId;
    }
  });
  return id;
}

/** Only an account with no entries / fixed items can be deleted. */
export async function deleteMoneyAccount(id) {
  await transaction(async tx => {
    const used = await one(
      tx,
      `SELECT (SELECT COUNT(*) FROM money_entries WHERE account_id = ?)
            + (SELECT COUNT(*) FROM money_fixed_items WHERE account_id = ?) AS n`,
      [id, id],
    );
    if (used.n > 0) {
      throw new Error(
        'This account has entries or fixed items. Delete those first.',
      );
    }
    await tx.execute('DELETE FROM money_checks WHERE account_id = ?', [id]);
    await tx.execute('DELETE FROM money_accounts WHERE id = ?', [id]);
  });
}

/* ---------------------------------------------------------------------- */
/* savings types                                                           */
/* ---------------------------------------------------------------------- */

/** { id?, name, opening_amount (paise, already saved before the app) } */
export async function saveSavingsType(st) {
  const name = clean(st.name);
  if (!name) {
    throw new Error('Type the savings name (e.g. Post office).');
  }
  const opening = st.opening_amount ?? 0;
  if (!isPaise(opening) || opening < 0) {
    throw new Error('Enter the amount already saved (or leave it empty).');
  }
  let id = st.id;
  await transaction(async tx => {
    const same = await one(
      tx,
      'SELECT id FROM savings_types WHERE name = ? COLLATE NOCASE AND id IS NOT ?',
      [name, id || null],
    );
    if (same) {
      throw new Error(`"${name}" already exists.`);
    }
    if (id) {
      await tx.execute(
        'UPDATE savings_types SET name = ?, opening_amount = ? WHERE id = ?',
        [name, opening, id],
      );
      // withdrawals may not exceed what's saved
      const types = await all(tx, 'SELECT * FROM savings_types WHERE id = ?', [
        id,
      ]);
      const entries = await all(
        tx,
        'SELECT * FROM money_entries WHERE savings_type_id = ?',
        [id],
      );
      if (savingsTotals(types, entries)[0].total < 0) {
        throw new Error(
          'More was withdrawn from this savings than that. Check the amount.',
        );
      }
    } else {
      const res = await tx.execute(
        'INSERT INTO savings_types (name, opening_amount) VALUES (?, ?)',
        [name, opening],
      );
      id = res.insertId;
    }
  });
  return id;
}

/** Only a savings type with no entries can be deleted (fixed items go too). */
export async function deleteSavingsType(id) {
  await transaction(async tx => {
    const used = await one(
      tx,
      'SELECT COUNT(*) AS n FROM money_entries WHERE savings_type_id = ?',
      [id],
    );
    if (used.n > 0) {
      throw new Error(
        'This savings type has entries. It can be renamed, but not deleted.',
      );
    }
    await tx.execute('DELETE FROM savings_types WHERE id = ?', [id]);
  });
}

/* ---------------------------------------------------------------------- */
/* entries                                                                 */
/* ---------------------------------------------------------------------- */

/** Rules that need other rows. Throws with a message for the owner. */
async function checkEntry(tx, e, id) {
  const err = entryError(e);
  if (err) {
    throw new Error(err);
  }
  const account = await one(tx, 'SELECT * FROM money_accounts WHERE id = ?', [
    e.account_id,
  ]);
  if (!account) {
    throw new Error('This account no longer exists.');
  }
  if (e.date < account.opening_date) {
    throw new Error(
      `${account.name} starts on ${account.opening_date}. Pick that date or later.`,
    );
  }
  if (e.type === 'salary') {
    if (!account.is_salary) {
      throw new Error('Salary can only be added to the salary account.');
    }
    const same = await one(
      tx,
      "SELECT id FROM money_entries WHERE type = 'salary' AND date = ? AND id IS NOT ?",
      [e.date, id || null],
    );
    if (same) {
      throw new Error(
        'A salary is already saved on this date. Add extra money as Income.',
      );
    }
  }
  if (e.type === 'savings' || e.type === 'withdrawal') {
    const st = await one(tx, 'SELECT * FROM savings_types WHERE id = ?', [
      e.savings_type_id,
    ]);
    if (!st) {
      throw new Error('This savings type no longer exists.');
    }
  }
  if (e.type === 'repayment') {
    const lend = await one(
      tx,
      "SELECT * FROM money_entries WHERE id = ? AND type = 'lend'",
      [e.lend_id],
    );
    if (!lend) {
      throw new Error('This "Will get back" entry no longer exists.');
    }
    if (lend.account_id !== e.account_id) {
      throw new Error('A repayment goes back to the account it was paid from.');
    }
    if (e.date < lend.date) {
      throw new Error(
        `It was given on ${lend.date}; the repayment can't be earlier.`,
      );
    }
  }
}

/** After a write: no savings below zero, no lend repaid more than given. */
async function checkTotals(tx) {
  const types = await all(tx, 'SELECT * FROM savings_types');
  const entries = await all(
    tx,
    "SELECT * FROM money_entries WHERE type IN ('savings', 'withdrawal', 'lend', 'repayment')",
  );
  const negative = savingsTotals(types, entries).find(t => t.total < 0);
  if (negative) {
    throw new Error(
      `You can't take out more than is saved in ${negative.type.name}.`,
    );
  }
  const over = lendStatus(entries).find(l => l.remaining < 0);
  if (over) {
    throw new Error(
      `${over.lend.name} would repay more than was given. Check the amounts.`,
    );
  }
  const badRepay = lendStatus(entries).find(l =>
    l.repayments.some(
      r => r.account_id !== l.lend.account_id || r.date < l.lend.date,
    ),
  );
  if (badRepay) {
    throw new Error(
      `${badRepay.lend.name} already repaid some of this, so the account and date can't change like that.`,
    );
  }
}

const ENTRY_COLS = [
  'account_id',
  'type',
  'amount',
  'date',
  'name',
  'note',
  'for_month',
  'savings_type_id',
  'lend_id',
  'fixed_item_id',
];

function entryRow(e) {
  return {
    account_id: e.account_id,
    type: e.type,
    amount: e.amount,
    date: e.date,
    name: clean(e.name),
    note: clean(e.note),
    for_month:
      e.type === 'salary' ? e.for_month || salaryMonthOf(e.date) : null,
    savings_type_id:
      e.type === 'savings' || e.type === 'withdrawal'
        ? e.savings_type_id
        : null,
    lend_id: e.type === 'repayment' ? e.lend_id : null,
    fixed_item_id: e.fixed_item_id || null,
  };
}

async function writeEntry(tx, e) {
  const row = entryRow(e);
  await checkEntry(tx, row, e.id);
  if (e.id) {
    const old = await one(tx, 'SELECT * FROM money_entries WHERE id = ?', [
      e.id,
    ]);
    if (!old) {
      throw new Error('This entry no longer exists.');
    }
    // the edit form doesn't send the fixed-item link: keep it
    if (e.fixed_item_id === undefined) {
      row.fixed_item_id = old.fixed_item_id;
    }
    if (old.type !== row.type && (old.type === 'salary' || old.type === 'lend')) {
      const kids = await one(
        tx,
        'SELECT COUNT(*) AS n FROM money_entries WHERE lend_id = ?',
        [e.id],
      );
      if (old.type === 'salary' || kids.n > 0) {
        throw new Error(
          old.type === 'salary'
            ? "A salary can't be changed into another kind of entry. Delete it instead."
            : 'This has repayments, so it must stay "Will get back".',
        );
      }
    }
    await tx.execute(
      `UPDATE money_entries SET ${ENTRY_COLS.map(c => `${c} = ?`).join(
        ', ',
      )} WHERE id = ?`,
      [...ENTRY_COLS.map(c => row[c]), e.id],
    );
    return e.id;
  }
  const res = await tx.execute(
    `INSERT INTO money_entries (${ENTRY_COLS.join(', ')})
     VALUES (${ENTRY_COLS.map(() => '?').join(', ')})`,
    ENTRY_COLS.map(c => row[c]),
  );
  return res.insertId;
}

/**
 * Add / edit any entry except a salary with checks (use saveSalary).
 * entry: { id?, account_id, type, amount (paise), date, name, note,
 *          savings_type_id?, lend_id?, fixed_item_id? }
 */
export async function saveMoneyEntry(entry) {
  let id;
  await transaction(async tx => {
    id = await writeEntry(tx, entry);
    await checkTotals(tx);
  });
  return id;
}

/** Delete an entry (a lend takes its repayments, a salary its checks). */
export async function deleteMoneyEntry(id) {
  await transaction(async tx => {
    await tx.execute('DELETE FROM money_entries WHERE id = ?', [id]);
    await checkTotals(tx);
  });
}

async function writeChecks(tx, salaryId, checks) {
  for (const c of checks || []) {
    if (c.actual_balance === null || c.actual_balance === undefined) {
      await tx.execute(
        'DELETE FROM money_checks WHERE salary_id = ? AND account_id = ?',
        [salaryId, c.account_id],
      );
    } else {
      if (!isPaise(c.actual_balance)) {
        throw new Error('Enter the bank balance (up to 2 decimals).');
      }
      await tx.execute(
        `INSERT INTO money_checks (salary_id, account_id, actual_balance)
         VALUES (?, ?, ?)
         ON CONFLICT(salary_id, account_id)
         DO UPDATE SET actual_balance = excluded.actual_balance`,
        [salaryId, c.account_id, c.actual_balance],
      );
    }
  }
}

/**
 * "Got salary": the salary entry + the real balance of each account before
 * it (checks: [{ account_id, actual_balance (paise) | null = not typed }]),
 * in one transaction. Also used to edit a salary.
 */
export async function saveSalary(salary, checks = []) {
  let id;
  await transaction(async tx => {
    id = await writeEntry(tx, { ...salary, type: 'salary' });
    await writeChecks(tx, id, checks);
    await checkTotals(tx);
  });
  return id;
}

/** Change the real balances typed for a salary month's close. */
export async function saveChecks(salaryId, checks) {
  await transaction(async tx => {
    const salary = await one(
      tx,
      "SELECT id FROM money_entries WHERE id = ? AND type = 'salary'",
      [salaryId],
    );
    if (!salary) {
      throw new Error('This salary no longer exists.');
    }
    await writeChecks(tx, salaryId, checks);
  });
}

/* ---------------------------------------------------------------------- */
/* fixed monthly items                                                     */
/* ---------------------------------------------------------------------- */

/**
 * { id?, name, type: expense|savings|lend, amount (paise), account_id,
 *   savings_type_id?, person?, active? }
 */
export async function saveFixedItem(item) {
  const name = clean(item.name);
  if (!name) {
    throw new Error('Type a name (e.g. Bike EMI).');
  }
  if (!FIXED_ITEM_TYPES.includes(item.type)) {
    throw new Error('Choose what kind of item this is.');
  }
  if (!isPaise(item.amount) || item.amount <= 0) {
    throw new Error('Enter an amount above ₹0 (up to 2 decimals).');
  }
  if (!item.account_id) {
    throw new Error('Choose an account.');
  }
  if (item.type === 'savings' && !item.savings_type_id) {
    throw new Error('Choose the savings type.');
  }
  if (item.type === 'lend' && !clean(item.person)) {
    throw new Error('Type who will give it back.');
  }
  const row = [
    name,
    item.type,
    item.amount,
    item.account_id,
    item.type === 'savings' ? item.savings_type_id : null,
    item.type === 'lend' ? clean(item.person) : null,
    item.active === false || item.active === 0 ? 0 : 1,
  ];
  let id = item.id;
  await transaction(async tx => {
    if (id) {
      await tx.execute(
        `UPDATE money_fixed_items SET name = ?, type = ?, amount = ?, account_id = ?,
         savings_type_id = ?, person = ?, active = ? WHERE id = ?`,
        [...row, id],
      );
    } else {
      const res = await tx.execute(
        `INSERT INTO money_fixed_items
         (name, type, amount, account_id, savings_type_id, person, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        row,
      );
      id = res.insertId;
    }
  });
  return id;
}

/** Remove a fixed item; entries already added stay. */
export async function deleteFixedItem(id) {
  await transaction(async tx => {
    await tx.execute('DELETE FROM money_fixed_items WHERE id = ?', [id]);
  });
}

/** Add fixed items as entries dated `date` (all or nothing). */
export async function addFixedItems(itemIds, date) {
  await transaction(async tx => {
    for (const itemId of itemIds) {
      const item = await one(
        tx,
        'SELECT * FROM money_fixed_items WHERE id = ?',
        [itemId],
      );
      if (!item) {
        throw new Error('A fixed item no longer exists.');
      }
      await writeEntry(tx, entryFromFixedItem(item, date));
    }
    await checkTotals(tx);
  });
}
