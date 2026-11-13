/**
 * Settings → Money: bank accounts (one is the salary account), savings
 * types (Post office, Mutual fund …) and fixed monthly items (Bike EMI,
 * Sruthi EMI …). Tap a row to edit; "+ Add …" under each list.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mdiBank, mdiPiggyBank, mdiRepeat, mdiRepeatOff } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { IconRow, KitSectionTitle, ScreenHeader } from '@/components/kit';
import { ENTRY_TYPES, moneyP } from '@/domain/money';
import { dayMonthYear } from '@/utils/format';
import useMoneyData from './useMoneyData';
import {
  AccountSheet,
  FixedItemSheet,
  SavingsTypeSheet,
} from './MoneySettingsSheets';

function AddLink({ label, onPress }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <FixedText style={s.moneyLink}>{label}</FixedText>
    </Pressable>
  );
}

export default function MoneySettingsScreen({ navigation }) {
  const s = useStyles();
  const { data, derived, error, reload } = useMoneyData();
  const [account, setAccount] = useState(null);
  const [savingsType, setSavingsType] = useState(null);
  const [fixed, setFixed] = useState(null);
  const done = () => {
    setAccount(null);
    setSavingsType(null);
    setFixed(null);
    reload();
  };
  const accountName = id => derived?.accounts.find(a => a.id === id)?.name;

  return (
    <SafeAreaView style={s.kitScreen} edges={['bottom']}>
      <ScreenHeader title="Money settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.moneyContentPlain}>
        {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}

        <KitSectionTitle>Bank accounts</KitSectionTitle>
        {derived?.accounts.map(a => (
          <IconRow
            key={a.id}
            iconPath={mdiBank}
            title={a.is_salary ? `${a.name} · Salary account` : a.name}
            text={`Balance now ${moneyP(derived.balances[a.id])} · started ${dayMonthYear(
              a.opening_date,
            )} with ${moneyP(a.opening_balance)}`}
            onPress={() => setAccount(a)}
          />
        ))}
        <AddLink label="+ Add account" onPress={() => setAccount({})} />

        <KitSectionTitle>Savings</KitSectionTitle>
        {derived?.savings.map(x => (
          <IconRow
            key={x.type.id}
            iconPath={mdiPiggyBank}
            title={x.type.name}
            text={`Total ${moneyP(x.total)}${
              x.type.opening_amount
                ? ` · ${moneyP(x.type.opening_amount)} saved before the app`
                : ''
            }`}
            onPress={() => setSavingsType(x.type)}
          />
        ))}
        <AddLink label="+ Add savings" onPress={() => setSavingsType({})} />

        <KitSectionTitle>Fixed monthly items</KitSectionTitle>
        {data?.fixedItems.map(f => (
          <IconRow
            key={f.id}
            iconPath={f.active ? mdiRepeat : mdiRepeatOff}
            title={f.active ? f.name : `${f.name} (ended)`}
            text={[
              moneyP(f.amount),
              ENTRY_TYPES[f.type].label,
              f.type === 'lend' ? f.person : null,
              accountName(f.account_id),
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => setFixed(f)}
          />
        ))}
        {derived?.accounts.length ? (
          <AddLink label="+ Add fixed item" onPress={() => setFixed({})} />
        ) : null}
      </ScrollView>

      <AccountSheet
        account={account}
        onClose={() => setAccount(null)}
        onSaved={done}
      />
      <SavingsTypeSheet
        savingsType={savingsType}
        onClose={() => setSavingsType(null)}
        onSaved={done}
      />
      <FixedItemSheet
        item={fixed}
        data={data}
        onClose={() => setFixed(null)}
        onSaved={done}
      />
    </SafeAreaView>
  );
}
