/** Rounded pill with a coin-stack icon, e.g. "To collect ₹8,300". */
import React from 'react';
import { View } from 'react-native';
import { mdiDatabase } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import MdiIcon from '@/components/graphics/MdiIcon';

export default function MoneyPill({ text, small }) {
  const s = useStyles();
  return (
    <View style={[s.homePill, small && s.homePillSmall]}>
      <MdiIcon
        path={mdiDatabase}
        size={small ? 14 : 18}
        color={s.palPillText.color}
      />
      <FixedText style={[s.homePillText, small && s.homePillTextSmall]}>
        {text}
      </FixedText>
    </View>
  );
}
