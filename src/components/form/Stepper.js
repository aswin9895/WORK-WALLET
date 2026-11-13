import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStyles } from '@/theme';

/** − value + control for whole numbers (min 0 by default). */
export default function Stepper({ value, onChange, min = 0 }) {
  const s = useStyles();
  return (
    <View style={s.stepper}>
      <Pressable
        style={({ pressed }) => [s.stepperBtn, pressed && s.btnPressed]}
        hitSlop={6}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Text style={s.stepperBtnText}>−</Text>
      </Pressable>
      <Text style={s.stepperValue}>{value}</Text>
      <Pressable
        style={({ pressed }) => [s.stepperBtn, pressed && s.btnPressed]}
        hitSlop={6}
        onPress={() => onChange(value + 1)}
      >
        <Text style={s.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
}
