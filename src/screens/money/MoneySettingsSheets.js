/**
 * Forms of Settings → Money (floating FormSheets):
 *   AccountSheet     — bank account: name, balance on a date, salary account
 *   SavingsTypeSheet — Post office, Mutual fund …: name, already saved
 *   FixedItemSheet   — Bike EMI, Sruthi EMI …: kind, amount, account,
 *                      savings type / person, active
 * Each: item null = closed, {} = new, {id, …} = edit; onSaved() after save
 * or delete.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Landmark,
  PiggyBank,
  Repeat,
  Tag,
  User,
} from 'lucide-react-native';
import {
  AmountField,
  ChoicePills,
  FormSheet,
  IconField,
} from '@/components/kit';
import { CheckBox, FixedText } from '@/components/ui';
import DateField from '@/components/form/DateField';
import { useStyles } from '@/theme';
import {
  deleteFixedItem,
  deleteMoneyAccount,
  deleteSavingsType,
  saveFixedItem,
  saveMoneyAccount,
  saveSavingsType,
} from '@/data';
import { confirmDelete, showError } from '@/components/alert';
import {
  ENTRY_TYPES,
  FIXED_ITEM_TYPES,
  paiseText,
  sortAccounts,
  toPaise,
} from '@/domain/money';
import { formatAmountInput, todayIso } from '@/utils/format';
import { Pick } from './parts';

/** Tick row in a card, same look as "This is me" in the person sheet. */
export function Toggle({ label, on, onChange }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={s.kitRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
    >
      <CheckBox on={on} />
      <View style={s.kitRowBody}>
        <FixedText style={s.kitRowTitle}>{label}</FixedText>
      </View>
    </Pressable>
  );
}

/** Shared open/close + error/saving state of these sheets. */
function useSheet(item, reset) {
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (item) {
      setCurrent(item);
      setError(null);
      setSaving(false);
      reset(item);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);
  const run = async (fn, onSaved) => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await fn();
      onSaved();
    } catch (e) {
      setError(e.message || String(e));
      setSaving(false);
    }
  };
  return { current, error, setError, run };
}

async function askDelete(what, extra, fn, onSaved) {
  if (!(await confirmDelete(what, extra))) {
    return;
  }
  try {
    await fn();
    onSaved();
  } catch (e) {
    showError(e);
  }
}

