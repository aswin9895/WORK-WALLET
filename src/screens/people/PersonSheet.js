/**
 * Add / Edit person (redesign v1 — floating form card from the owner's
 * mockup). Fields: Name, Phone number, Fixed rate (₹). Edit mode adds a
 * "Delete person" link (asks first).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CheckBox, FixedText } from '@/components/ui';
import { useStyles } from '@/theme';
import {
  IndianRupee,
  Phone,
  User,
  UserPen,
  UserPlus,
} from 'lucide-react-native';
import { FormSheet, IconField } from '@/components/kit';
import { deletePerson, savePerson } from '@/data';
import { amountText, formatAmountInput, parseNum } from '@/utils/format';
import { confirmDelete, showError } from '@/components/alert';

/** person: null = closed, {} = new, {id, …} = edit. onSaved() after save/delete. */
export default function PersonSheet({ person, onClose, onSaved }) {
  const s = useStyles();
  // keep the last person while the sheet slides out (no title flicker)
  const [current, setCurrent] = useState(null);
  const editing = !!current?.id;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('');
  const [errors, setErrors] = useState({});
  const [myself, setMyself] = useState(false);

  useEffect(() => {
    if (!person) {
      return;
    }
    setCurrent(person);
    setMyself(!!person.is_myself);
    setName(person.name || '');
    setPhone(person.phone || '');
    setRate(
      person.default_rate_amount !== null &&
        person.default_rate_amount !== undefined
        ? amountText(person.default_rate_amount)
        : '',
    );
    setErrors({});
  }, [person]);

  const onSave = async () => {
    const next = {};
    if (!name.trim()) {
      next.name = 'Name is required';
    }
    const amt = rate.trim() === '' ? null : parseNum(rate);
    if (amt !== null && (isNaN(amt) || amt < 0)) {
      next.rate = 'Enter a valid amount, or leave it empty';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      return;
    }
    try {
      await savePerson({
        id: current.id,
        name,
        phone,
        default_rate_amount: amt,
        is_myself: myself,
      });
      onSaved();
    } catch (e) {
      showError(e);
    }
  };

  const onDelete = async () => {
    const ok = await confirmDelete(
      `"${current.name}"`,
      'Their past work stays in your records under the same name.',
    );
    if (!ok) {
      return;
    }
    try {
      await deletePerson(current.id);
      onSaved();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <FormSheet
      visible={!!person}
      title={editing ? 'Edit person' : 'Add person'}
      Icon={editing ? UserPen : UserPlus}
      onClose={onClose}
      onSave={onSave}
      dangerLabel="Delete person"
      onDanger={editing ? onDelete : null}
    >
      <IconField
        label="Name"
        Icon={User}
        value={name}
        onChangeText={t => {
          setName(t);
          setErrors(e => ({ ...e, name: null }));
        }}
        placeholder="Person name"
        error={errors.name}
      />
      <IconField
        label="Phone number"
        Icon={Phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Optional"
      />
      <IconField
        label="Fixed rate (₹)"
        Icon={IndianRupee}
        value={rate}
        onChangeText={t => {
          setRate(formatAmountInput(t));
          setErrors(e => ({ ...e, rate: null }));
        }}
        keyboardType="numeric"
        placeholder="Amount"
        error={errors.rate}
      />
      <Pressable
        style={s.kitRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: myself }}
        onPress={() => setMyself(value => !value)}
      >
        <CheckBox on={myself} />
        <View style={s.kitRowBody}>
          <FixedText style={s.kitRowTitle}>This is me</FixedText>
        </View>
      </Pressable>
    </FormSheet>
  );
}
