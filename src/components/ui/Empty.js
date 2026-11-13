import React from 'react';
import { Text, View } from 'react-native';
import { useStyles } from '@/theme';

export default function Empty({ text }) {
  const s = useStyles();
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}
