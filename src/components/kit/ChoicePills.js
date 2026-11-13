/**
 * Single-choice pills with icons (e.g. System / Light / Dark).
 * Selected pill: orange gradient + glow, white text.
 *
 *   options: [{ value, label, Icon? }]   (Icon = a lucide-react-native icon)
 *   spread  — one row, spaced evenly across the width (space-between)
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';

export default function ChoicePills({ options, value, onChange, spread }) {
  const s = useStyles();
  return (
    <View style={[s.kitChoices, spread && s.kitChoicesSpread]}>
      {options.map(o => {
        const on = o.value === value;
        const inner = (
          <>
            {o.Icon ? (
              <o.Icon
                size={18}
                strokeWidth={2}
                color={on ? s.palOnPrimary.color : s.palChoiceText.color}
              />
            ) : null}
            <FixedText
              style={[
                s.kitChoiceText,
                !o.Icon && s.kitChoiceTextNoIcon,
                on && s.kitChoiceTextOn,
              ]}
            >
              {o.label}
            </FixedText>
          </>
        );
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              s.kitChoiceShadow,
              on && s.kitChoiceShadowOn,
              pressed && s.btnPressed,
            ]}
          >
            {on ? (
              <GradientView
                from={s.palChoiceOnFrom.color}
                to={s.palChoiceOnTo.color}
                style={[
                  s.kitChoice,
                  spread && s.kitChoiceCompact,
                  s.kitChoiceOn,
                ]}
              >
                {inner}
              </GradientView>
            ) : (
              <View style={[s.kitChoice, spread && s.kitChoiceCompact]}>
                {inner}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
