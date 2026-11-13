/** Icon tile + big title + subtitle, shown under a ScreenHeader. */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import MdiIcon from '@/components/graphics/MdiIcon';

export default function IntroBlock({ iconPath, title, subtitle }) {
  const s = useStyles();
  return (
    <View style={s.kitIntro}>
      <View style={s.kitTile}>
        <MdiIcon path={iconPath} size={24} color={s.palTileIcon.color} />
      </View>
      <View style={s.kitIntroBody}>
        <FixedText style={s.kitIntroTitle}>{title}</FixedText>
        {subtitle ? (
          <FixedText style={s.kitIntroSubtitle}>{subtitle}</FixedText>
        ) : null}
      </View>
    </View>
  );
}
