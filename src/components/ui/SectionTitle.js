import React from 'react';
import { Text } from 'react-native';
import { useStyles } from '@/theme';

export default function SectionTitle({ children }) {
  const s = useStyles();
  return <Text style={s.sectionTitle}>{children}</Text>;
}
