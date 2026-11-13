/**
 * Small shared pieces of the money screens: type icons, an entry row, the
 * month summary block of one account, a selection dropdown and text
 * helpers. Styles: _money.scss (`money-` classes).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import {
  mdiAccountArrowLeft,
  mdiAccountArrowRight,
  mdiArrowDownBold,
  mdiArrowUpBold,
  mdiBankTransferIn,
  mdiCashPlus,
  mdiPiggyBank,
} from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import Combo from '@/components/form/Combo';
import MdiIcon from '@/components/graphics/MdiIcon';
import { ENTRY_TYPES, moneyP } from '@/domain/money';
import { dayMonthYear } from '@/utils/format';

export const TYPE_ICON = {
  salary: mdiCashPlus,
  income: mdiArrowDownBold,
  expense: mdiArrowUpBold,
  savings: mdiPiggyBank,
  withdrawal: mdiBankTransferIn,
  lend: mdiAccountArrowRight,
  repayment: mdiAccountArrowLeft,
};

/** "+₹7,250" (money in) / "−₹526.75" (money out) */
export function signedText(entry) {
  const plus = ENTRY_TYPES[entry.type]?.sign > 0;
  return `${plus ? '+' : '−'}${moneyP(entry.amount)}`;
}

/** Title of an entry: its name, the savings type, or the kind. */
export function entryTitle(entry, savingsTypes = [], lendsById = {}) {
  if (entry.type === 'savings' || entry.type === 'withdrawal') {
    const st = savingsTypes.find(t => t.id === entry.savings_type_id);
    return st ? st.name : ENTRY_TYPES[entry.type].label;
  }
  if (entry.type === 'repayment') {
    const lend = lendsById[entry.lend_id];
    return `${lend?.name || 'Someone'} repaid`;
  }
  if (entry.type === 'lend') {
    return entry.name || 'Someone';
  }
  return entry.name || ENTRY_TYPES[entry.type]?.label || '';
}

/** One entry: icon tile | title + kind · account · note | amount. */
export function EntryRow({ entry, title, accountName, showDate, onPress }) {
  const s = useStyles();
  const plus = ENTRY_TYPES[entry.type]?.sign > 0;
  const sub = [
    showDate ? dayMonthYear(entry.date) : null,
    ENTRY_TYPES[entry.type]?.label,
    accountName,
    entry.note,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.moneyEntry, pressed && s.moneyEntryPressed]}
    >
      <View style={s.moneyEntryTile}>
        <MdiIcon
          path={TYPE_ICON[entry.type]}
          size={20}
          color={plus ? s.palOk.color : s.palTileIcon.color}
        />
      </View>
      <View style={s.moneyEntryBody}>
        <FixedText style={s.moneyEntryName} numberOfLines={1}>
          {title}
        </FixedText>
        <FixedText style={s.moneyEntrySub} numberOfLines={2}>
          {sub}
        </FixedText>
      </View>
      <FixedText style={[s.moneyEntryAmount, plus && s.moneyPlus]}>
        {signedText(entry)}
      </FixedText>
    </Pressable>
  );
}

/** "label ............ value" */
export function Row({ label, value, tone, strong, muted }) {
  const s = useStyles();
  return (
    <View style={s.moneyRow}>
      <FixedText style={[s.moneyRowLabel, muted && s.moneyRowLabelMuted]}>
        {label}
      </FixedText>
      <FixedText
        style={[
          s.moneyRowValue,
          strong && s.moneyRowStrong,
          tone === 'plus' && s.moneyPlus,
          tone === 'minus' && s.moneyMinus,
        ]}
      >
        {value}
      </FixedText>
    </View>
  );
}

/** Tone of a signed amount: plus (> 0), minus (< 0) or none. */
export const toneOf = n => (n > 0 ? 'plus' : n < 0 ? 'minus' : null);

/** Missing / Extra text of a check difference. */
export function differenceText(diff) {
  if (diff === null || diff === undefined || Number.isNaN(diff)) {
    return null;
  }
  if (diff === 0) {
    return 'Matches the bank';
  }
  return diff > 0
    ? `Extra ${moneyP(diff)} (bank has more)`
    : `Missing ${moneyP(Math.abs(diff))} (bank has less)`;
}

/**
 * One account in a salary month — like a block of the owner's monthly
 * total notes. Rows that are 0 are hidden (except the main ones).
 */
export function AccountSummary({ summary, isOpen }) {
  const t = summary.totals;
  const salary = !!summary.account.is_salary;
  const lines = [
    salary
      ? ['Initial balance (with salary)', moneyP(summary.initial)]
      : ['Initial balance', moneyP(summary.opening)],
    salary && t.salary ? ['Salary', moneyP(t.salary)] : null,
    t.income ? ['Income', `+${moneyP(t.income)}`, 'plus'] : null,
    ['Expenses', moneyP(t.expense)],
    t.savings ? ['Savings', moneyP(t.savings)] : null,
    t.withdrawal ? ['Taken from savings', `+${moneyP(t.withdrawal)}`] : null,
    t.lend ? ['Given (will get back)', moneyP(t.lend)] : null,
    t.repayment ? ['Repaid to you', `+${moneyP(t.repayment)}`] : null,
    salary && summary.lendOpen
      ? ['Given this month, not repaid yet', moneyP(summary.lendOpen)]
      : null,
  ].filter(Boolean);
  return (
    <>
      {lines.map(([label, value, tone]) => (
        <Row key={label} label={label} value={value} tone={tone} />
      ))}
      {summary.difference !== null ? (
        <Row
          label={summary.difference >= 0 ? 'Extra (found in bank)' : 'Missing'}
          value={moneyP(summary.difference)}
          tone={toneOf(summary.difference)}
        />
      ) : null}
      {salary ? (
        <Row
          label="Monthly salary remaining"
          value={moneyP(summary.salaryRemaining)}
          tone={toneOf(summary.salaryRemaining)}
          strong
        />
      ) : null}
      <Row
        label={isOpen ? 'Balance now' : salary ? 'Total remaining' : 'Remaining'}
        value={moneyP(summary.closing)}
        strong
      />
    </>
  );
}

/** Selection-only dropdown with a label (like the report options). */
export function Pick({ label, options, value, onChange, placeholder }) {
  const s = useStyles();
  return (
    <View style={s.kitField}>
      {label ? <FixedText style={s.kitFieldLabel}>{label}</FixedText> : null}
      <Combo
        kit
        searchable={false}
        placeholder={
          options.find(o => o.value === value)?.label || placeholder || 'Choose'
        }
        options={options.map(o => ({ key: o.value, label: o.label }))}
        selectedKeys={value === null || value === undefined ? [] : [value]}
        closeOnPick
        onPick={o => onChange(o.key)}
      />
    </View>
  );
}

export { periodDates } from '@/domain/money';
