/**
 * One salary month (route params: key, accountId?): ‹ › to move between
 * months, tabs All / each account, the month's summary per account (like
 * the owner's monthly total notes) and its entries (tap to edit).
 * Closed months: header button to type / change the real bank balances.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpDown, Landmark, ListFilter, Plus } from 'lucide-react-native';
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import {
  KitButton,
  KitSectionTitle,
  ScreenHeader,
  SegmentedTabs,
} from '@/components/kit';
import MdiIcon from '@/components/graphics/MdiIcon';
import {
  DEFAULT_ENTRY_SORT,
  ENTRY_FILTERS,
  ENTRY_SORTS,
  filterEntries,
  inPeriod,
  isDateSort,
  lendStatus,
  periodSummary,
  sortEntries,
} from '@/domain/money';
import { dayMonthYear, todayIso } from '@/utils/format';
import useMoneyData from './useMoneyData';
import EntrySheet from './EntrySheet';
import SalarySheet from './SalarySheet';
import {
  AccountSummary,
  EntryRow,
  entryTitle,
  periodDates,
} from './parts';
import { showAlert } from '@/components/alert';

/** Round icon button (sort / filter); orange while a choice is active. */
function IconButton({ Icon, label, on, onPress }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.moneyIconBtn,
        on && s.moneyIconBtnOn,
        pressed && s.btnPressed,
      ]}
    >
      <Icon
        size={18}
        strokeWidth={2.2}
        color={on ? s.palTileIcon.color : s.palMuted.color}
      />
    </Pressable>
  );
}

