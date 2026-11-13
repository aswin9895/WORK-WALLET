/**
 * Read side of a future backend sync. Nothing calls this yet.
 *
 * A sync client would:
 *   1. getChangesSince(lastSyncedAt) → upload rows + deletions
 *   2. download server changes and write them with the same uid
 *      (inserts with an explicit uid / updated_at keep them — see the
 *      triggers in src/data/db/migrations.js, v6)
 *   3. setMeta('last_synced_at', serverTime)
 *
 * Rows are identified by `uid` (never by the local integer `id`, which differs
 * per phone). Foreign keys are local ids, so an uploader must translate
 * e.g. works.catering_id → caterings.uid.
 */
import { query } from '../db/database';
import { SYNCED_TABLES } from '../db/migrations';
import { getMeta } from '../repositories/meta';

export const getDeviceId = () => getMeta('device_id');

/** Everything created/changed/deleted after `since` (ISO time, or null = all). */
export async function getChangesSince(since) {
  const changes = {};
  for (const table of SYNCED_TABLES) {
    changes[table] = since
      ? await query(
          `SELECT * FROM ${table} WHERE updated_at > ? ORDER BY updated_at`,
          [since],
        )
      : await query(`SELECT * FROM ${table} ORDER BY updated_at`);
  }
  const deletions = since
    ? await query(
        'SELECT * FROM sync_deletions WHERE deleted_at > ? ORDER BY deleted_at',
        [since],
      )
    : await query('SELECT * FROM sync_deletions ORDER BY deleted_at');
  return { changes, deletions };
}
