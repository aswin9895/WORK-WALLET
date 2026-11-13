/** Two (or more) segmented tabs, e.g. "Works (2) | People (3)". */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';

/** tabs: [{ value, label }] */
export default function SegmentedTabs({ tabs, value, onChange }) {
  const s = useStyles();
  return (
    <View style={s.kitSeg}>
      {tabs.map(t => {
        const on = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[s.kitSegItem, on && s.kitSegItemOn]}
          >
            <FixedText style={[s.kitSegText, on && s.kitSegTextOn]}>
              {t.label}
            </FixedText>
          </Pressable>
        );
      })}
    </View>
  );
}
