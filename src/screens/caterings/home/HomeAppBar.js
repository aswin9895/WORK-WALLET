/**
 * App bar of both tabs (Work and Money): app logo + "Work & Wallet" + a
 * round gear button (Settings), curved edge. The logo is the owner's in-app
 * icon (src/assets/images/app-logo.png, made from assets/branding/InApp.png).
 * `title` / `iconPath` (an @mdi icon instead of the logo) are optional.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mdiCog } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';
import MdiIcon from '@/components/graphics/MdiIcon';
import { AppBarWave } from '@/components/graphics/Waves';

const APP_LOGO = require('@/assets/images/app-logo.png');

export default function HomeAppBar({
  onSettings,
  title = 'Work & Wallet',
  iconPath, // none → the app logo
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View>
      <GradientView
        from={s.palAppbarFrom.color}
        to={s.palAppbarTo.color}
        style={s.homeAppbar}
      >
        {/* status bar space (the app draws edge-to-edge) */}
        <View style={{ height: insets.top }} />
        <View style={s.homeAppbarRow}>
          <View style={s.homeBrand}>
            {iconPath ? (
              <MdiIcon
                path={iconPath}
                size={34}
                color={s.palAppbarIcon.color}
              />
            ) : (
              <Image
                source={APP_LOGO}
                style={s.homeLogo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            )}
            <FixedText style={[s.homeTitle, !iconPath && s.homeTitleLogo]}>
              {title}
            </FixedText>
          </View>
          <Pressable
            onPress={onSettings}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [s.homeSettings, pressed && s.btnPressed]}
          >
            <MdiIcon path={mdiCog} size={22} color={s.palAppbarText.color} />
          </Pressable>
        </View>
      </GradientView>
      <AppBarWave
        from={s.palAppbarFrom.color}
        to={s.palAppbarTo.color}
        line={s.palAppbarWave.color}
        style={s.homeAppbarWave}
      />
    </View>
  );
}
