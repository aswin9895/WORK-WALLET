/** Bottom wave + compact gradient "+ New" button (with glow), centred. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { mdiPlus } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';
import MdiIcon from '@/components/graphics/MdiIcon';
import { BottomWave } from '@/components/graphics/Waves';

export default function NewCateringButton({ onPress }) {
  const s = useStyles();
  return (
    <View style={s.homeBottom} pointerEvents="box-none">
      <BottomWave color={s.palBottomWave.color} style={s.homeBottomWave} />
      <View
        // the bottom tab bar below already keeps clear of the nav bar
        style={[s.homeCtaWrap, s.homeCtaWrapTabs]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [s.homeCtaShadow, pressed && s.btnPressed]}
        >
          <GradientView
            from={s.palCtaFrom.color}
            to={s.palCtaTo.color}
            direction="vertical"
            style={s.homeCta}
          >
            <View style={s.homeCtaInner}>
              <MdiIcon path={mdiPlus} size={28} color={s.palOnPrimary.color} />
              <FixedText style={s.homeCtaText}>New</FixedText>
            </View>
          </GradientView>
        </Pressable>
      </View>
    </View>
  );
}
