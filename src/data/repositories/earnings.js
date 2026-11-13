import { query } from '../db/database';
import { getMyself } from './people';

/** Home-only dashboard source; catering/work overviews retain their own totals. */
export async function getEarningsData() {
  const [myself, payments] = await Promise.all([
    getMyself(),
    query('SELECT person_id, person_name, amount, paid_at FROM payments'),
  ]);
  return { myself, payments };
}
