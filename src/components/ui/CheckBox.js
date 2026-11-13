import React from 'react';
import { Text, View } from 'react-native';
import { useStyles } from '@/theme';

export default function CheckBox({ on }) {
  const s = useStyles();
  return (
    <View style={[s.checkBox, on && s.checkBoxOn]}>
      {on ? <Text style={s.checkMark}>✓</Text> : null}
    </View>
  );
}
