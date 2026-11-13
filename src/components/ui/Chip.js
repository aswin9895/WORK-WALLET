import React from 'react';
import { Pressable, Text } from 'react-native';
import { useStyles } from '@/theme';

export default function Chip({ label, selected, onPress }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        selected && s.chipSelected,
        pressed && s.btnPressed,
      ]}
    >
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}