export function AccountSheet({ account, onClose, onSaved }) {
  const s = useStyles();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [date, setDate] = useState(todayIso());
  const [isSalary, setIsSalary] = useState(false);
  const { current, error, setError, run } = useSheet(account, a => {
    setName(a.name || '');
    setBalance(
      a.id ? formatAmountInput(paiseText(a.opening_balance), true) : '',
    );
    setDate(a.opening_date || todayIso());
    setIsSalary(!!a.is_salary);
  });
  if (!current) {
    return null;
  }
  const editing = !!current.id;
  const save = () => {
    const paise = balance.trim() === '' ? 0 : toPaise(balance);
    if (!Number.isInteger(paise)) {
      setError('Enter the balance (up to 2 decimals).');
      return;
    }
    run(
      () =>
        saveMoneyAccount({
          id: current.id,
          name,
          is_salary: isSalary,
          opening_balance: paise,
          opening_date: date,
        }),
      onSaved,
    );
  };
  return (
    <FormSheet
      visible={!!account}
      title={editing ? 'Edit account' : 'New account'}
      Icon={Landmark}
      onClose={onClose}
      onSave={save}
      dangerLabel={editing ? 'Delete account' : undefined}
      onDanger={
        editing
          ? () =>
              askDelete(
                `"${current.name}"`,
                'Only an account without entries can be deleted.',
                () => deleteMoneyAccount(current.id),
                onSaved,
              )
          : undefined
      }
    >
      <IconField
        label="Account name *"
        Icon={Landmark}
        value={name}
        onChangeText={t => {
          setName(t);
          setError(null);
        }}
        placeholder="e.g. HDFC"
      />
      <AmountField
        label="Balance on the start date (₹)"
        allowNegative
        value={balance}
        onChangeText={t => {
          setBalance(t);
          setError(null);
        }}
      />
      <View style={s.kitField}>
        <FixedText style={s.kitFieldLabel}>Start date</FixedText>
        <DateField kit value={date} onChange={setDate} />
      </View>
      <FixedText style={s.moneyNote}>
        The app starts counting from this balance on this date. Entries can't
        be earlier.
      </FixedText>
      <Toggle
        label="This is my salary account"
        on={isSalary}
        onChange={setIsSalary}
      />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}

export function SavingsTypeSheet({ savingsType, onClose, onSaved }) {
  const s = useStyles();
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const { current, error, setError, run } = useSheet(savingsType, t => {
    setName(t.name || '');
    setOpening(
      t.opening_amount ? formatAmountInput(paiseText(t.opening_amount)) : '',
    );
  });
  if (!current) {
    return null;
  }
  const editing = !!current.id;
  const save = () => {
    const paise = opening.trim() === '' ? 0 : toPaise(opening);
    if (!Number.isInteger(paise) || paise < 0) {
      setError('Enter the amount already saved (or leave it empty).');
      return;
    }
    run(
      () =>
        saveSavingsType({ id: current.id, name, opening_amount: paise }),
      onSaved,
    );
  };
  return (
    <FormSheet
      visible={!!savingsType}
      title={editing ? 'Edit savings' : 'New savings'}
      Icon={PiggyBank}
      onClose={onClose}
      onSave={save}
      dangerLabel={editing ? 'Delete savings' : undefined}
      onDanger={
        editing
          ? () =>
              askDelete(
                `"${current.name}"`,
                'Only savings without entries can be deleted. Its fixed items go too.',
                () => deleteSavingsType(current.id),
                onSaved,
              )
          : undefined
      }
    >
      <IconField
        label="Savings name *"
        Icon={PiggyBank}
        value={name}
        onChangeText={t => {
          setName(t);
          setError(null);
        }}
        placeholder="e.g. Post office"
      />
      <AmountField
        label="Already saved before the app (₹, optional)"
        value={opening}
        onChangeText={t => {
          setOpening(t);
          setError(null);
        }}
      />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}

const FIXED_TYPE_OPTIONS = FIXED_ITEM_TYPES.map(t => ({
  value: t,
  label: ENTRY_TYPES[t].label,
}));

export function FixedItemSheet({ item, data, onClose, onSaved }) {
  const s = useStyles();
  const accounts = sortAccounts(data?.accounts || []);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(null);
  const [savingsTypeId, setSavingsTypeId] = useState(null);
  const [person, setPerson] = useState('');
  const [active, setActive] = useState(true);
  const { current, error, setError, run } = useSheet(item, f => {
    setName(f.name || '');
    setType(f.type || 'expense');
    setAmount(f.amount ? formatAmountInput(paiseText(f.amount)) : '');
    setAccountId(
      f.account_id ||
        accounts.find(a => a.is_salary)?.id ||
        accounts[0]?.id ||
        null,
    );
    setSavingsTypeId(f.savings_type_id || null);
    setPerson(f.person || '');
    setActive(f.id ? !!f.active : true);
  });
  if (!current || !data) {
    return null;
  }
  const editing = !!current.id;
  const save = () => {
    const paise = toPaise(amount);
    if (!Number.isInteger(paise) || paise <= 0) {
      setError('Enter an amount above ₹0 (up to 2 decimals).');
      return;
    }
    run(
      () =>
        saveFixedItem({
          id: current.id,
          name,
          type,
          amount: paise,
          account_id: accountId,
          savings_type_id: savingsTypeId,
          person,
          active,
        }),
      onSaved,
    );
  };
  return (
    <FormSheet
      visible={!!item}
      title={editing ? 'Edit fixed item' : 'New fixed item'}
      Icon={Repeat}
      onClose={onClose}
      onSave={save}
      dangerLabel={editing ? 'Remove fixed item' : undefined}
      onDanger={
        editing
          ? () =>
              askDelete(
                `"${current.name}"`,
                'Entries already added from it stay.',
                () => deleteFixedItem(current.id),
                onSaved,
              )
          : undefined
      }
    >
      <IconField
        label="Name *"
        Icon={Tag}
        value={name}
        onChangeText={t => {
          setName(t);
          setError(null);
        }}
        placeholder="e.g. Bike EMI"
      />
      <Pick
        label="Kind"
        options={FIXED_TYPE_OPTIONS}
        value={type}
        onChange={t => {
          setType(t);
          setError(null);
        }}
      />
      <AmountField
        label="Amount every month (₹)"
        value={amount}
        onChangeText={t => {
          setAmount(t);
          setError(null);
        }}
      />
      {type === 'savings' ? (
        <Pick
          label="Savings"
          options={data.savingsTypes.map(t => ({ value: t.id, label: t.name }))}
          value={savingsTypeId}
          onChange={setSavingsTypeId}
          placeholder={
            data.savingsTypes.length ? 'Choose savings' : 'Add savings first'
          }
        />
      ) : null}
      {type === 'lend' ? (
        <IconField
          label="Who will give it back *"
          Icon={User}
          value={person}
          onChangeText={t => {
            setPerson(t);
            setError(null);
          }}
          placeholder="e.g. Sruthi"
        />
      ) : null}
      {accounts.length > 1 ? (
        <View style={s.kitField}>
          <FixedText style={s.kitFieldLabel}>Paid from</FixedText>
          <ChoicePills
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={setAccountId}
          />
        </View>
      ) : null}
      <Toggle
        label="Active (show it every month)"
        on={active}
        onChange={setActive}
      />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}
