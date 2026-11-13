import React from 'react';
import { Pressable, View } from 'react-native';
import { useStyles } from '@/theme';

/** Surface block. Becomes pressable when onPress/onLongPress is given. */
export default function Card({ children, onPress, onLongPress, style }) {
  const s = useStyles();
  if (!onPress && !onLongPress) {
    return <View style={[s.card, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.card, pressed && s.cardPressed, style]}
    >
      {children}
    </Pressable>
  );
}
