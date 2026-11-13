/**
 * Money report options (Apply / Cancel on a draft): report type, from / to
 * salary month, accounts, kinds of entries, savings totals.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { FormSheet } from '@/components/kit';
import { FixedText } from '@/components/ui';
import Combo from '@/components/form/Combo';
import { useStyles } from '@/theme';
import { ENTRY_TYPES, ENTRY_TYPE_KEYS } from '@/domain/money';
import { MONEY_REPORT_TYPES } from '@/domain/moneyReport';
import { Pick } from '../parts';
import { Toggle } from '../MoneySettingsSheets';

/** Multi-select dropdown with "Select all". */
function MultiPick({ label, options, values, onChange, noun }) {
  const s = useStyles();
  const all = values.length === options.length;
  return (
    <View style={s.kitField}>
      <FixedText style={s.kitFieldLabel}>{label}</FixedText>
      <Combo
        kit
        searchable={false}
        placeholder={
          all
            ? `All ${noun}`
            : values.length
            ? `${values.length} selected`
            : 'None selected'
        }
        options={[
          { key: '__all', label: 'Select all' },
          ...options.map(o => ({ key: o.value, label: o.label })),
        ]}
        selectedKeys={all ? ['__all', ...values] : values}
        onPick={o => {
          if (o.key === '__all') {
            onChange(all ? [] : options.map(x => x.value));
          } else {
            onChange(
              values.includes(o.key)
                ? values.filter(v => v !== o.key)
                : [...values, o.key],
            );
          }
        }}
      />
    </View>
  );
}

export default function MoneyReportOptionsSheet({
  value,
  periods,
  accounts,
  onApply,
  onClose,
}) {
  const s = useStyles();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const change = patch => {
    setDraft(d => ({ ...d, ...patch }));
    setError(null);
  };
  const monthOptions = [...periods]
    .reverse()
    .map(p => ({ value: p.key, label: p.label }));
  const keys = periods.map(p => p.key);

  const apply = () => {
    if (keys.indexOf(draft.from) > keys.indexOf(draft.to)) {
      setError('"From" must be the same month as "To" or earlier.');
      return;
    }
    if (!draft.accounts.length) {
      setError('Choose at least one account.');
      return;
    }
    if (!draft.types.length) {
      setError('Choose at least one kind of entry.');
      return;
    }
    onApply(draft);
  };

  return (
    <FormSheet
      visible
      title="Report options"
      Icon={SlidersHorizontal}
      onClose={onClose}
      onSave={apply}
      saveLabel="Apply"
    >
      <Pick
        label="Report type"
        options={MONEY_REPORT_TYPES}
        value={draft.type}
        onChange={type => change({ type })}
      />
      <Pick
        label="From month"
        options={monthOptions}
        value={draft.from}
        onChange={from => change({ from })}
      />
      <Pick
        label="To month"
        options={monthOptions}
        value={draft.to}
        onChange={to => change({ to })}
      />
      <MultiPick
        label="Accounts"
        noun="accounts"
        options={accounts.map(a => ({ value: a.id, label: a.name }))}
        values={draft.accounts}
        onChange={v => change({ accounts: v })}
      />
      <MultiPick
        label="Kinds of entries"
        noun="kinds"
        options={ENTRY_TYPE_KEYS.map(k => ({
          value: k,
          label: ENTRY_TYPES[k].label,
        }))}
        values={draft.types}
        onChange={v => change({ types: v })}
      />
      <Toggle
        label="Add savings totals"
        on={draft.savings}
        onChange={savings => change({ savings })}
      />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
    </FormSheet>
  );
}
