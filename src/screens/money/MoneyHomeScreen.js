/**
 * Money tab home: this salary month (salary remaining, spent, saved),
 * fixed monthly items still to add, each account's balance, will get back,
 * savings totals, links to Months and Report; "+ Add" and "Got salary" at
 * the bottom. First use: a card to add the bank accounts.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ListFilter, Plus, Wallet } from 'lucide-react-native';
import {
  mdiAccountArrowRight,
  mdiBank,
  mdiCalendarMonth,
  mdiFileChartOutline,
  mdiPiggyBank,
  mdiRepeat,
} from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { IconRow, KitButton, KitSectionTitle } from '@/components/kit';
import MdiIcon from '@/components/graphics/MdiIcon';
import HomeAppBar from '@/screens/caterings/home/HomeAppBar';
import { ROUTES } from '@/navigation/routes';
import { addFixedItems } from '@/data';
import { showAlert, showError } from '@/components/alert';
import { ENTRY_TYPES, inPeriod, moneyP, moneyDashboard } from '@/domain/money';
import { todayIso } from '@/utils/format';
import useMoneyData from './useMoneyData';
import EntrySheet from './EntrySheet';
import SalarySheet from './SalarySheet';
import { periodDates, Row, toneOf } from './parts';

function Card({ children, onPress }) {
  const s = useStyles();
  if (!onPress) {
    return <View style={s.moneyCard}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.moneyCard, pressed && s.moneyCardPressed]}
    >
      {children}
    </Pressable>
  );
}

function CardHead({ iconPath, title, sub, action, onAction, filter }) {
  const s = useStyles();
  return (
    <View style={s.moneyCardHead}>
      <View style={s.kitTile}>
        <MdiIcon path={iconPath} size={22} color={s.palTileIcon.color} />
      </View>
      <View style={s.moneyCardHeadText}>
        <FixedText style={s.moneyCardTitle}>{title}</FixedText>
        {sub ? <FixedText style={s.moneyCardSub}>{sub}</FixedText> : null}
      </View>
      {filter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter by account"
          onPress={filter}
          hitSlop={8}
          style={({ pressed }) => [s.moneyIconBtn, pressed && s.btnPressed]}
        >
          <ListFilter size={18} strokeWidth={2.2} color={s.palTileIcon.color} />
        </Pressable>
      ) : null}
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <FixedText style={s.moneyLink}>{action}</FixedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MoneyHomeScreen({ navigation }) {
  const s = useStyles();
  const { data, derived, error, reload } = useMoneyData();
  const [entry, setEntry] = useState(null);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [accountFilter, setAccountFilter] = useState(null);

  const addFixed = async items => {
    if (adding || !items.length) {
      return;
    }
    setAdding(true);
    try {
      // dated today if today is in this month, else the month's first day
      const today = todayIso();
      const date = inPeriod(derived.current, today)
        ? today
        : derived.current.start || today;
      await addFixedItems(
        items.map(f => f.id),
        date,
      );
      reload();
    } catch (e) {
      showError(e);
    } finally {
      setAdding(false);
    }
  };

  const header = (
    <HomeAppBar onSettings={() => navigation.navigate(ROUTES.SETTINGS)} />
  );

  if (error || !derived) {
    return (
      <View style={s.homeScreen}>
        {header}
        <FixedText style={error ? s.errorText : s.moneyEmpty}>
          {error || 'Loading…'}
        </FixedText>
      </View>
    );
  }

  if (!derived.accounts.length) {
    return (
      <View style={s.homeScreen}>
        {header}
        <ScrollView contentContainerStyle={s.moneyContentPlain}>
          <Card>
            <CardHead
              iconPath={mdiBank}
              title="Track your bank money"
              sub="Start by adding your bank accounts and their balance today."
            />
            <View style={s.moneyGap} />
            <KitButton
              title="Add accounts"
              Icon={Plus}
              onPress={() => navigation.navigate(ROUTES.MONEY_SETTINGS)}
            />
          </Card>
        </ScrollView>
      </View>
    );
  }

  const {
    current,
    summaries,
    salaryAccount,
    balances,
    owed,
    lendGroups,
    savings,
    fixedDue,
  } = derived;
  const dashboard = moneyDashboard(derived, accountFilter);
  const {
    savings: saved,
    income,
    lend: given,
    repayment: repaid,
    salary,
  } = dashboard.totals;
  const headline = dashboard.isSalary
    ? dashboard.salaryRemaining
    : dashboard.balance;
  const accountName = id => derived.accounts.find(a => a.id === id)?.name;

  return (
    <View style={s.homeScreen}>
      {header}
      <ScrollView contentContainerStyle={s.moneyContent}>
        {/* this salary month */}
        <Card>
          <CardHead
            iconPath={mdiCalendarMonth}
            title={current.label}
            sub={`${periodDates(current)} · ${
              dashboard.value === 'all'
                ? 'All accounts'
                : accountName(dashboard.accountId)
            }`}
            filter={async () => {
              const { value } = await showAlert({
                layout: 'header',
                title: 'Show account',
                options: [
                  { value: 'all', label: 'All' },
                  ...derived.accounts.map(a => ({
                    value: String(a.id),
                    label: a.name,
                  })),
                ],
                selected: [dashboard.value],
                closeOnSelect: true,
                buttons: [{ text: 'Cancel', value: null, style: 'cancel' }],
              });
              if (value) {
                setAccountFilter(value);
              }
            }}
          />
          <Pressable
            onPress={() =>
              navigation.navigate(ROUTES.MONEY_MONTH, {
                key: current.key,
                accountId: dashboard.accountId,
              })
            }
          >
            {!dashboard.isSalary || current.salary ? (
              <>
                <FixedText style={s.moneyBigLabel}>
                  {dashboard.isSalary
                    ? 'Salary remaining this month'
                    : dashboard.value === 'all'
                    ? 'Combined balance now'
                    : 'Balance now'}
                </FixedText>
                <FixedText style={[s.moneyBig, headline < 0 && s.moneyMinus]}>
                  {moneyP(headline)}
                </FixedText>
              </>
            ) : (
              <FixedText style={s.moneyNote}>
                {salaryAccount
                  ? 'Tap "Got salary" when your salary comes. Your month starts from that day.'
                  : 'Mark one account as the salary account in Settings → Money.'}
              </FixedText>
            )}
            <View style={s.moneyRows}>
              {salary ? <Row label="Salary" value={moneyP(salary)} /> : null}
              {income ? (
                <Row label="Income" value={`+${moneyP(income)}`} tone="plus" />
              ) : null}
              <Row label="Spent" value={moneyP(dashboard.spent)} />
              {saved ? <Row label="Saved" value={moneyP(saved)} /> : null}
              {given ? (
                <Row label="Given (will get back)" value={moneyP(given)} />
              ) : null}
              {repaid ? (
                <Row
                  label="Repaid to you"
                  value={`+${moneyP(repaid)}`}
                  tone="plus"
                />
              ) : null}
            </View>
          </Pressable>
        </Card>

        {/* fixed monthly items not added yet */}
        {fixedDue.length ? (
          <Card>
            <CardHead
              iconPath={mdiRepeat}
              title="Fixed items this month"
              sub="Not added yet"
              action={fixedDue.length > 1 ? 'Add all' : null}
              onAction={() => addFixed(fixedDue)}
            />
            <View style={s.moneyRows}>
              {fixedDue.map(f => (
                <View key={f.id} style={s.moneyRow}>
                  <FixedText style={s.moneyRowLabel}>
                    {`${f.name} · ${ENTRY_TYPES[f.type].label} · ${
                      accountName(f.account_id) || ''
                    }`}
                  </FixedText>
                  <FixedText style={s.moneyRowValue}>
                    {moneyP(f.amount)}
                  </FixedText>
                  <Pressable onPress={() => addFixed([f])} hitSlop={8}>
                    <FixedText style={s.moneyEntryAction}>Add</FixedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <KitSectionTitle>Accounts</KitSectionTitle>
        {summaries.map(sum => (
          <Card
            key={sum.account.id}
            onPress={() =>
              navigation.navigate(ROUTES.MONEY_MONTH, {
                key: current.key,
                accountId: sum.account.id,
              })
            }
          >
            <CardHead
              iconPath={mdiBank}
              title={sum.account.name}
              sub={sum.account.is_salary ? 'Salary account' : 'Account'}
            />
            <View style={s.moneyRows}>
              <Row
                label="Balance now"
                value={moneyP(balances[sum.account.id])}
                tone={toneOf(Math.min(0, balances[sum.account.id]))}
                strong
              />
              <Row
                label="Spent this month"
                value={moneyP(sum.totals.expense)}
                muted
              />
            </View>
          </Card>
        ))}

        <KitSectionTitle>Will get back</KitSectionTitle>
        <Card onPress={() => navigation.navigate(ROUTES.MONEY_LENDS)}>
          <CardHead
            iconPath={mdiAccountArrowRight}
            title={moneyP(owed)}
            sub={
              lendGroups.length
                ? `${lendGroups.length} ${
                    lendGroups.length === 1 ? 'person' : 'people'
                  } to give back`
                : 'Nobody owes you now'
            }
          />
          {lendGroups.length ? (
            <View style={s.moneyRows}>
              {lendGroups.slice(0, 4).map(g => (
                <Row key={g.name} label={g.name} value={moneyP(g.remaining)} />
              ))}
            </View>
          ) : null}
        </Card>

        {savings.length ? (
          <>
            <KitSectionTitle>Savings</KitSectionTitle>
            <Card>
              <CardHead
                iconPath={mdiPiggyBank}
                title={moneyP(savings.reduce((t, x) => t + x.total, 0))}
                sub="Total saved"
              />
              <View style={s.moneyRows}>
                {savings.map(x => (
                  <Row
                    key={x.type.id}
                    label={x.type.name}
                    value={moneyP(x.total)}
                  />
                ))}
              </View>
            </Card>
          </>
        ) : null}

        <KitSectionTitle>More</KitSectionTitle>
        <IconRow
          iconPath={mdiCalendarMonth}
          title="Months"
          text="Every salary month with its totals"
          onPress={() => navigation.navigate(ROUTES.MONEY_MONTHS)}
        />
        <IconRow
          iconPath={mdiFileChartOutline}
          title="Report"
          text="Summary and entries, share as PDF or image"
          onPress={() => navigation.navigate(ROUTES.MONEY_REPORT)}
        />
      </ScrollView>

      <View style={s.moneyBottom}>
        <KitButton
          title="Add"
          Icon={Plus}
          style={s.kitBtnFlex}
          onPress={() => setEntry({})}
        />
        {salaryAccount ? (
          <KitButton
            title="Got salary"
            Icon={Wallet}
            variant="tonal"
            style={s.kitBtnFlex}
            onPress={() => setSalaryOpen(true)}
          />
        ) : null}
      </View>

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
        open={salaryOpen}
        data={data}
        onClose={() => setSalaryOpen(false)}
        onSaved={() => {
          setSalaryOpen(false);
          reload();
        }}
      />
    </View>
  );
}
