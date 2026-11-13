/**
 * Gradient screen header for redesigned screens: back arrow + title, a
 * lighter swoosh at the top-right, and (light theme) a curved cut at the
 * bottom-right. Draws under the status bar (edge-to-edge), so hide the
 * stack header for screens that use it.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { mdiArrowLeft } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';
import MdiIcon from '@/components/graphics/MdiIcon';

/**
 * Right side actions:
 *   ActionIcon (lucide icon) or actionLabel (text) + onAction — one action;
 *   actions: [{ Icon, label, onPress }] — extra icon actions, shown first.
 * Labels are also the accessibility labels.
 */
export default function ScreenHeader({
  title,
  onBack,
  ActionIcon,
  actionLabel,
  onAction,
  actions = [],
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <GradientView
      from={s.palSubheaderFrom.color}
      to={s.palSubheaderTo.color}
      style={s.kitHeader}
    >
      <View style={s.kitHeaderSwoosh} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
        >
          <Path
            d="M30 100 C80 70 120 25 200 0 V100 Z"
            fill={s.palSubheaderSwoosh.color}
            opacity={0.3}
          />
          <Path
            d="M100 100 C140 80 170 62 200 52 V100 Z"
            fill={s.palSubheaderSwoosh.color}
            opacity={0.45}
          />
        </Svg>
      </View>
      <View style={{ height: insets.top }} />
      {/* side insets: landscape camera cutout / nav bar (0 in portrait) */}
      <View
        style={[
          s.kitHeaderRow,
          {
            paddingLeft: (s.kitHeaderRow?.paddingLeft || 0) + insets.left,
            paddingRight: (s.kitHeaderRow?.paddingRight || 0) + insets.right,
          },
        ]}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [s.kitHeaderBack, pressed && s.btnPressed]}
          >
            <MdiIcon
              path={mdiArrowLeft}
              size={26}
              color={s.palSubheaderText.color}
            />
          </Pressable>
        ) : null}
        <FixedText style={s.kitHeaderTitle} numberOfLines={1}>
          {title}
        </FixedText>
        {(() => {
          const all = [
            ...actions,
            ...((ActionIcon || actionLabel) && onAction
              ? [{ Icon: ActionIcon, label: actionLabel, onPress: onAction }]
              : []),
          ].filter(x => x.onPress);
          if (!all.length) {
            return null;
          }
          return (
            <View style={s.kitHeaderActions}>
              {all.map(x => (
                <Pressable
                  key={x.label}
                  onPress={x.onPress}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={x.label}
                  style={({ pressed }) => [
                    s.kitHeaderAction,
                    pressed && s.btnPressed,
                  ]}
                >
                  {x.Icon ? (
                    <x.Icon
                      size={22}
                      strokeWidth={2.2}
                      color={s.palSubheaderText.color}
                    />
                  ) : (
                    <FixedText style={s.kitHeaderActionText}>
                      {x.label}
                    </FixedText>
                  )}
                </Pressable>
              ))}
            </View>
          );
        })()}
      </View>
      <View style={s.kitHeaderCarve} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 26"
          preserveAspectRatio="none"
        >
          <Path
            d="M220 26 C300 26 350 20 400 2 V26 Z"
            fill={s.palSubheaderCarve.color}
          />
        </Svg>
      </View>
    </GradientView>
  );
}
