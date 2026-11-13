/**
 * Labelled text input with a leading icon (redesign kit).
 *   Icon      — a lucide-react-native icon component
 *   variant   — 'plain' (icon only, e.g. person sheet)
 *               | 'tile' (icon in a small tile + divider, e.g. New Catering)
 *   multiline — taller box, icon stays at the top
 * Extra props go to the TextInput. Text keeps the designed size.
 */
import React from 'react';
import { TextInput, View } from 'react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';

export default function IconField({
  label,
  Icon,
  variant = 'plain',
  multiline = false,
  error,
  style,
  ...inputProps
}) {
  const s = useStyles();
  const tile = variant === 'tile';
  const icon = Icon ? (
    <Icon
      size={19}
      strokeWidth={tile ? 2 : 1.8}
      color={tile ? s.palTileIcon.color : s.palFieldIcon.color}
    />
  ) : null;
  return (
    <View style={[s.kitField, style]}>
      {label ? <FixedText style={s.kitFieldLabel}>{label}</FixedText> : null}
      <View
        style={[
          s.kitFieldBox,
          tile && s.kitFieldBoxTile,
          multiline && s.kitFieldBoxMultiline,
          error && s.kitFieldBoxError,
        ]}
      >
        {tile && Icon ? (
          <>
            <View style={s.kitFieldTile}>{icon}</View>
            <View
              style={[s.kitFieldDivider, multiline && s.kitFieldDividerTop]}
            />
          </>
        ) : (
          icon
        )}
        <TextInput
          style={[s.kitFieldInput, multiline && s.kitFieldInputMultiline]}
          placeholderTextColor={s.palPlaceholder.color}
          allowFontScaling={false}
          multiline={multiline}
          {...inputProps}
        />
      </View>
      {error ? <FixedText style={s.kitFieldError}>{error}</FixedText> : null}
    </View>
  );
}
