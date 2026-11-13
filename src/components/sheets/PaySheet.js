/**
 * Record a payment to one person. Amount starts at the full pending amount;
 * change it to pay part (the rest stays pending). Date starts today.
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useStyles } from '@/theme';
import Sheet from '@/components/sheets/Sheet';
import DateField from '@/components/form/DateField';
import { Field } from '@/components/ui';
import {
  amountText,
  formatAmountInput,
  money,
  parseNum,
  todayIso,
} from '@/utils/format';

export default function PaySheet({ visible, target, onClose, onSave }) {
  const s = useStyles();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && target) {
      setAmount(amountText(target.pending));
      setDate(todayIso());
      setError(null);
    }
  }, [visible, target]);

  const submit = () => {
    const amt = parseNum(amount);
    if (isNaN(amt) || amt <= 0) {
      return setError('Enter the amount you paid');
    }
    if (amt > target.pending + 0.001) {
      return setError(`Only ${money(target.pending)} is pending`);
    }
    if (!date) {
      return setError('Pick the date');
    }
    onSave({ amount: amt, paid_at: date });
  };

  return (
    <Sheet
      visible={visible}
      title={target ? `Pay ${target.name}` : 'Pay'}
      onClose={onClose}
      onSave={submit}
      saveLabel="Pay"
    >
      {target ? (
        <View>
          <Text style={s.muted}>
            {target.subtitle ? `${target.subtitle} · ` : ''}Pending{' '}
            {money(target.pending)}
          </Text>
          <View style={s.gap} />
          <Field
            label="Amount paid ₹"
            value={amount}
            onChangeText={t => {
              setAmount(formatAmountInput(t));
              setError(null);
            }}
            keyboardType="numeric"
            placeholder="Amount"
          />
          <DateField label="Paid on" value={date} onChange={setDate} />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          <View style={s.gap} />
        </View>
      ) : null}
    </Sheet>
  );
}
