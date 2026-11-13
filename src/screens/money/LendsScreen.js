/**
 * Will get back: money given to people that they will repay (amma,
 * Sruthi EMI …). Open: grouped by person with what's still to get;
 * "Repaid" records a (part) repayment back into the same account.
 * Done: fully repaid ones. Tap an entry to edit it.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { ScreenHeader, SegmentedTabs } from '@/components/kit';
import { lendStatus, moneyP } from '@/domain/money';
import { dayMonthYear, todayIso } from '@/utils/format';
import useMoneyData from './useMoneyData';
import EntrySheet from './EntrySheet';

function LendCard({ item, accountName, onEdit, onRepay, onEditRepay }) {
  const s = useStyles();
  const { lend, repayments, repaid, remaining } = item;
  return (
    <View style={s.moneyCard}>
      <Pressable onPress={onEdit}>
        <View style={s.moneySectionRow}>
          <FixedText style={s.moneyCardTitle}>{lend.name}</FixedText>
          <FixedText style={s.moneyEntryAmount}>{moneyP(lend.amount)}</FixedText>
        </View>
        <FixedText style={s.moneyCardSub}>
          {[dayMonthYear(lend.date), accountName, lend.note]
            .filter(Boolean)
            .join(' · ')}
        </FixedText>
      </Pressable>
      {repayments.length ? (
        <View style={s.moneyRows}>
          {repayments.map(r => (
            <Pressable key={r.id} onPress={() => onEditRepay(r)}>
              <View style={s.moneyRow}>
                <FixedText style={[s.moneyRowLabel, s.moneyRowLabelMuted]}>
                  {`Repaid ${dayMonthYear(r.date)}${r.note ? ` · ${r.note}` : ''}`}
                </FixedText>
                <FixedText style={[s.moneyRowValue, s.moneyPlus]}>
                  {moneyP(r.amount)}
                </FixedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={[s.moneyRows, s.moneySectionRow]}>
        <FixedText style={s.moneyRowLabel}>
          {remaining > 0
            ? `Still to get ${moneyP(remaining)}`
            : `Fully repaid (${moneyP(repaid)})`}
        </FixedText>
        {remaining > 0 ? (
          <Pressable onPress={onRepay} hitSlop={8}>
            <FixedText style={s.moneyEntryAction}>Repaid</FixedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function LendsScreen({ navigation }) {
  const s = useStyles();
  const { data, derived, error, reload } = useMoneyData();
  const [tab, setTab] = useState('open');
  const [entry, setEntry] = useState(null);

  const groups = useMemo(() => {
    if (!data) {
      return [];
    }
    const by = new Map();
    lendStatus(data.entries)
      .filter(l => (tab === 'open' ? l.remaining > 0 : l.remaining <= 0))
      .reverse() // newest first
      .forEach(l => {
        const name = (l.lend.name || '').trim() || 'Someone';
        const k = name.toLowerCase();
        if (!by.has(k)) {
          by.set(k, { name, items: [], remaining: 0 });
        }
        const g = by.get(k);
        g.items.push(l);
        g.remaining += Math.max(0, l.remaining);
      });
    return [...by.values()];
  }, [data, tab]);

  const accountName = id => derived?.accounts.find(a => a.id === id)?.name;

  return (
    <SafeAreaView style={s.kitScreen} edges={['bottom']}>
      <ScreenHeader title="Will get back" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.moneyContentPlain}>
        <SegmentedTabs
          tabs={[
            { value: 'open', label: 'To get back' },
            { value: 'done', label: 'Repaid' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={s.moneyGap} />
        {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
        {!groups.length ? (
          <FixedText style={s.moneyEmpty}>
            {!data
              ? 'Loading…'
              : tab === 'open'
              ? 'Nobody owes you now. Add one with + Add → Will get back.'
              : 'Nothing fully repaid yet.'}
          </FixedText>
        ) : (
          groups.map(g => (
            <View key={g.name}>
              <View style={s.moneySectionRow}>
                <FixedText style={s.moneyDateHead}>{g.name}</FixedText>
                {tab === 'open' ? (
                  <FixedText style={s.moneyDateHead}>
                    {moneyP(g.remaining)}
                  </FixedText>
                ) : null}
              </View>
              {g.items.map(item => (
                <LendCard
                  key={item.lend.id}
                  item={item}
                  accountName={accountName(item.lend.account_id)}
                  onEdit={() => setEntry(item.lend)}
                  onEditRepay={r => setEntry(r)}
                  onRepay={() =>
                    setEntry({
                      type: 'repayment',
                      lend_id: item.lend.id,
                      account_id: item.lend.account_id,
                      amount: item.remaining,
                      date:
                        todayIso() < item.lend.date
                          ? item.lend.date
                          : todayIso(),
                    })
                  }
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
      <EntrySheet
        entry={entry}
        data={data}
        onClose={() => setEntry(null)}
        onSaved={() => {
          setEntry(null);
          reload();
        }}
      />
    </SafeAreaView>
  );
}
