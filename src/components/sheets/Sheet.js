import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { DropdownDismissArea } from '@/components/form/dropdownDismiss';
import { useStyles } from '@/theme';
import { Button } from '@/components/ui';

/**
 * Bottom-sheet style modal used for quick add/edit forms.
 * Shows Save / Cancel, and Delete when onDelete is given.
 *
 * The sheet is lifted above the on-screen keyboard by keyboard-controller's
 * KeyboardAvoidingView (the app is edge-to-edge, so Android's adjustResize
 * alone does not move content).
 */
export default function Sheet({
  visible,
  title,
  onClose,
  onSave,
  onDelete,
  saveLabel = 'Save',
  children,
}) {
  const s = useStyles();
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
        <KeyboardAvoidingView behavior="padding" style={s.modalBackdrop}>
          <Pressable style={s.flex} onPress={onClose} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {children}
              <View style={s.modalActions}>
                {onDelete ? (
                  <Button title="Delete" variant="danger" onPress={onDelete} />
                ) : null}
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={onClose}
                  style={s.flex}
                />
                <Button title={saveLabel} onPress={onSave} style={s.flex} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </DropdownDismissArea>
    </Modal>
  );
}
