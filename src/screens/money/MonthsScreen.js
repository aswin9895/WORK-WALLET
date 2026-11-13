/**
 * Every salary month, newest first — like the owner's "MONTHLY EXPENSE
 * TOTAL" notes: dates, salary, spent, monthly salary remaining and the
 * salary account's total remaining. Tap a month to open it.
 */
import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { ScreenHeader } from '@/components/kit';
import { ROUTES } from '@/navigation/routes';
import { moneyP, periodSummary } from '@/domain/money';
import useMoneyData from './useMoneyData';
import { periodDates, Row, toneOf } from './parts';

export default function MonthsScreen({ navigation }) {
  const s = useStyles();
  const { data, derived, error } = useMoneyData();

  const months = derived
    ? [...derived.periods].reverse().map(p => {
        const sums = periodSummary(
          p,
          derived.accounts,
          data.entries,
          data.checks,
        );
        return {
          period: p,
          salary: sums.find(x => x.account.is_salary) || null,
          spent: sums.reduce((t, x) => t + x.totals.expense, 0),
          missing: sums.reduce((t, x) => t + (x.difference || 0), 0),
          hasCheck: sums.some(x => x.difference !== null),
        };
      })
    : [];

  return (
    <SafeAreaView style={s.kitScreen} edges={['bottom']}>
      <ScreenHeader title="Months" onBack={() => navigation.goBack()} />
      {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
      <FlatList
        data={months}
        keyExtractor={m => m.period.key}
        contentContainerStyle={s.moneyContentPlain}
        ListEmptyComponent={
          <FixedText style={s.moneyEmpty}>
            {derived ? 'No months yet.' : 'Loading…'}
          </FixedText>
        }
        renderItem={({ item: m }) => (
          <Pressable
            onPress={() =>
              navigation.navigate(ROUTES.MONEY_MONTH, { key: m.period.key })
            }
            style={({ pressed }) => [
              s.moneyCard,
              pressed && s.moneyCardPressed,
            ]}
          >
            <View style={s.moneySectionRow}>
              <FixedText style={s.moneyCardTitle}>{m.period.label}</FixedText>
              {!m.period.end ? (
                <FixedText style={s.moneyLink}>Now</FixedText>
              ) : null}
            </View>
            <FixedText style={s.moneyCardSub}>{periodDates(m.period)}</FixedText>
            <View style={s.moneyRows}>
              {m.period.salary ? (
                <Row label="Salary" value={moneyP(m.period.salary.amount)} />
              ) : null}
              <Row label="Spent (all accounts)" value={moneyP(m.spent)} />
              {m.salary && m.period.salary ? (
                <Row
                  label="Monthly salary remaining"
                  value={moneyP(m.salary.salaryRemaining)}
                  tone={toneOf(m.salary.salaryRemaining)}
                  strong
                />
              ) : null}
              {m.salary ? (
                <Row
                  label={m.period.end ? 'Total remaining' : 'Balance now'}
                  value={moneyP(m.salary.closing)}
                />
              ) : null}
              {m.hasCheck && m.missing ? (
                <Row
                  label={m.missing > 0 ? 'Extra' : 'Missing'}
                  value={moneyP(m.missing)}
                  tone={toneOf(m.missing)}
                />
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
