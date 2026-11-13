/**
 * Money amount input (kit look = IconField with ₹ icon): number keyboard,
 * Indian commas added while typing (47,455.54), max 2 decimals.
 * value / onChangeText use the shown text; read it with toPaise / parseNum
 * (commas are ignored there).
 *   allowNegative — keep a leading '-' (bank balances)
 */
import React from 'react';
import { IndianRupee } from 'lucide-react-native';
import { formatAmountInput } from '@/utils/format';
import IconField from './IconField';

export default function AmountField({
  value,
  onChangeText,
  allowNegative = false,
  Icon = IndianRupee,
  ...props
}) {
  return (
    <IconField
      Icon={Icon}
      keyboardType="numeric"
      placeholder="0"
      {...props}
      value={value}
      onChangeText={t => onChangeText(formatAmountInput(t, allowNegative))}
    />
  );
}
