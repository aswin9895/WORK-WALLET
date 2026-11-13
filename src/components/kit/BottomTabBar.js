/**
 * Bottom tab bar (Work | Money) for the main tabs (owner's mockup): card
 * with rounded top corners, icon + label, the active tab orange with a line
 * under it. Used as the bottom-tabs `tabBar`.
 * Each route's options give `tabBarLabel` and `tabIconPath` (@mdi/js).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import MdiIcon from '@/components/graphics/MdiIcon';

export default function BottomTabBar({ state, descriptors, navigation }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.kitTabbar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.tabBarLabel ?? route.name;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={s.kitTab}
          >
            <MdiIcon
              path={options.tabIconPath}
              size={24}
              color={focused ? s.palTabOn.color : s.palTabOff.color}
            />
            <FixedText style={[s.kitTabLabel, focused && s.kitTabLabelOn]}>
              {label}
            </FixedText>
            <View
              style={[s.kitTabIndicator, focused && s.kitTabIndicatorOn]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
