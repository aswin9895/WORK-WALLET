/**
 * New / Edit Work (redesign v1 — owner's second mockup, both themes).
 * Date / Session / Place card, People and Extras sections, Total card,
 * Notes, and a narrow "Save" pill pinned at the bottom. Edit mode has a
 * delete (trash) icon in the header. Stack header hidden for this route.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { Pressable, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calculator,
  CalendarDays,
  FileText,
  Layers,
  MapPin,
  Trash2,
  Users,
  Utensils,
  X,
} from 'lucide-react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { KitButton, ScreenHeader } from '@/components/kit';
import Combo from '@/components/form/Combo';
import DateField from '@/components/form/DateField';
import LineSheet from '@/components/sheets/LineSheet';
import { deleteWork, getWork, listPeople, savePerson, saveWork } from '@/data';
import {
  amountText,
  formatAmountInput,
  money,
  parseNum,
  qty,
  todayIso,
} from '@/utils/format';
import { lineTotal, workPeopleCount } from '@/domain/lines';
import { extraPersonOptions, workFormSnapshot } from '@/domain/workForm';
import { personKey } from '@/domain/dues';
import {
  confirmAction,
  confirmDelete,
  showError,
  showMessage,
} from '@/components/alert';
import { ROUTES } from '@/navigation/routes';

const SESSIONS = ['Breakfast', 'Lunch', 'Dinner', 'Setting'].map(x => ({
  key: x,
  label: x,
}));

let tempKey = 0;
const withKey = l => ({ ...l, key: `k${++tempKey}` });

/** "₹700 + 3 people × ₹600" */
function describeLine(l) {
  let text = money(l.rate_amount);
  if (l.quantity !== 1) {
    text += ` × ${qty(l.quantity)}`;
  }
  if (l.called_count > 0) {
    text += `  +  ${l.called_count} called × ${money(l.called_amount)}`;
  }
  return text;
}

/** Owner pays amount × people (at least once). */
const extraRowTotal = e =>
  (parseNum(e.amount) || 0) * Math.max(1, e.people.length);

