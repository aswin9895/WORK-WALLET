/** Cloche + "Start collecting from more caterings!" under the list. */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import Cloche from '@/components/graphics/Cloche';

export default function HomeHint() {
  const s = useStyles();
  return (
    <View style={s.homeHint}>
      <Cloche size={110} color={s.palHintArt.color} />
      <FixedText style={s.homeHintText}>
        Start collecting from more caterings!
      </FixedText>
    </View>
  );
}
