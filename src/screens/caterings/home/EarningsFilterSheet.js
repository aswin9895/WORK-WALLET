import React, { useState } from 'react';
import { View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { FormSheet, SegmentedTabs, ChoicePills } from '@/components/kit';
import { FixedText } from '@/components/ui';
import DateField from '@/components/form/DateField';
import { useStyles } from '@/theme';

export const EARNINGS_RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'this', label: 'This month' },
  { value: 'last', label: 'Last month' },
  { value: 'custom', label: 'Custom dates' },
];

/** Mounted fresh when opened; Cancel discards edits, Apply validates the range. */
export default function EarningsFilterSheet({ value, onClose, onApply }) {
  const s = useStyles();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const change = patch => {
    setDraft(current => ({ ...current, ...patch }));
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
      title="Earnings filters"
      Icon={SlidersHorizontal}
      onClose={onClose}
      onSave={apply}
      saveLabel="Apply"
    >
      <FixedText style={s.kitFieldLabel}>Show</FixedText>
      <SegmentedTabs
        tabs={[
          { value: 'myself', label: 'Myself' },
          { value: 'all', label: 'All' },
          { value: 'people', label: 'Only people' },
        ]}
        value={draft.scope}
        onChange={scope => change({ scope })}
      />
      <FixedText style={s.kitFieldLabel}>Payment dates</FixedText>
      <ChoicePills
        options={EARNINGS_RANGES}
        value={draft.range}
        onChange={range => change({ range })}
      />
      {draft.range === 'custom' ? (
        <View style={s.homeHeroDates}>
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
    </FormSheet>
  );
}
