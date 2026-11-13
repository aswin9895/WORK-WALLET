import React from 'react';
import { Pressable, Text } from 'react-native';
import { useStyles } from '@/theme';

/** variant: 'primary' | 'secondary' | 'danger' | 'ghost' */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
}) {
  const s = useStyles();
  const box = {
    secondary: s.btnSecondary,
    danger: s.btnDanger,
    ghost: s.btnGhost,
  }[variant];
  const text = {
    secondary: s.btnTextSecondary,
    danger: s.btnTextDanger,
    ghost: s.btnTextGhost,
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        box,
        pressed && s.btnPressed,
        disabled && s.btnDisabled,
        style,
      ]}
    >
      <Text style={[s.btnText, text, small && s.btnTextSmall]}>{title}</Text>
    </Pressable>
  );
}
