/**
 * One person's money in one catering: every work they are owed for, what is
 * paid and pending. Tick works and "Pay selected" (pays their full pending,
 * dated today), or tap Pay on a work to pay part of it.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import { Button, Card, Empty } from '@/components/ui';
import PaySheet from '@/components/sheets/PaySheet';
import { addPayment, addPayments, listWorks } from '@/data';
import { personDues } from '@/domain/dues';
import { money, shortDate, todayIso } from '@/utils/format';
import { confirmAction, showError } from '@/components/alert';
import { mdiCashMultiple } from '@mdi/js';

export default function PersonPayScreen({ navigation, route }) {
  const s = useStyles();
  const { cateringId, personKey, name } = route.params;
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]); // work ids
  const [payTarget, setPayTarget] = useState(null);

  const load = useCallback(
    () =>
      listWorks(cateringId)
        .then(works => {
          const d = personDues(works, personKey);
          setData(d);
          // keep only selections that are still pending
          setSelected(sel =>
            sel.filter(wid =>
              d.works.some(r => r.work.id === wid && r.pending > 0),
            ),
          );
        })
        .catch(showError),
    [cateringId, personKey],
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: name });
      load();
    }, [load, navigation, name]),
  );

  if (!data) {
    return <SafeAreaView style={s.screen} edges={['bottom']} />;
  }

  const pendingRows = data.works.filter(r => r.pending > 0);
  const selectedRows = pendingRows.filter(r => selected.includes(r.work.id));
  const selectedSum = selectedRows.reduce((t, r) => t + r.pending, 0);
  const allSelected =
    pendingRows.length > 0 && selectedRows.length === pendingRows.length;

  const toggle = wid =>
    setSelected(sel =>
      sel.includes(wid) ? sel.filter(x => x !== wid) : [...sel, wid],
    );

  const toggleAll = () =>
    setSelected(allSelected ? [] : pendingRows.map(r => r.work.id));

  const paySelected = async () => {
    const ok = await confirmAction(
      `Pay ${name}?`,
      `${selectedRows
        .map(r => `${shortDate(r.work.date)}  ${money(r.pending)}`)
        .join('\n')}\n\nTotal ${money(selectedSum)}, paid today.`,
      'Pay',
      { iconPath: mdiCashMultiple },
    );
    if (!ok) {
      return;
    }
    try {
      await addPayments(
        selectedRows.map(r => ({
          work_id: r.work.id,
          person_id: r.person_id,
          person_name: r.name,
          amount: r.pending,
          paid_at: todayIso(),
        })),
      );
      setSelected([]);
      load();
    } catch (e) {
      showError(e);
    }
  };

  const onPay = async ({ amount, paid_at }) => {
    try {
      await addPayment({
        work_id: payTarget.work_id,
        person_id: payTarget.person_id,
        person_name: payTarget.name,
        amount,
        paid_at,
      });
      setPayTarget(null);
      load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <FlatList
        data={data.works}
        keyExtractor={r => String(r.work.id)}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View>
            <Card>
              <Text style={s.muted}>Pending</Text>
              <Text style={s.amountBig}>{money(data.pending)}</Text>
              <Text style={s.muted}>
                Owed {money(data.due)} · paid {money(data.paid)}
              </Text>
            </Card>
            {pendingRows.length > 1 ? (
              <Pressable style={[s.row, s.field]} onPress={toggleAll}>
                <View style={[s.checkBox, allSelected && s.checkBoxOn]}>
                  {allSelected ? <Text style={s.checkMark}>✓</Text> : null}
                </View>
                <Text style={s.text}>Select all pending</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Empty text="Nothing owed" />}
        renderItem={({ item: r }) => {
          const on = selected.includes(r.work.id);
          return (
            <Card onPress={r.pending > 0 ? () => toggle(r.work.id) : undefined}>
              <View style={s.row}>
                {r.pending > 0 ? (
                  <View style={[s.checkBox, on && s.checkBoxOn]}>
                    {on ? <Text style={s.checkMark}>✓</Text> : null}
                  </View>
                ) : null}
                <View style={s.flex}>
                  <Text style={s.subtitle}>
                    {shortDate(r.work.date)}
                    {r.work.session ? ` · ${r.work.session}` : ''}
                  </Text>
                  <Text style={s.muted}>Owed {money(r.due)}</Text>
                  {r.pending > 0 ? (
                    <Text style={s.textPending}>
                      Pending {money(r.pending)}
                      {r.paid > 0 ? ` · paid ${money(r.paid)}` : ''}
                    </Text>
                  ) : (
                    <Text style={s.textPaid}>Paid {money(r.paid)}</Text>
                  )}
                </View>
                {r.pending > 0 ? (
                  <Button
                    title="Pay"
                    small
                    variant="secondary"
                    onPress={() =>
                      setPayTarget({
                        work_id: r.work.id,
                        name: r.name,
                        person_id: r.person_id,
                        pending: r.pending,
                        subtitle: shortDate(r.work.date),
                      })
                    }
                  />
                ) : null}
              </View>
            </Card>
          );
        }}
      />
      {selectedRows.length ? (
        <View style={s.bottomBar}>
          <Button
            title={`Pay selected (${selectedRows.length}) ${money(
              selectedSum,
            )}`}
            style={s.flex}
            onPress={paySelected}
          />
        </View>
      ) : null}

      <PaySheet
        visible={!!payTarget}
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onSave={onPay}
      />
    </SafeAreaView>
  );
}
