/**
 * Loads all money data when the screen comes into focus and derives the
 * current salary month, balances, owed, savings and fixed items due
 * (domain/money deriveMoney). reload() after a save.
 */
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMoneyData } from '@/data';
import { deriveMoney } from '@/domain/money';
import { todayIso } from '@/utils/format';

export default function useMoneyData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // `version` changes on reload() → load again
      if (version < 0) {
        return undefined;
      }
      getMoneyData()
        .then(d => {
          if (active) {
            setData(d);
            setError(null);
          }
        })
        .catch(e => {
          if (active) {
            setError(e?.message || 'Could not load your money data');
          }
        });
      return () => {
        active = false;
      };
    }, [version]),
  );

  const derived = useMemo(
    () => (data ? deriveMoney(data, todayIso()) : null),
    [data],
  );
  const reload = useCallback(() => setVersion(v => v + 1), []);
  return { data, derived, error, reload };
}
