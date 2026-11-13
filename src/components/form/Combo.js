/**
 * Dropdown you can also type into.
 *
 * - Tap ▾ (or start typing) to open the list. Typing filters the list.
 * - options: [{key, label, sub?}]
 * - selectedKeys: keys shown with a ✓ (for multi-select)
 * - onPick(option): called when an option is tapped
 * - closeOnPick: close the list after a pick (single-select)
 * - onCreate(text): if given, shows '+ Add "text"' when the typed text does
 *   not match an option exactly
 * - kit: redesigned look (kit input box, Poppins, chevron icon). Default is
 *   the old look, still used by screens not yet redesigned.
 *
 * The list closes on ▾, on pick (closeOnPick), on create, and on a tap
 * anywhere outside it (dropdownDismiss.js) — not on blur, so taps on items
 * are never lost while the keyboard is up.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { registerOpenDropdown } from './dropdownDismiss';

export default function Combo({
  label,
  placeholder,
  value,
  onChangeText,
  options,
  selectedKeys = [],
  onPick,
  closeOnPick = false,
  onCreate,
  style,
  kit = false,
  searchable = true,
}) {
  const s = useStyles();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const dropdownId = useId();

  // while open, a tap outside this dropdown closes it
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    return registerOpenDropdown(dropdownId, wrapRef, () => setOpen(false));
  }, [open, dropdownId]);

  const text = searchable ? (value || '').trim() : '';
  const lower = text.toLowerCase();
  const exact = options.some(o => o.label.toLowerCase() === lower);
  const shown =
    !text || exact
      ? options
      : options.filter(o => o.label.toLowerCase().includes(lower));
  const canCreate = !!onCreate && !!text && !exact;

  const pick = o => {
    onPick(o);
    if (closeOnPick) {
      setOpen(false);
    }
  };

  const create = () => {
    onCreate(text);
    setOpen(false);
  };

  // styles for the two looks
  const st = kit
    ? {
        wrap: style,
        box: [s.kitInput, s.kitInputRow, open && s.kitInputOpen],
        input: s.kitInputField,
        placeholder: s.palPlaceholder.color,
        list: s.kitList,
        item: s.kitListItem,
        itemOn: s.kitListItemOn,
        itemText: s.kitListText,
        itemSub: s.kitListSub,
        create: s.kitListCreate,
        check: s.kitListCreate,
      }
    : {
        wrap: [s.field, style],
        box: [s.comboBox, open && s.comboBoxOpen],
        input: s.comboInput,
        placeholder: s.placeholder.color,
        list: s.comboList,
        item: s.comboItem,
        itemOn: s.comboItemSelected,
        itemText: s.comboItemText,
        itemSub: s.comboItemSub,
        create: s.comboCreate,
        check: s.comboCheck,
      };

  return (
    <View ref={wrapRef} style={st.wrap} collapsable={false}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      {!searchable ? (
        <Pressable
          style={st.box}
          onPress={() => setOpen(o => !o)}
          accessibilityRole="button"
          accessibilityLabel={label || placeholder}
          accessibilityState={{ expanded: open }}
        >
          <Text
            style={[kit ? s.kitInputText : s.text, s.flex]}
            allowFontScaling={!kit}
          >
            {placeholder}
          </Text>
          {open ? (
            <ChevronUp size={20} color={s.palMuted.color} />
          ) : (
            <ChevronDown size={20} color={s.palMuted.color} />
          )}
        </Pressable>
      ) : (
        <View style={st.box}>
          <TextInput
            style={st.input}
            value={value}
            onChangeText={t => {
              onChangeText(t);
              setOpen(true);
            }}
            placeholder={placeholder}
            placeholderTextColor={st.placeholder}
            allowFontScaling={!kit}
            onSubmitEditing={canCreate ? create : undefined}
          />
          <Pressable
            style={kit ? null : s.comboArrow}
            hitSlop={kit ? 12 : 6}
            onPress={() => setOpen(o => !o)}
          >
            {kit ? (
              open ? (
                <ChevronUp size={20} color={s.palMuted.color} />
              ) : (
                <ChevronDown size={20} color={s.palMuted.color} />
              )
            ) : (
              <Text style={s.comboArrowText}>{open ? '▲' : '▼'}</Text>
            )}
          </Pressable>
        </View>
      )}
      {open ? (
        <ScrollView
          style={st.list}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {canCreate ? (
            <Pressable style={st.item} onPress={create}>
              <Text style={st.create} allowFontScaling={!kit}>
                + Add “{text}”
              </Text>
            </Pressable>
          ) : null}
          {shown.map(o => {
            const selected = selectedKeys.includes(o.key);
            return (
              <Pressable
                key={o.key}
                style={({ pressed }) => [
                  st.item,
                  (selected || pressed) && st.itemOn,
                ]}
                onPress={() => pick(o)}
              >
                <View style={s.flex}>
                  <Text style={st.itemText} allowFontScaling={!kit}>
                    {o.label}
                  </Text>
                  {o.sub ? (
                    <Text style={st.itemSub} allowFontScaling={!kit}>
                      {o.sub}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <Text style={st.check} allowFontScaling={!kit}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {!shown.length && !canCreate ? (
            <View style={st.item}>
              <Text style={st.itemSub} allowFontScaling={!kit}>
                No matches
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}
