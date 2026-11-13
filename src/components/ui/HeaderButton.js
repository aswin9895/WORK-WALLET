import React from 'react';
import { Pressable, Text } from 'react-native';
import { useStyles } from '@/theme';

/** Text button for navigation headers. */
export default function HeaderButton({ title, onPress }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={s.headerBtnText}>{title}</Text>
    </Pressable>
  );
}
