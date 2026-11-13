import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useStyles } from '@/theme';
import { CalendarDays } from 'lucide-react-native';
import { dayMonthYear, fromIso, shortDate, toIso } from '@/utils/format';

/**
 * Tap-to-pick date. value / onChange use 'YYYY-MM-DD' strings.
 * If `clearable`, a "Clear" link sets the value to null.
 * `kit`: redesigned look — just the input box (no label / field wrapper),
 *        date shown as 11-Nov-26 with a calendar icon on the right.
 */
export default function DateField({
  label,
  value,
  onChange,
  clearable,
  placeholder,
  kit = false,
  style,
}) {
  const s = useStyles();
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromIso(value),
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(toIso(date));
          }
        },
      });
    } else {
      setIosOpen(o => !o);
    }
  };

  if (kit) {
    return (
      <View style={style}>
        <Pressable onPress={open} style={[s.kitInput, s.kitInputRow]}>
          <Text
            allowFontScaling={false}
            style={[s.kitInputText, s.flex, !value && s.kitInputPlaceholder]}
          >
            {value ? dayMonthYear(value) : placeholder || 'Pick a date'}
          </Text>
          <CalendarDays size={19} strokeWidth={1.9} color={s.palMuted.color} />
        </Pressable>
        {Platform.OS === 'ios' && iosOpen ? (
          <DateTimePicker
            value={fromIso(value)}
            mode="date"
            display="inline"
            onChange={(event, date) => {
              if (date) {
                onChange(toIso(date));
              }
              setIosOpen(false);
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.row}>
        <Pressable onPress={open} style={[s.input, s.flex]}>
          <Text style={value ? s.text : s.placeholder}>
            {value ? shortDate(value) : placeholder || 'Pick a date'}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            style={s.clearLink}
          >
            <Text style={s.btnTextGhost}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={fromIso(value)}
          mode="date"
          display="inline"
          onChange={(event, date) => {
            if (date) {
              onChange(toIso(date));
            }
            setIosOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
