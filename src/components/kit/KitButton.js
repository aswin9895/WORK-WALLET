/**
 * Redesign buttons.
 *   variant 'primary' — orange gradient + glow, white text (Save)
 *   variant 'soft'    — soft background, accent text (Cancel)
 *   variant 'outline' — border only (Cancel in dialogs)
 *   variant 'tonal'   — warm tinted background, accent text (Save in dialogs)
 *   variant 'danger'  — red background, white text (Replace / Delete)
 *   shape 'rounded' (default, 16px) | 'pill' (wide CTA like "+ Add person")
 *   Icon — optional lucide icon before the label
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';

/** Style class names for the non-gradient looks. */
const LOOKS = {
  soft: { box: 'kitBtnSoft', text: 'kitBtnTextSoft', icon: 'palSoftBtnText' },
  outline: {
    box: 'kitBtnOutline',
    text: 'kitBtnTextOutline',
    icon: 'palOutlineBtnText',
  },
  tonal: { box: 'kitBtnTonal', text: 'kitBtnTextTonal', icon: 'palTonalBtnText' },
  danger: { box: 'kitBtnDanger', text: 'kitBtnTextDanger', icon: 'palOnDanger' },
};

export default function KitButton({
  title,
  onPress,
  variant = 'primary',
  shape = 'rounded',
  Icon,
  style,
  disabled,
}) {
  const s = useStyles();
  const pill = shape === 'pill';
  const box = pill ? s.kitCta : s.kitBtn;
  const primary = variant === 'primary';
  const look = LOOKS[variant] || LOOKS.soft;
  const textStyle = pill ? s.kitCtaText : [s.kitBtnText, !primary && s[look.text]];
  const iconColor = primary ? s.palOnPrimary.color : s[look.icon].color;
  const label = (
    <>
      {Icon ? (
        <Icon
          size={pill ? 22 : 18}
          strokeWidth={2.6}
          color={iconColor}
        />
      ) : null}
      <FixedText style={[textStyle, Icon && !pill && s.kitBtnIconGap]}>
        {title}
      </FixedText>
    </>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        primary && (pill ? s.kitCtaShadow : s.kitBtnShadow),
        (pressed || disabled) && s.btnPressed,
        style,
      ]}
    >
      {primary ? (
        <GradientView
          from={s.palCtaFrom.color}
          to={s.palCtaTo.color}
          direction="vertical"
          style={box}
        >
          {label}
        </GradientView>
      ) : (
        <View style={[box, s[look.box]]}>{label}</View>
      )}
    </Pressable>
  );
}
