/**
 * One work: details, collected-from-owner switch, and what each person is
 * owed / paid / pending, with Pay and payment history (undo).
 * Edit opens the work form.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '@/theme';
import {
  Button,
  Card,
  Empty,
  HeaderButton,
  SectionTitle,
} from '@/components/ui';
import PaySheet from '@/components/sheets/PaySheet';
import {
  addPayment,
  addPayments,
  deletePayment,
  getWork,
  setCollected,
} from '@/data';
import { workDues } from '@/domain/dues';
import { workPeopleCount } from '@/domain/lines';
import { money, shortDate, todayIso } from '@/utils/format';
import { confirmAction, confirmDelete, showError } from '@/components/alert';
import { mdiCashMultiple } from '@mdi/js';
import { ROUTES } from '@/navigation/routes';

export default function WorkDetailScreen({ navigation, route }) {
  const s = useStyles();
  const { id, cateringId } = route.params;
  const [work, setWork] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  const load = useCallback(
    () =>
      getWork(id)
        .then(w => {
          if (!w) {
            navigation.goBack();
            return;
          }
          setWork(w);
          navigation.setOptions({
            title: `${shortDate(w.date)}${w.session ? ' · ' + w.session : ''}`,
            headerRight: () => (
              <HeaderButton
                title="Edit"
                onPress={() =>
                  navigation.navigate(ROUTES.WORK_FORM, { cateringId, id })
                }
              />
            ),
          });
        })
        .catch(showError),
    [id, cateringId, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!work) {
    return <SafeAreaView style={s.screen} edges={['bottom']} />;
  }

  const dues = workDues(work);
  const ownExtras = work.extras.filter(e => !e.people.length);

  const toggleCollected = async on => {
    try {
      await setCollected(id, on ? todayIso() : null);
      load();
    } catch (e) {
      showError(e);
    }
  };

  const onPay = async ({ amount, paid_at }) => {
    try {
      await addPayment({
        work_id: id,
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

  const payAll = async () => {
    const list = dues.rows.filter(r => r.pending > 0);
    const ok = await confirmAction(
      'Pay everyone?',
      `${list.map(r => `${r.name} ${money(r.pending)}`).join('\n')}\n\n` +
        `Total ${money(dues.pending)}, paid today.`,
      'Pay all',
      { iconPath: mdiCashMultiple },
    );
    if (!ok) {
      return;
    }
    try {
      await addPayments(
        list.map(r => ({
          work_id: id,
          person_id: r.person_id,
          person_name: r.name,
          amount: r.pending,
          paid_at: todayIso(),
        })),
      );
      load();
    } catch (e) {
      showError(e);
    }
  };

  const undoPayment = async p => {
    const ok = await confirmDelete(
      `payment of ${money(p.amount)} to ${p.person_name}`,
      `Paid on ${shortDate(p.paid_at)}.`,
    );
    if (!ok) {
      return;
    }
    try {
      await deletePayment(p.id);
      load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Card>
          <View style={s.rowBetween}>
            <View style={s.flex}>
              <Text style={s.muted}>Work total</Text>
              <Text style={s.amountBig}>{money(work.total)}</Text>
            </View>
          </View>
          <Text style={s.muted}>People: {workPeopleCount(work.lines)}</Text>
          {work.place ? <Text style={s.text}>{work.place}</Text> : null}
          {work.notes ? <Text style={s.muted}>{work.notes}</Text> : null}
        </Card>

        <Card>
          <View style={s.rowBetween}>
            <View style={s.flex}>
              <Text style={s.subtitle}>Collected from owner</Text>
              <Text style={work.collected_at ? s.textPaid : s.textPending}>
                {work.collected_at
                  ? `Collected on ${shortDate(work.collected_at)}`
                  : `To collect ${money(work.total)}`}
              </Text>
            </View>
            <Switch
              value={!!work.collected_at}
              onValueChange={toggleCollected}
            />
          </View>
        </Card>

        <View style={s.rowBetween}>
          <SectionTitle>Pay people</SectionTitle>
          {dues.pending > 0 ? (
            <Button
              title={`Pay all ${money(dues.pending)}`}
              small
              variant="secondary"
              onPress={payAll}
            />
          ) : null}
        </View>
        <View style={s.gapSm} />
        {dues.rows.length === 0 ? (
          <Card>
            <Empty text="No one to pay" />
          </Card>
        ) : null}
        {dues.rows.map(r => (
          <Card key={r.key}>
            <View style={s.rowBetween}>
              <View style={s.flex}>
                <Text style={s.subtitle}>{r.name}</Text>
                <Text style={s.muted}>
                  Owed {money(r.due)}
                  {r.extrasDue > 0
                    ? ` (work ${money(r.linesDue)} + extras ${money(
                        r.extrasDue,
                      )})`
                    : ''}
                </Text>
                {r.pending > 0 ? (
                  <Text style={s.textPending}>
                    Pending {money(r.pending)}
                    {r.paid > 0 ? ` · paid ${money(r.paid)}` : ''}
                  </Text>
                ) : (
                  <Text style={s.textPaid}>
                    Paid {money(r.paid)}
                    {r.overpaid > 0 ? ` (${money(r.overpaid)} extra)` : ''}
                  </Text>
                )}
              </View>
              {r.pending > 0 ? (
                <Button
                  title="Pay"
                  small
                  onPress={() =>
                    setPayTarget({
                      name: r.name,
                      person_id: r.person_id,
                      pending: r.pending,
                    })
                  }
                />
              ) : (
                <View style={s.badgePaid}>
                  <Text style={s.badgePaidText}>Paid</Text>
                </View>
              )}
            </View>
            {r.payments.map(p => (
              <View key={p.id} style={s.historyRow}>
                <Text style={s.muted}>
                  {money(p.amount)} paid on {shortDate(p.paid_at)}
                </Text>
                <Pressable hitSlop={10} onPress={() => undoPayment(p)}>
                  <Text style={s.removeX}>✕</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ))}

        {work.extras.length ? (
          <>
            <View style={s.gapSm} />
            <SectionTitle>Extras</SectionTitle>
            <Card>
              {work.extras.map((e, i) => (
                <View key={e.id}>
                  {i > 0 ? <View style={s.divider} /> : null}
                  <View style={s.rowBetween}>
                    <View style={s.flex}>
                      <Text style={s.text}>{e.name}</Text>
                      <Text style={s.muted}>
                        {e.people.length
                          ? `${e.people
                              .map(p => p.person_name)
                              .join(', ')} · ${money(e.amount)} each`
                          : 'Not paid to anyone'}
                      </Text>
                    </View>
                    <Text style={s.amount}>
                      {money(e.amount * Math.max(1, e.people.length))}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
            {ownExtras.length ? (
              <Text style={s.muted}>
                Extras not paid to anyone are only collected from the owner.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <PaySheet
        visible={!!payTarget}
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onSave={onPay}
      />
    </SafeAreaView>
  );
}
