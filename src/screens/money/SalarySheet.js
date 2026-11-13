/**
 * "Got salary" — closes the current salary month and starts the next:
 * salary amount, date, which month it is for, and (optional) each bank's
 * REAL balance before this salary. The difference from what the entries
 * add up to is shown live and saved as Missing / Extra.
 *
 *   mode 'new'    → saveSalary(salary, checks)
 *   mode 'checks' → edit the real balances of an existing salary
 *                   (props.salary) → saveChecks
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Landmark, Wallet } from 'lucide-react-native';
import { AmountField, FormSheet } from '@/components/kit';
import { FixedText } from '@/components/ui';
import DateField from '@/components/form/DateField';
import { useStyles } from '@/theme';
import { saveChecks, saveSalary } from '@/data';
import {
  balanceBefore,
  checkDifference,
  monthOptions,
  moneyP,
  paiseText,
  salaryMonthOf,
  sortAccounts,
  toPaise,
} from '@/domain/money';
import { formatAmountInput, todayIso } from '@/utils/format';
import { differenceText, Pick } from './parts';

export default function SalarySheet({
  open,
  mode = 'new',
  salary,
  data,
  onClose,
  onSaved,
}) {
  const s = useStyles();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [forMonth, setForMonth] = useState(null);
  const [actual, setActual] = useState({}); // account id → text
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const accounts = useMemo(
    () => sortAccounts(data?.accounts || []),
    [data],
  );
  const salaryAccount = accounts.find(a => a.is_salary);

  useEffect(() => {
    if (!open || !data) {
      return;
    }
    setError(null);
    setSaving(false);
    if (mode === 'checks' && salary) {
      setDate(salary.date);
      const typed = {};
      data.checks
        .filter(c => c.salary_id === salary.id)
        .forEach(c => {
          typed[c.account_id] = formatAmountInput(
            paiseText(c.actual_balance),
            true,
          );
        });
      setActual(typed);
    } else {
      const last = data.entries
        .filter(e => e.type === 'salary')
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      setAmount(last ? formatAmountInput(paiseText(last.amount)) : '');
      setDate(todayIso());
      setForMonth(null);
      setActual({});
    }
  }, [open, mode, salary, data]);

  if (!data) {
    return null;
  }
  const checkDate = mode === 'checks' && salary ? salary.date : date;

  const parsedChecks = () =>
    accounts.map(a => {
      const text = (actual[a.id] || '').trim();
      return {
        account_id: a.id,
        actual_balance: text === '' ? null : toPaise(text),
      };
    });

  const onSave = async () => {
    if (saving) {
      return;
    }
    const checks = parsedChecks();
    if (checks.some(c => Number.isNaN(c.actual_balance))) {
      setError('Check the bank balances (numbers, up to 2 decimals).');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'checks') {
        await saveChecks(salary.id, checks);
      } else {
        const paise = toPaise(amount);
        if (!Number.isInteger(paise) || paise <= 0) {
          setError('Enter the salary amount.');
          setSaving(false);
          return;
        }
        await saveSalary(
          {
            account_id: salaryAccount.id,
            amount: paise,
            date,
            for_month: forMonth || salaryMonthOf(date),
          },
          checks.filter(c => c.actual_balance !== null),
        );
      }
      onSaved();
    } catch (e) {
      setError(e.message || String(e));
      setSaving(false);
    }
  };

  return (
    <FormSheet
      visible={open}
      title={mode === 'checks' ? 'Real bank balances' : 'Got salary'}
      Icon={mode === 'checks' ? Landmark : Wallet}
      onClose={onClose}
      onSave={onSave}
    >
      {mode === 'new' ? (
        <>
          {!salaryAccount ? (
            <FixedText style={s.errorText}>
              Mark one account as the salary account first (Settings →
              Money).
            </FixedText>
          ) : null}
          <AmountField
            label={`Salary (₹)${salaryAccount ? ` · ${salaryAccount.name}` : ''}`}
            value={amount}
            onChangeText={t => {
              setAmount(t);
              setError(null);
            }}
          />
          <View style={s.kitField}>
            <FixedText style={s.kitFieldLabel}>Salary date</FixedText>
            <DateField kit value={date} onChange={setDate} />
          </View>
          <Pick
            label="Salary for"
            options={monthOptions(date)}
            value={forMonth || salaryMonthOf(date)}
            onChange={setForMonth}
          />
          <FixedText style={s.kitFieldLabel}>
            Real bank balance before this salary (optional)
          </FixedText>
          <FixedText style={s.moneyNote}>
            Type what the bank shows, without this salary. The difference is
            saved as Missing / Extra for the month that ends.
          </FixedText>
        </>
      ) : (
        <FixedText style={s.moneyNote}>
          What each bank showed before the salary of {salary?.date}. Leave
          empty if not known.
        </FixedText>
      )}

      {accounts.map(a => {
        const text = (actual[a.id] || '').trim();
        const typed = text === '' ? null : toPaise(text);
        // what the entries add up to before the salary (its own check ignored)
        const appBalance = balanceBefore(
          a,
          data.entries,
          data.checks,
          checkDate,
          checkDate,
        );
        const diff =
          typed === null || Number.isNaN(typed)
            ? null
            : checkDifference(a, data.entries, data.checks, checkDate, typed);
        return (
          <View key={a.id} style={s.moneyCheck}>
            <AmountField
              label={a.name}
              Icon={Landmark}
              allowNegative
              value={actual[a.id] || ''}
              onChangeText={t => {
                setActual(m => ({ ...m, [a.id]: t }));
                setError(null);
              }}
              placeholder={formatAmountInput(paiseText(appBalance), true)}
            />
            <FixedText style={s.moneyCheckHint}>
              {`App says ${moneyP(appBalance)}${
                diff !== null ? ` · ${differenceText(diff)}` : ''
              }`}
            </FixedText>
          </View>
        );
      })}
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}
