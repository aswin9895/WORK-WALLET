import React, { useState } from 'react';
import { View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { FormSheet } from '@/components/kit';
import { FixedText } from '@/components/ui';
import Combo from '@/components/form/Combo';
import DateField from '@/components/form/DateField';
import { useStyles } from '@/theme';

export const REPORT_TYPES = [
  { value: 'summary', label: 'Payment summary' },
  { value: 'details', label: 'Work details' },
  { value: 'both', label: 'Both' },
];
export const REPORT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'to_collect', label: 'To collect' },
  { value: 'to_pay', label: 'To pay' },
];
export const REPORT_RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'this', label: 'This month' },
  { value: 'last', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
];
/** Report screen opens with these (owner's choice): Both, To collect, all time, all fields. */
export const DEFAULT_REPORT_OPTIONS = Object.freeze({
  type: 'both',
  layout: 'table',
  status: 'to_collect',
  range: 'all',
  fields: Object.freeze({
    date: true,
    place: true,
    session: true,
    people: true,
    amounts: true,
    extras: true,
    total: true,
  }),
});

const FIELDS = [
  ['date', 'Date'],
  ['place', 'Place'],
  ['session', 'Session'],
  ['people', 'People & Boys'],
  ['amounts', 'Individual rates & amounts'],
  ['extras', 'Extras & recipients'],
  ['total', 'Work totals & grand total'],
];

function Dropdown({ label, options, value, onChange }) {
  const s = useStyles();
  return (
    <View style={s.kitField}>
      <FixedText style={s.kitFieldLabel}>{label}</FixedText>
      <Combo
        kit
        searchable={false}
        placeholder={options.find(o => o.value === value)?.label}
        options={options.map(o => ({ key: o.value, label: o.label }))}
        selectedKeys={[value]}
        closeOnPick
        onPick={o => {
          onChange(o.key);
        }}
      />
    </View>
  );
}

export default function ReportOptionsSheet({ value, onApply, onClose }) {
  const s = useStyles();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const selectedFields = FIELDS.filter(([key]) => draft.fields[key]).map(
    ([key]) => key,
  );
  const change = patch => {
    setDraft(d => ({ ...d, ...patch }));
    setError(null);
  };
  const apply = () => {
    if (
      draft.range === 'custom' &&
      (!draft.from || !draft.to || draft.from > draft.to)
    ) {
      setError('Choose a From date before or equal to the To date.');
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
      <Dropdown
        label="Report type"
        options={REPORT_TYPES}
        value={draft.type}
        onChange={type => change({ type })}
      />
      <Dropdown
        label="View"
        options={[
          { value: 'table', label: 'Table view' },
          { value: 'list', label: 'List view' },
        ]}
        value={draft.layout || 'table'}
        onChange={layout => change({ layout })}
      />
      <Dropdown
        label="Work status"
        options={REPORT_STATUSES}
        value={draft.status}
        onChange={status => change({ status })}
      />
      <Dropdown
        label="Work dates"
        options={REPORT_RANGES}
        value={draft.range}
        onChange={range => change({ range })}
      />
      {draft.range === 'custom' ? (
        <View style={s.reportDateFields}>
          <View style={s.flex}>
            <FixedText style={s.kitFieldLabel}>From</FixedText>
            <DateField
              kit
              value={draft.from}
              onChange={from => change({ from })}
            />
          </View>
          <View style={s.flex}>
            <FixedText style={s.kitFieldLabel}>To</FixedText>
            <DateField kit value={draft.to} onChange={to => change({ to })} />
          </View>
        </View>
      ) : null}
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
      <FixedText style={s.kitFieldLabel}>Show in report</FixedText>
      <Combo
        kit
        searchable={false}
        placeholder={
          selectedFields.length === FIELDS.length
            ? 'All fields selected'
            : `${selectedFields.length} fields selected`
        }
        options={[
          { key: '__all', label: 'Select all' },
          ...FIELDS.map(([key, label]) => ({ key, label })),
        ]}
        selectedKeys={
          selectedFields.length === FIELDS.length
            ? ['__all', ...selectedFields]
            : selectedFields
        }
        onPick={o => {
          change({
            fields:
              o.key === '__all'
                ? Object.fromEntries(
                    FIELDS.map(([key]) => [
                      key,
                      selectedFields.length !== FIELDS.length,
                    ]),
                  )
                : { ...draft.fields, [o.key]: !draft.fields[o.key] },
          });
        }}
      />
    </FormSheet>
  );
}
