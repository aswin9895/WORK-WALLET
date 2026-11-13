/**
 * Add / edit a money entry (floating FormSheet).
 *
 *   entry: null = closed
 *          {}   = new (choose the kind: expense, income, savings,
 *                 withdrawal, will get back)
 *          { type: 'repayment', lend_id, account_id, amount, date } = new
 *                 repayment for a "will get back" (from LendsScreen)
 *          { id, … } = edit (salary: amount / date / month; the kind of a
 *                 salary or repayment can't change)
 *   data:  getMoneyData() result (accounts, savings types, suggestions)
 *   onSaved() after save / delete
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FileText, ReceiptText, Tag } from 'lucide-react-native';
import {
  AmountField,
  ChoicePills,
  FormSheet,
  IconField,
} from '@/components/kit';
import { FixedText } from '@/components/ui';
import Combo from '@/components/form/Combo';
import DateField from '@/components/form/DateField';
import { useStyles } from '@/theme';
import { deleteMoneyEntry, saveMoneyEntry, saveSalary } from '@/data';
import { confirmDelete, showError } from '@/components/alert';
import {
  ADDABLE_TYPES,
  ENTRY_TYPES,
  lendStatus,
  monthOptions,
  moneyP,
  nameSuggestions,
  paiseText,
  salaryMonthOf,
  sortAccounts,
  toPaise,
} from '@/domain/money';
import { formatAmountInput, todayIso } from '@/utils/format';
import { Pick } from './parts';

const TYPE_OPTIONS = ADDABLE_TYPES.map(t => ({
  value: t,
  label: ENTRY_TYPES[t].label,
}));

const NAME_LABEL = {
  expense: 'What for',
  income: 'From / what',
  lend: 'Who will give it back',
};
const NAME_PLACEHOLDER = {
  expense: 'e.g. Petrol',
  income: 'e.g. Interest',
  lend: 'Name',
};

export default function EntrySheet({ entry, data, onClose, onSaved }) {
  const s = useStyles();
  // keep the last entry while the card slides out
  const [current, setCurrent] = useState(null);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState(null);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [savingsTypeId, setSavingsTypeId] = useState(null);
  const [forMonth, setForMonth] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const accounts = useMemo(
    () => sortAccounts(data?.accounts || []),
    [data],
  );
  const lends = useMemo(
    () => (data ? lendStatus(data.entries) : []),
    [data],
  );

  useEffect(() => {
    if (!entry) {
      return;
    }
    setCurrent(entry);
    setType(entry.type || 'expense');
    setAmount(entry.amount ? formatAmountInput(paiseText(entry.amount)) : '');
    setName(entry.name || '');
    setAccountId(
      entry.account_id ||
        accounts.find(a => a.is_salary)?.id ||
        accounts[0]?.id ||
        null,
    );
    setDate(entry.date || todayIso());
    setNote(entry.note || '');
    setSavingsTypeId(entry.savings_type_id || null);
    setForMonth(entry.for_month || null);
    setError(null);
    setSaving(false);
  }, [entry, accounts]);

  if (!current || !data) {
    return null;
  }
  const editing = !!current.id;
  const fixedKind = type === 'salary' || type === 'repayment';
  const lend =
    type === 'repayment'
      ? lends.find(l => l.lend.id === current.lend_id)
      : null;
  const suggestions =
    type === 'lend' ? nameSuggestions(data.entries, 'lend') : [];
  const shownName = name.trim().toLowerCase();

  const onSave = async () => {
    if (saving) {
      return;
    }
    const paise = toPaise(amount);
    if (!Number.isInteger(paise) || paise <= 0) {
      setError('Enter an amount above ₹0 (up to 2 decimals).');
      return;
    }
    const row = {
      id: current.id,
      type,
      amount: paise,
      date,
      account_id: type === 'repayment' ? lend?.lend.account_id : accountId,
      name: type === 'repayment' ? null : name,
      note,
      savings_type_id: savingsTypeId,
      lend_id: current.lend_id,
      for_month: type === 'salary' ? forMonth || salaryMonthOf(date) : null,
    };
    setSaving(true);
    try {
      if (type === 'salary') {
        await saveSalary(row); // real balances stay as they are
      } else {
        await saveMoneyEntry(row);
      }
      onSaved();
    } catch (e) {
      setError(e.message || String(e));
      setSaving(false);
    }
  };

  const onDelete = async () => {
    let extra = '';
    if (type === 'lend') {
      const l = lends.find(x => x.lend.id === current.id);
      if (l?.repaid) {
        extra = `Its repayments (${moneyP(l.repaid)}) will be deleted too.`;
      }
    } else if (type === 'salary') {
      extra =
        'Its month joins the previous month, and the real bank balances typed for it are removed.';
    }
    const ok = await confirmDelete(
      `this ${ENTRY_TYPES[type].label.toLowerCase()} entry`,
      extra,
    );
    if (!ok) {
      return;
    }
    try {
      await deleteMoneyEntry(current.id);
      onSaved();
    } catch (e) {
      showError(e);
    }
  };

  const title = editing
    ? `Edit ${ENTRY_TYPES[type].label.toLowerCase()}`
    : type === 'repayment'
    ? 'Repaid'
    : 'Add money entry';

  return (
    <FormSheet
      visible={!!entry}
      title={title}
      Icon={ReceiptText}
      onClose={onClose}
      onSave={onSave}
      dangerLabel={editing ? 'Delete entry' : undefined}
      onDanger={editing ? onDelete : undefined}
    >
      {!fixedKind ? (
        <Pick
          label="Kind"
          options={TYPE_OPTIONS}
          value={type}
          onChange={t => {
            setType(t);
            setError(null);
          }}
        />
      ) : null}
      {type === 'repayment' && lend ? (
        <FixedText style={s.moneyNote}>
          {`${lend.lend.name} · given ${moneyP(lend.lend.amount)} · still to get ${moneyP(
            lend.remaining + (editing ? current.amount : 0),
          )}`}
        </FixedText>
      ) : null}

      <AmountField
        label="Amount (₹)"
        value={amount}
        onChangeText={t => {
          setAmount(t);
          setError(null);
        }}
      />

      {/* What for / From: plain typing; the person keeps earlier names */}
      {NAME_LABEL[type] && type !== 'lend' ? (
        <IconField
          label={NAME_LABEL[type]}
          Icon={Tag}
          value={name}
          onChangeText={setName}
          placeholder={NAME_PLACEHOLDER[type]}
        />
      ) : null}
      {type === 'lend' ? (
        <View style={s.kitField}>
          <FixedText style={s.kitFieldLabel}>{NAME_LABEL[type]}</FixedText>
          <Combo
            kit
            placeholder={NAME_PLACEHOLDER[type]}
            value={name}
            onChangeText={setName}
            options={suggestions.map(n => ({ key: n, label: n }))}
            selectedKeys={suggestions.filter(n => n.toLowerCase() === shownName)}
            closeOnPick
            onPick={o => setName(o.label)}
          />
        </View>
      ) : null}

      {type === 'savings' || type === 'withdrawal' ? (
        data.savingsTypes.length ? (
          <Pick
            label="Savings"
            options={data.savingsTypes.map(t => ({
              value: t.id,
              label: t.name,
            }))}
            value={savingsTypeId}
            onChange={setSavingsTypeId}
            placeholder="Choose savings"
          />
        ) : (
          <FixedText style={s.moneyNote}>
            Add your savings types first (Settings → Money → Savings).
          </FixedText>
        )
      ) : null}

      {type === 'salary' ? (
        <Pick
          label="Salary for"
          options={monthOptions(date)}
          value={forMonth || salaryMonthOf(date)}
          onChange={setForMonth}
        />
      ) : null}

      {!fixedKind && accounts.length > 1 ? (
        <View style={s.kitField}>
          <FixedText style={s.kitFieldLabel}>Account</FixedText>
          <ChoicePills
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={setAccountId}
          />
        </View>
      ) : null}

      <View style={s.kitField}>
        <FixedText style={s.kitFieldLabel}>Date</FixedText>
        <DateField kit value={date} onChange={setDate} />
      </View>

      <IconField
        label="Note (optional)"
        Icon={FileText}
        value={note}
        onChangeText={setNote}
        placeholder={type === 'lend' ? 'e.g. EMI' : ''}
      />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}
