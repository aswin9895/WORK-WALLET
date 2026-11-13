import React from 'react';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';

/** Upper-case section heading, e.g. "MANAGE". */
export default function KitSectionTitle({ children }) {
  const s = useStyles();
  return (
    <FixedText style={s.kitSection}>{String(children).toUpperCase()}</FixedText>
  );
}