export default function MonthScreen({ route, navigation }) {
  const s = useStyles();
  const { data, derived, error, reload } = useMoneyData();
  const [key, setKey] = useState(route.params?.key);
  const [tab, setTab] = useState(
    route.params?.accountId ? String(route.params.accountId) : 'all',
  );
  const [entry, setEntry] = useState(null);
  const [checksOpen, setChecksOpen] = useState(false);
  // statement order (owner's choice: resets to date each time)
  const [sort, setSort] = useState(DEFAULT_ENTRY_SORT);
  const [filter, setFilter] = useState('all');

  const view = useMemo(() => {
    if (!derived) {
      return null;
    }
    const { periods, accounts } = derived;
    let index = periods.findIndex(p => p.key === key);
    if (index < 0) {
      // the month was removed (salary deleted) → show the current one
      index = periods.findIndex(p => p.key === derived.current.key);
    }
    const period = periods[index];
    const summaries = periodSummary(
      period,
      accounts,
      data.entries,
      data.checks,
    );
    const lendsById = Object.fromEntries(
      lendStatus(data.entries).map(l => [l.lend.id, l.lend]),
    );
    const entries = sortEntries(
      filterEntries(
        data.entries.filter(
          e =>
            inPeriod(period, e.date) &&
            (tab === 'all' || String(e.account_id) === tab),
        ),
        filter,
      ),
      sort,
    );
    return {
      index,
      period,
      prev: periods[index - 1],
      next: periods[index + 1],
      summaries:
        tab === 'all'
          ? summaries
          : summaries.filter(x => String(x.account.id) === tab),
      entries,
      lendsById,
    };
  }, [derived, data, key, tab, sort, filter]);

  if (error || !view) {
    return (
      <SafeAreaView style={s.kitScreen} edges={['bottom']}>
        <ScreenHeader title="Month" onBack={() => navigation.goBack()} />
        <FixedText style={error ? s.errorText : s.moneyEmpty}>
          {error || 'Loading…'}
        </FixedText>
      </SafeAreaView>
    );
  }

  const { period, prev, next } = view;
  const isOpen = !period.end;
  const accountName = id => derived.accounts.find(a => a.id === id)?.name;
  // the salary that closed this month holds its real balances
  const closingSalary = next?.salary || null;
  const today = todayIso();
  const newDate = inPeriod(period, today) ? today : period.start || today;

  // date sorts: grouped under date headings; other sorts: one flat list
  // with the date on each row (owner's choice)
  const byDate = isDateSort(sort);
  const groups = [];
  view.entries.forEach(e => {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
    } else {
      groups.push({ date: e.date, items: [e] });
    }
  });

  return (
    <SafeAreaView style={s.kitScreen} edges={['bottom']}>
      <ScreenHeader
        title={period.label}
        onBack={() => navigation.goBack()}
        ActionIcon={closingSalary ? Landmark : undefined}
        actionLabel={closingSalary ? 'Real bank balances' : undefined}
        onAction={closingSalary ? () => setChecksOpen(true) : undefined}
      />
      <ScrollView contentContainerStyle={s.moneyContentPlain}>
        <View style={s.moneyNav}>
          <Pressable
            accessibilityLabel="Previous month"
            disabled={!prev}
            onPress={() => setKey(prev.key)}
            style={[s.moneyNavBtn, !prev && s.moneyNavBtnOff]}
          >
            <MdiIcon path={mdiChevronLeft} size={24} color={s.palMuted.color} />
          </Pressable>
          <View style={s.moneyNavText}>
            <FixedText style={s.moneyNavTitle}>{period.label}</FixedText>
            <FixedText style={s.moneyNavSub}>{periodDates(period)}</FixedText>
          </View>
          <Pressable
            accessibilityLabel="Next month"
            disabled={!next}
            onPress={() => setKey(next.key)}
            style={[s.moneyNavBtn, !next && s.moneyNavBtnOff]}
          >
            <MdiIcon
              path={mdiChevronRight}
              size={24}
              color={s.palMuted.color}
            />
          </Pressable>
        </View>

        {derived.accounts.length > 1 ? (
          <SegmentedTabs
            tabs={[
              { value: 'all', label: 'All' },
              ...derived.accounts.map(a => ({
                value: String(a.id),
                label: a.name,
              })),
            ]}
            value={tab}
            onChange={setTab}
          />
        ) : null}
        <View style={s.moneyGap} />

        {view.summaries.map(sum => (
          <View key={sum.account.id} style={s.moneyCard}>
            <FixedText style={s.moneyCardTitle}>{sum.account.name}</FixedText>
            <View style={s.moneyRows}>
              <AccountSummary summary={sum} isOpen={isOpen} />
            </View>
          </View>
        ))}
        {closingSalary && view.summaries.some(x => x.actual === null) ? (
          <Pressable onPress={() => setChecksOpen(true)} hitSlop={6}>
            <FixedText style={s.moneyLink}>
              Type the real bank balances to see Missing / Extra
            </FixedText>
          </Pressable>
        ) : null}

        <View style={s.moneySectionRow}>
          <KitSectionTitle>{`Entries (${view.entries.length})`}</KitSectionTitle>
          <View style={s.moneyIconBtns}>
            <IconButton
              Icon={ArrowUpDown}
              label="Sort entries"
              on={sort !== DEFAULT_ENTRY_SORT}
              onPress={async () => {
                const { value } = await showAlert({
                  layout: 'header',
                  title: 'Sort',
                  options: ENTRY_SORTS,
                  selected: [sort],
                  closeOnSelect: true,
                  buttons: [{ text: 'Cancel', value: null, style: 'cancel' }],
                });
                if (value) {
                  setSort(value);
                }
              }}
            />
            <IconButton
              Icon={ListFilter}
              label="Filter entries"
              on={filter !== 'all'}
              onPress={async () => {
                const { value } = await showAlert({
                  layout: 'header',
                  title: 'Show',
                  options: ENTRY_FILTERS,
                  selected: [filter],
                  closeOnSelect: true,
                  buttons: [{ text: 'Cancel', value: null, style: 'cancel' }],
                });
                if (value) {
                  setFilter(value);
                }
              }}
            />
          </View>
        </View>
        {sort !== DEFAULT_ENTRY_SORT || filter !== 'all' ? (
          <FixedText style={s.moneyNote}>
            {[
              ENTRY_SORTS.find(o => o.value === sort).label,
              ENTRY_FILTERS.find(o => o.value === filter).label,
            ].join(' · ')}
          </FixedText>
        ) : null}
        {!view.entries.length ? (
          <FixedText style={s.moneyEmpty}>
            {filter === 'all'
              ? 'No entries in this month.'
              : `No ${filter === 'in' ? 'money in' : 'money out'} entries in this month.`}
          </FixedText>
        ) : !byDate ? (
          view.entries.map(e => (
            <EntryRow
              key={e.id}
              entry={e}
              title={entryTitle(e, data.savingsTypes, view.lendsById)}
              accountName={tab === 'all' ? accountName(e.account_id) : null}
              showDate
              onPress={() => setEntry(e)}
            />
          ))
        ) : (
          groups.map(g => (
            <View key={g.date}>
              <FixedText style={s.moneyDateHead}>
                {dayMonthYear(g.date)}
              </FixedText>
              {g.items.map(e => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  title={entryTitle(e, data.savingsTypes, view.lendsById)}
                  accountName={tab === 'all' ? accountName(e.account_id) : null}
                  onPress={() => setEntry(e)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={s.kitBottomBar}>
        <KitButton
          title="Add"
          Icon={Plus}
          style={s.kitBtnFlex}
          onPress={() =>
            setEntry({
              date: newDate,
              account_id: tab === 'all' ? undefined : Number(tab),
            })
          }
        />
      </View>
      <View style={s.moneyGap} />

      <EntrySheet
        entry={entry}
        data={data}
        onClose={() => setEntry(null)}
        onSaved={() => {
          setEntry(null);
          reload();
        }}
      />
      <SalarySheet
        open={checksOpen}
        mode="checks"
        salary={closingSalary}
        data={data}
        onClose={() => setChecksOpen(false)}
        onSaved={() => {
          setChecksOpen(false);
          reload();
        }}
      />
    </SafeAreaView>
  );
}
