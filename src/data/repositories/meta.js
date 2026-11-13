/** Small key/value settings stored in app_meta (device_id, theme choice, …). */
import { query, run } from '../db/database';

export async function getMeta(key) {
  const rows = await query('SELECT value FROM app_meta WHERE key = ?', [key]);
  return rows[0] ? rows[0].value : null;
}

export function setMeta(key, value) {
  return run(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value === null || value === undefined ? null : String(value)],
  );
}
