import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useStyles } from '@/theme';

/** Labelled text input. Extra props go to the TextInput. */
export default function Field({
  label,
  error,
  multiline,
  style,
  ...inputProps
}) {
  const s = useStyles();
  return (
    <View style={[s.field, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        placeholderTextColor={s.placeholder.color}
        multiline={multiline}
        {...inputProps}
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}
