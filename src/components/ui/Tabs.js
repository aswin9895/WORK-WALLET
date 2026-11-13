import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStyles } from '@/theme';

/** Segmented tabs. tabs: [{ value, label }] */
export default function Tabs({ tabs, value, onChange }) {
  const s = useStyles();
  return (
    <View style={s.tabs}>
      {tabs.map(t => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[s.tab, active && s.tabActive]}
          >
            <Text style={[s.tabText, active && s.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