export default function WorkFormScreen({ navigation, route }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const tileColor = s.palTileIcon.color;
  const sectionColor = s.palSectionIcon.color;
  const { cateringId, id } = route.params;
  const [date, setDate] = useState(todayIso());
  const [place, setPlace] = useState('');
  const [session, setSession] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  // extras: [{key, name, amount(text), people:[{person_id, person_name}], search}]
  const [extras, setExtras] = useState([]);
  const [payments, setPayments] = useState([]); // already recorded for this work
  const [people, setPeople] = useState([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [baseline, setBaseline] = useState(() =>
    id ? null : workFormSnapshot({ date }),
  );
  const [exitAction, setExitAction] = useState(null);
  const confirmingExit = useRef(false);
  const saving = useRef(false);
  const dirty =
    baseline !== null &&
    baseline !==
      workFormSnapshot({ date, place, session, notes, lines, extras });
  usePreventRemove(dirty && !exitAction, ({ data }) => {
    if (confirmingExit.current || saving.current) {
      return;
    }
    confirmingExit.current = true;
    confirmAction(
      'Discard unsaved work?',
      'Your changes to this work have not been saved. Leave without saving?',
      'Discard & leave',
      { destructive: true },
    )
      .then(ok => {
        if (ok) {
          navigation.dispatch(data.action);
        }
      })
      .finally(() => {
        confirmingExit.current = false;
      });
  });
  // Wait for the removal guard to update before leaving after a successful save/delete.
  useEffect(() => {
    if (exitAction === 'saved') {
      navigation.goBack();
    }
    if (exitAction === 'deleted') {
      navigation.navigate(ROUTES.CATERING, { id: cateringId });
    }
  }, [exitAction, navigation, cateringId]);

  const loadPeople = useCallback(
    () => listPeople().then(setPeople).catch(showError),
    [],
  );

  const onDelete = useCallback(async () => {
    if (
      !(await confirmDelete(
        'this work',
        'Its people, extras and payment records will also be deleted.',
      ))
    ) {
      return;
    }
    try {
      await deleteWork(id);
      // back to the catering (skips the deleted work's detail screen)
      setExitAction('deleted');
    } catch (e) {
      showError(e);
    }
  }, [id]);

  useEffect(() => {
    loadPeople();
    if (id) {
      getWork(id)
        .then(w => {
          if (w) {
            setDate(w.date);
            setPlace(w.place || '');
            setSession(w.session || '');
            setNotes(w.notes || '');
            setLines(w.lines.map(withKey));
            setExtras(
              w.extras.map(e =>
                withKey({
                  name: e.name,
                  amount: amountText(e.amount),
                  people: e.people.map(p => ({
                    person_id: p.person_id,
                    person_name: p.person_name,
                  })),
                  search: '',
                }),
              ),
            );
            setPayments(w.payments);
            setBaseline(workFormSnapshot(w));
          }
        })
        .catch(showError);
    }
  }, [id, loadPeople]);

  const editingLine = lines.find(l => l.key === editingKey) || null;
  const peopleTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const extraTotal = extras.reduce((sum, e) => sum + extraRowTotal(e), 0);

  /* ---- extras ---- */
  const addExtra = () =>
    setExtras([
      ...extras,
      withKey({ name: '', amount: '', people: [], search: '', isNew: true }),
    ]);
  const updateExtra = (key, patch) =>
    setExtras(es => es.map(e => (e.key === key ? { ...e, ...patch } : e)));
  const removeExtra = key => setExtras(es => es.filter(e => e.key !== key));

  const toggleExtraPerson = (key, p) =>
    setExtras(es =>
      es.map(e => {
        if (e.key !== key) {
          return e;
        }
        const has = e.people.some(
          x => personKey(x.person_name) === personKey(p.name),
        );
        return {
          ...e,
          search: '',
          people: has
            ? e.people.filter(
                x => personKey(x.person_name) !== personKey(p.name),
              )
            : [...e.people, { person_id: p.id, person_name: p.name }],
        };
      }),
    );

  const createExtraPerson = async (key, text) => {
    const name = text.trim();
    if (!name) {
      return;
    }
    const existing = people.find(p => personKey(p.name) === personKey(name));
    try {
      let p = existing;
      if (!p) {
        const newId = await savePerson({ name });
        await loadPeople();
        p = { id: newId, name };
      }
      setExtras(es =>
        es.map(e =>
          e.key === key &&
          !e.people.some(x => personKey(x.person_name) === personKey(p.name))
            ? {
                ...e,
                search: '',
                people: [...e.people, { person_id: p.id, person_name: p.name }],
              }
            : e,
        ),
      );
    } catch (e) {
      showError(e);
    }
  };

  /* ---- people lines ---- */
  const openAdd = () => {
    setEditingKey(null);
    setSheetOpen(true);
  };
  const openEdit = key => {
    setEditingKey(key);
    setSheetOpen(true);
  };

  const onLinesSaved = newLines => {
    if (editingKey) {
      setLines(
        lines.map(l =>
          l.key === editingKey ? { ...newLines[0], key: l.key } : l,
        ),
      );
    } else {
      setLines([...lines, ...newLines.map(withKey)]);
    }
    setSheetOpen(false);
  };

  const onLineDelete = () => {
    setLines(lines.filter(l => l.key !== editingKey));
    setSheetOpen(false);
  };

  /* ---- save ---- */
  const onSave = async () => {
    if (saving.current || baseline === null) {
      return;
    }
    if (!date) {
      return showMessage('Pick a date');
    }
    const cleanExtras = [];
    for (const e of extras) {
      const name = e.name.trim();
      const amount = parseNum(e.amount);
      if (!name && isNaN(amount) && !e.people.length) {
        continue; // empty row, ignore
      }
      if (!name) {
        return showMessage('Type a name for each extra');
      }
      if (isNaN(amount) || amount < 0) {
        return showMessage(`Enter the amount for ${name}`);
      }
      cleanExtras.push({ name, amount, people: e.people });
    }

    // Payments of people who are no longer on this work would be deleted.
    const keep = new Set([
      ...lines.map(l => personKey(l.person_name)),
      ...cleanExtras.flatMap(e => e.people.map(p => personKey(p.person_name))),
    ]);
    const lost = payments.filter(p => !keep.has(personKey(p.person_name)));
    if (lost.length) {
      const names = [...new Set(lost.map(p => p.person_name))].join(', ');
      const sum = lost.reduce((t, p) => t + p.amount, 0);
      const ok = await confirmAction(
        'Remove paid people?',
        `${names} already got ${money(sum)} for this work. ` +
          'Saving will delete those payment records.',
        'Save anyway',
        { destructive: true },
      );
      if (!ok) {
        return;
      }
    }

    try {
      saving.current = true;
      await saveWork({
        id,
        catering_id: cateringId,
        date,
        place,
        session,
        notes,
        lines,
        extras: cleanExtras,
      });
      setExitAction('saved');
    } catch (e) {
      showError(e);
    } finally {
      saving.current = false;
    }
  };

  return (
    <View style={s.kitScreen}>
      <ScreenHeader
        title={id ? 'Edit Work' : 'New Work'}
        onBack={() => navigation.goBack()}
        ActionIcon={id ? Trash2 : undefined}
        actionLabel={id ? 'Delete work' : undefined}
        onAction={id ? onDelete : undefined}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={s.wfContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={90}
      >
        {/* ---- date / session / place ---- */}
        <View style={s.wfCard}>
          <View style={s.wfRow}>
            <View style={s.kitTile}>
              <CalendarDays size={21} strokeWidth={1.9} color={tileColor} />
            </View>
            <FixedText style={s.wfRowLabel}>Date</FixedText>
            <DateField
              kit
              style={s.wfRowField}
              value={date}
              onChange={setDate}
            />
          </View>
          <View style={s.wfRowDivider} />
          <View style={s.wfRow}>
            <View style={s.kitTile}>
              <Utensils size={21} strokeWidth={1.9} color={tileColor} />
            </View>
            <FixedText style={s.wfRowLabel}>Session</FixedText>
            <Combo
              kit
              style={s.wfRowField}
              placeholder="Select or type"
              value={session}
              onChangeText={setSession}
              options={SESSIONS}
              selectedKeys={[session]}
              onPick={o => setSession(o.label)}
              closeOnPick
            />
          </View>
          <View style={s.wfRowDivider} />
          <View style={s.wfRow}>
            <View style={s.kitTile}>
              <MapPin size={21} strokeWidth={1.9} color={tileColor} />
            </View>
            <FixedText style={s.wfRowLabel}>Place</FixedText>
            <TextInput
              style={[s.kitInput, s.kitTextInput, s.wfRowField]}
              value={place}
              onChangeText={setPlace}
              placeholder="Work place"
              placeholderTextColor={s.palPlaceholder.color}
              allowFontScaling={false}
            />
          </View>
        </View>

        {/* ---- people ---- */}
        <View style={s.wfSectionHead}>
          <Users size={22} strokeWidth={1.9} color={sectionColor} />
          <FixedText style={s.wfSectionTitle}>
            PEOPLE ({qty(workPeopleCount(lines))})
          </FixedText>
          <Pressable
            onPress={openAdd}
            hitSlop={6}
            style={({ pressed }) => [s.wfAddBtn, pressed && s.btnPressed]}
          >
            <FixedText style={s.wfAddBtnText}>+ Add person</FixedText>
          </Pressable>
        </View>
        <View style={s.wfListCard}>
          {lines.length === 0 ? (
            <FixedText style={s.wfEmpty}>No one added yet</FixedText>
          ) : null}
          {lines.map((l, i) => (
            <Pressable key={l.key} onPress={() => openEdit(l.key)}>
              {i > 0 ? <View style={s.wfRowDivider} /> : null}
              <View style={s.wfPerson}>
                <View style={s.wfPersonBody}>
                  <FixedText style={s.wfPersonName} numberOfLines={1}>
                    {l.person_name}
                  </FixedText>
                  <FixedText style={s.wfPersonDesc}>
                    {describeLine(l)}
                  </FixedText>
                </View>
                <View style={s.wfAmtPill}>
                  <FixedText style={s.wfAmtPillText}>
                    {money(lineTotal(l))}
                  </FixedText>
                </View>
              </View>
            </Pressable>
          ))}
          {lines.length ? (
            <View style={s.wfPeopleTotal}>
              <FixedText style={s.wfPeopleTotalLabel}>People total</FixedText>
              <FixedText style={s.wfPeopleTotalValue}>
                {money(peopleTotal)}
              </FixedText>
            </View>
          ) : null}
        </View>

        {/* ---- extras ---- */}
        <View style={s.wfSectionHead}>
          <Layers size={22} strokeWidth={1.9} color={sectionColor} />
          <FixedText style={s.wfSectionTitle}>
            EXTRAS ({extras.length})
          </FixedText>
          <Pressable
            onPress={addExtra}
            hitSlop={6}
            style={({ pressed }) => [s.wfAddBtn, pressed && s.btnPressed]}
          >
            <FixedText style={s.wfAddBtnText}>+ Add extra</FixedText>
          </Pressable>
        </View>
        {extras.map(e => (
          <View key={e.key} style={s.wfExtraCard}>
            <View style={s.wfExtraRow}>
              <TextInput
                style={[s.kitInput, s.kitTextInput, s.wfExtraName]}
                value={e.name}
                onChangeText={v => updateExtra(e.key, { name: v })}
                placeholder="Extra name"
                placeholderTextColor={s.palPlaceholder.color}
                allowFontScaling={false}
                autoFocus={!!e.isNew}
              />
              <TextInput
                style={[s.kitInput, s.kitTextInput, s.wfExtraAmount]}
                value={e.amount}
                onChangeText={v =>
                  updateExtra(e.key, { amount: formatAmountInput(v) })
                }
                keyboardType="numeric"
                placeholder="Amount"
                placeholderTextColor={s.palPlaceholder.color}
                allowFontScaling={false}
              />
              <Pressable
                hitSlop={10}
                style={s.wfRemove}
                onPress={() => removeExtra(e.key)}
                accessibilityLabel="Remove extra"
              >
                <X size={22} strokeWidth={2.2} color={s.palDanger.color} />
              </Pressable>
            </View>
            <Combo
              kit
              placeholder={
                e.people.length
                  ? `${e.people.length} selected`
                  : 'Pay to (optional)'
              }
              value={e.search}
              onChangeText={v => updateExtra(e.key, { search: v })}
              options={extraPersonOptions(lines, e.people)}
              selectedKeys={e.people.map(p => personKey(p.person_name))}
              onPick={o => toggleExtraPerson(e.key, o.p)}
              onCreate={text => createExtraPerson(e.key, text)}
            />
            {e.people.length ? (
              <FixedText style={s.wfExtraSummary}>
                {e.people.map(p => p.person_name).join(', ')} ·{' '}
                {money(parseNum(e.amount) || 0)} each ={' '}
                {money(extraRowTotal(e))}
              </FixedText>
            ) : null}
          </View>
        ))}

        {/* ---- total ---- */}
        <View style={s.wfTotal}>
          <View style={s.kitTile}>
            <Calculator size={21} strokeWidth={1.9} color={tileColor} />
          </View>
          <View style={s.wfTotalBody}>
            <FixedText style={s.wfTotalTitle}>Total</FixedText>
            <FixedText style={s.wfTotalSub}>
              People {money(peopleTotal)} · Extras {money(extraTotal)}
            </FixedText>
          </View>
          <View style={s.wfTotalPill}>
            <FixedText style={s.wfTotalPillText}>
              {money(peopleTotal + extraTotal)}
            </FixedText>
          </View>
        </View>

        {/* ---- notes ---- */}
        <View style={s.wfNotesHead}>
          <FileText size={22} strokeWidth={1.9} color={sectionColor} />
          <FixedText style={s.wfNotesTitle}>Notes</FixedText>
        </View>
        <TextInput
          style={[s.kitInput, s.kitTextInput, s.kitInputMultiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          placeholderTextColor={s.palPlaceholder.color}
          allowFontScaling={false}
          multiline
        />
      </KeyboardAwareScrollView>

      <View style={[s.kitCtaFixed, { bottom: insets.bottom + 16 }]}>
        <KitButton title="Save" shape="pill" onPress={onSave} />
      </View>

      <LineSheet
        visible={sheetOpen}
        line={editingLine}
        people={people}
        takenPersonIds={lines.map(l => l.person_id).filter(Boolean)}
        onClose={() => setSheetOpen(false)}
        onSave={onLinesSaved}
        onDelete={onLineDelete}
        onPeopleChanged={loadPeople}
      />
    </View>
  );
}
