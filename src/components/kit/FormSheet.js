/**
 * Floating rounded form card that slides up from the bottom (redesign kit).
 * Handle bar, centred icon tile + title, your fields (children), then
 * Cancel / Save, and an optional red link (e.g. "Delete person").
 * Lifts above the keyboard (keyboard-controller, the app is edge-to-edge).
 */
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { DropdownDismissArea } from '@/components/form/dropdownDismiss';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import KitButton from './KitButton';

export default function FormSheet({
  visible,
  title,
  Icon,
  onClose,
  onSave,
  saveLabel = 'Save',
  dangerLabel,
  onDanger,
  children,
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modal = own window: needs its own outside-tap area for dropdowns */}
      <DropdownDismissArea style={s.flex}>
        <KeyboardAvoidingView behavior="padding" style={s.kitSheetBackdrop}>
          <Pressable style={s.flex} onPress={onClose} />
          <View style={[s.kitSheet, { marginBottom: insets.bottom + 16 }]}>
            <View style={s.kitSheetHandle} />
            <View style={s.kitSheetHead}>
              {Icon ? (
                <View style={s.kitTile}>
                  <Icon
                    size={24}
                    strokeWidth={1.9}
                    color={s.palTileIcon.color}
                  />
                </View>
              ) : null}
              <FixedText style={s.kitSheetTitle}>{title}</FixedText>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {children}
              <View style={s.kitBtnRow}>
                <KitButton
                  title="Cancel"
                  variant="soft"
                  onPress={onClose}
                  style={s.kitBtnFlex}
                />
                <KitButton
                  title={saveLabel}
                  onPress={onSave}
                  style={s.kitBtnFlex}
                />
              </View>
              {onDanger ? (
                <Pressable onPress={onDanger} hitSlop={8}>
                  <FixedText style={s.kitLinkDanger}>{dangerLabel}</FixedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </DropdownDismissArea>
    </Modal>
  );
}
