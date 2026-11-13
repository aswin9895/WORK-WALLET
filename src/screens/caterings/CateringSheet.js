/**
 * New / Edit catering as a floating form card (same style as Add person).
 * Fields: Catering name *, Phone, Notes. Edit mode adds "Delete catering"
 * (asks first; deletes all its works too).
 *
 *   catering: null = closed, {} = new, {id, …} = edit
 *   onSaved({ id, created, deleted }) — after save or delete
 */
import React, { useEffect, useState } from 'react';
import { ConciergeBell, FileText, Phone } from 'lucide-react-native';
import { FormSheet, IconField } from '@/components/kit';
import { deleteCatering, saveCatering } from '@/data';
import { confirmDelete, showError } from '@/components/alert';

export default function CateringSheet({ catering, onClose, onSaved }) {
  // keep the last catering while the card slides out (no title flicker)
  const [current, setCurrent] = useState(null);
  const editing = !!current?.id;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!catering) {
      return;
    }
    setCurrent(catering);
    setName(catering.name || '');
    setPhone(catering.phone || '');
    setNotes(catering.notes || '');
    setError(null);
  }, [catering]);

  const onSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      const id = await saveCatering({ id: current.id, name, phone, notes });
      onSaved({ id, created: !editing, deleted: false });
    } catch (e) {
      showError(e);
    }
  };

  const onDelete = async () => {
    const ok = await confirmDelete(
      `"${current.name}"`,
      'All works and extras of this catering will also be deleted.',
    );
    if (!ok) {
      return;
    }
    try {
      await deleteCatering(current.id);
      onSaved({ id: current.id, created: false, deleted: true });
    } catch (e) {
      showError(e);
    }
  };

  return (
    <FormSheet
      visible={!!catering}
      title={editing ? 'Edit catering' : 'New catering'}
      Icon={ConciergeBell}
      onClose={onClose}
      onSave={onSave}
      dangerLabel="Delete catering"
      onDanger={editing ? onDelete : null}
    >
      <IconField
        label="Catering name *"
        Icon={ConciergeBell}
        value={name}
        onChangeText={t => {
          setName(t);
          setError(null);
        }}
        placeholder="Catering name"
        error={error}
      />
      <IconField
        label="Phone"
        Icon={Phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Optional"
      />
      <IconField
        label="Notes"
        Icon={FileText}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
      />
    </FormSheet>
  );
}
