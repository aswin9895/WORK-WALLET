/**
 * Dims the screen with a small "working…" card while a long action runs.
 *   label — text to show; nothing is drawn when it is empty / null
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';

export default function BusyOverlay({ label }) {
  const s = useStyles();
  if (!label) {
    return null;
  }
  return (
    <View style={s.kitBusy}>
      <View style={s.kitBusyCard}>
        <ActivityIndicator color={s.palTileIcon.color} />
        <FixedText style={s.kitBusyText}>{label}</FixedText>
      </View>
    </View>
  );
}
