/**
 * Catering detail (redesign v1 — owner's mockup; dark uses the same layout).
 * Summary, Works / People tabs, filters, select mode for bulk collect / pay,
 * and the "+ Work" / "Report" bottom bar. Stack header hidden for this route.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, FlatList, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileChartColumn, Pencil, Plus } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { CheckBox, FixedText } from '@/components/ui';
import { KitButton, ScreenHeader, SegmentedTabs } from '@/components/kit';
import {
  addPayments,
  collectAndPayWorks,
  getCatering,
  listWorks,
  setCollectedMany,
} from '@/data';
import {
  matchesWorkFilter,
  peopleSummary,
  pendingPayments,
  workDues,
} from '@/domain/dues';
import { money, shortDate, todayIso } from '@/utils/format';
import { confirmAction, showError, showMessage } from '@/components/alert';
import { mdiCashMultiple } from '@mdi/js';
import { ROUTES } from '@/navigation/routes';
import CateringSheet from './CateringSheet';
import SummaryCard from './detail/SummaryCard';
import WorkCard from './detail/WorkCard';
import PersonDueCard from './detail/PersonDueCard';

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

export default function CateringScreen({ navigation, route }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const [catering, setCatering] = useState(null);
  const [works, setWorks] = useState([]);
  const [tab, setTab] = useState('works');
  const [filter, setFilter] = useState('pending');
  const [peopleFilter, setPeopleFilter] = useState('pending');
  const [settling, setSettling] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]); // work ids
  const [editCatering, setEditCatering] = useState(null); // edit card

  const load = useCallback(
    () =>
      Promise.all([getCatering(id), listWorks(id)])
        .then(([c, w]) => {
          if (!c) {
            navigation.popToTop();
            return;
          }
          setCatering(c);
          setWorks(
            [...w]
              .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
              .map(x => ({ ...x, dues: workDues(x) })),
          );
          setSelected(sel => sel.filter(wid => w.some(x => x.id === wid)));
        })
        .catch(showError),
    [id, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = works.reduce((sum, w) => sum + w.total, 0);
  const toCollect = works
    .filter(w => !w.collected_at)
    .reduce((sum, w) => sum + w.total, 0);
  const toPay = works.reduce((sum, w) => sum + w.dues.pending, 0);

  const shown = works.filter(w => matchesWorkFilter(w, filter));
  const people = peopleSummary(works);
  const shownPeople = people.filter(p =>
    peopleFilter === 'pending' ? p.pending > 0 : p.pending === 0,
  );

  /* ---- select mode ---- */
  const selectedWorks = shown.filter(w => selected.includes(w.id));
  const toMark = selectedWorks.filter(w => !w.collected_at);
  const toMarkSum = toMark.reduce((sum, w) => sum + w.total, 0);
  const payList = pendingPayments(selectedWorks, todayIso());
  const paySum = payList.reduce((sum, p) => sum + p.amount, 0);
  const allSelected =
    shown.length > 0 && shown.every(w => selected.includes(w.id));

  const startSelect = wid => {
    setSelectMode(true);
    setSelected(wid ? [wid] : []);
  };
  const stopSelect = () => {
    setSelectMode(false);
    setSelected([]);
  };
  const toggle = wid =>
    setSelected(sel =>
      sel.includes(wid) ? sel.filter(x => x !== wid) : [...sel, wid],
    );
  const toggleAll = () => setSelected(allSelected ? [] : shown.map(w => w.id));

  // Android back button leaves select mode instead of the screen
  useEffect(() => {
    if (!selectMode) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectMode(false);
      setSelected([]);
      return true;
    });
    return () => sub.remove();
  }, [selectMode]);

  const changeFilter = f => {
    setFilter(f);
    setSelected([]);
  };
  const changeTab = t => {
    setTab(t);
    stopSelect();
  };

  const markCollected = async () => {
    if (!toMark.length) {
      return showMessage('The selected works are already collected');
    }
    const ok = await confirmAction(
      'Collected?',
      `${toMark.length} work${toMark.length === 1 ? '' : 's'} · ${money(
        toMarkSum,
      )}\nCollected today (${shortDate(todayIso())}).`,
      'Collected',
      { iconPath: mdiCashMultiple },
    );
    if (!ok) {
      return;
    }
    try {
      await setCollectedMany(
        toMark.map(w => w.id),
        todayIso(),
      );
      stopSelect();
      load();
    } catch (e) {
      showError(e);
    }
  };

  const payAll = async () => {
    if (!payList.length) {
      return showMessage('Everyone in the selected works is already paid');
    }
    const byPerson = new Map();
    payList.forEach(p => {
      byPerson.set(
        p.person_name,
        (byPerson.get(p.person_name) || 0) + p.amount,
      );
    });
    const ok = await confirmAction(
      'Pay everyone in these works?',
      `${[...byPerson]
        .map(([name, amt]) => `${name}  ${money(amt)}`)
        .join('\n')}\n\nTotal ${money(paySum)}, paid today.`,
      'Pay',
      { iconPath: mdiCashMultiple },
    );
    if (!ok) {
      return;
    }
    try {
      await addPayments(payList);
      stopSelect();
      load();
    } catch (e) {
      showError(e);
    }
  };

  const collectAndPay = async () => {
    if (settling || (!toMark.length && !payList.length)) {
      return;
    }
    setSettling(true);
    try {
      const date = todayIso();
      const ok = await confirmAction(
        'Collected & paid?',
        `${selectedWorks.length} selected works\nCollected: ${money(
          toMarkSum,
        )}\nPay people: ${money(paySum)}\n\nRecord both today (${shortDate(
          date,
        )})?`,
        'Collected & paid',
        { iconPath: mdiCashMultiple },
      );
      if (!ok) {
        return;
      }
      await collectAndPayWorks(
        selectedWorks.map(w => w.id),
        date,
      );
      stopSelect();
      await load();
    } catch (e) {
      showError(e);
    } finally {
      setSettling(false);
    }
  };

  const listHeader = (
    <View>
      <SummaryCard
        total={total}
        collected={total - toCollect}
        toCollect={toCollect}
        toPay={toPay}
      />
      <SegmentedTabs
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: 'works', label: `Works (${works.length})` },
          { value: 'people', label: `People (${people.length})` },
        ]}
      />
      {tab === 'works' ? (
        <>
          <SegmentedTabs
            tabs={FILTERS}
            value={filter}
            onChange={changeFilter}
          />
          {shown.length ? (
            <View style={s.catSelectRow}>
              {selectMode ? (
                <Pressable
                  style={s.catSelectAll}
                  onPress={toggleAll}
                  hitSlop={6}
                >
                  <View style={s.catCheck}>
                    <CheckBox on={allSelected} />
                  </View>
                  <FixedText style={s.catSelectAllText}>
                    Select all ({selected.length}/{shown.length})
                  </FixedText>
                </Pressable>
              ) : (
                <FixedText style={s.catSelectHint}>
                  Long-press a work to select
                </FixedText>
              )}
              <Pressable
                onPress={selectMode ? stopSelect : () => startSelect(null)}
                hitSlop={10}
              >
                <FixedText style={s.catSelectAction}>
                  {selectMode ? 'Done' : 'Select'}
                </FixedText>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <SegmentedTabs
          tabs={FILTERS}
          value={peopleFilter}
          onChange={setPeopleFilter}
        />
      )}
    </View>
  );

  return (
    <View style={s.kitScreen}>
      <ScreenHeader
        title={catering?.name || ''}
        onBack={() => navigation.goBack()}
        ActionIcon={Pencil}
        actionLabel="Edit catering"
        onAction={() => catering && setEditCatering(catering)}
      />
      {tab === 'works' ? (
        <FlatList
          key="works"
          data={shown}
          extraData={[selected, selectMode]}
          keyExtractor={w => String(w.id)}
          contentContainerStyle={s.catList}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<FixedText style={s.catEmpty}>No work</FixedText>}
          renderItem={({ item }) => (
            <WorkCard
              work={item}
              selectMode={selectMode}
              selected={selected.includes(item.id)}
              onPress={() =>
                selectMode
                  ? toggle(item.id)
                  : navigation.navigate(ROUTES.WORK_DETAIL, {
                      cateringId: id,
                      id: item.id,
                    })
              }
              onLongPress={() =>
                selectMode ? toggle(item.id) : startSelect(item.id)
              }
            />
          )}
        />
      ) : (
        <FlatList
          key="people"
          data={shownPeople}
          keyExtractor={p => p.key}
          contentContainerStyle={s.catList}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <FixedText style={s.catEmpty}>
              {peopleFilter === 'pending'
                ? 'No people with pending payments'
                : 'No fully paid people'}
            </FixedText>
          }
          renderItem={({ item }) => (
            <PersonDueCard
              person={item}
              onPress={() =>
                navigation.navigate(ROUTES.PERSON_PAY, {
                  cateringId: id,
                  personKey: item.key,
                  name: item.name,
                })
              }
            />
          )}
        />
      )}
      {catering ? (
        <View style={[s.kitBottomBar, { paddingBottom: insets.bottom + 10 }]}>
          {selectMode ? (
            <View style={s.catBulkActions}>
              <View style={s.catBulkRow}>
                <KitButton
                  title={`Collected (${toMark.length})`}
                  variant="soft"
                  style={s.kitBtnFlex}
                  disabled={settling || !toMark.length}
                  onPress={markCollected}
                />
                <KitButton
                  title={`Pay ${money(paySum)}`}
                  style={s.kitBtnFlex}
                  disabled={settling || !payList.length}
                  onPress={payAll}
                />
              </View>
              <KitButton
                title="Collected & paid"
                disabled={settling || (!toMark.length && !payList.length)}
                onPress={collectAndPay}
              />
            </View>
          ) : (
            <>
              <KitButton
                title="Work"
                Icon={Plus}
                style={s.kitBtnFlex}
                onPress={() =>
                  navigation.navigate(ROUTES.WORK_FORM, { cateringId: id })
                }
              />
              <KitButton
                title="Report"
                Icon={FileChartColumn}
                variant="soft"
                style={s.kitBtnFlex}
                onPress={() =>
                  navigation.navigate(ROUTES.REPORT, { cateringId: id })
                }
              />
            </>
          )}
        </View>
      ) : null}
      <CateringSheet
        catering={editCatering}
        onClose={() => setEditCatering(null)}
        onSaved={({ deleted }) => {
          setEditCatering(null);
          if (deleted) {
            navigation.popToTop();
          } else {
            load();
          }
        }}
      />
    </View>
  );
}
