/**
 * "Add person" / "Edit person" sheet for a work.
 *
 * Add:  pick one or more people from the dropdown (or type a new name, which
 *       is saved to People). Each picked person gets a row with:
 *         - their own amount          (starts from the shared Amount, or their
 *                                      fixed amount from People)
 *         - People called (stepper)    extra workers they brought (not counting
 *                                      themselves)
 *         - Their amount               pay per called worker (starts equal to
 *                                      their own amount until edited)
 *       Row total = own amount + people called × their amount.
 * Edit: one row for the tapped person.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStyles } from '@/theme';
import Sheet from '@/components/sheets/Sheet';
import Combo from '@/components/form/Combo';
import Stepper from '@/components/form/Stepper';
import { Field } from '@/components/ui';
import { savePerson } from '@/data';
import {
  amountText,
  formatAmountInput,
  money,
  parseNum,
  qty,
} from '@/utils/format';
import { lineTotal } from '@/domain/lines';
import { isMyselfEntry } from '@/domain/earnings';
import { showError } from '@/components/alert';

let rowKey = 0;

const hasFixed = p =>
  p.default_rate_amount !== null && p.default_rate_amount !== undefined;

function rowTotal(r) {
  return lineTotal({
    rate_amount: parseNum(r.own) || 0,
    quantity: r.quantity,
    called_count: r.called,
    called_amount: parseNum(r.calledAmt) || 0,
  });
}

export default function LineSheet({
  visible,
  line,
  people,
  takenPersonIds = [],
  onClose,
  onSave,
  onDelete,
  onPeopleChanged,
}) {
  const s = useStyles();
  const editing = !!line;
  const [rows, setRows] = useState([]);
  const [shared, setShared] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const myself = people.find(p => p.is_myself);
  const isMine = r =>
    isMyselfEntry({ person_id: r.person_id, person_name: r.name }, myself);

  // Reset every time the sheet opens
  useEffect(() => {
    if (!visible) {
      return;
    }
    setError(null);
    setSearch('');
    setShared('');
    if (line) {
      setRows([
        {
          key: `r${++rowKey}`,
          person_id: line.person_id,
          name: line.person_name,
          own: amountText(line.rate_amount),
          quantity: line.quantity,
          called: line.called_count || 0,
          calledAmt:
            line.called_amount !== null && line.called_amount !== undefined
              ? amountText(line.called_amount)
              : amountText(line.rate_amount),
          calledTouched: true,
        },
      ]);
    } else {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const updateRow = (key, patch) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const setOwn = (key, text) =>
    setRows(rs =>
      rs.map(r =>
        r.key === key
          ? {
              ...r,
              own: text,
              calledAmt: r.calledTouched ? r.calledAmt : text,
            }
          : r,
      ),
    );

  const setSharedAmount = text => {
    setShared(text);
    setError(null);
    setRows(rs =>
      rs.map(r => ({
        ...r,
        own: text,
        calledAmt: r.calledTouched ? r.calledAmt : text,
      })),
    );
  };

  const addRow = p => {
    const own = hasFixed(p) ? amountText(p.default_rate_amount) : shared;
    setRows(rs => [
      ...rs,
      {
        key: `r${++rowKey}`,
        person_id: p.id,
        name: p.name,
        own,
        quantity: 1,
        called: 0,
        calledAmt: own,
        calledTouched: false,
      },
    ]);
  };

  const togglePerson = p => {
    setError(null);
    setSearch('');
    if (rows.some(r => r.person_id === p.id)) {
      setRows(rs => rs.filter(r => r.person_id !== p.id));
    } else {
      addRow(p);
    }
  };

  const createPerson = async text => {
    const name = text.trim();
    if (!name) {
      return;
    }
    const existing = people.find(
      p => p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      if (!rows.some(r => r.person_id === existing.id)) {
        addRow(existing);
      }
      setSearch('');
      return;
    }
    try {
      const id = await savePerson({ name });
      await onPeopleChanged();
      addRow({ id, name });
      setSearch('');
      setError(null);
    } catch (e) {
      showError(e);
    }
  };

  const submit = () => {
    if (!rows.length) {
      return setError('Pick or type a person');
    }
    const out = [];
    for (const r of rows) {
      if (isMine(r) && r.called > 0) {
        return setError(
          'People called cannot be added under yourself. Add those workers separately.',
        );
      }
      const own = parseNum(r.own);
      if (isNaN(own) || own < 0) {
        return setError(`Enter the amount for ${r.name}`);
      }
      let calledAmt = null;
      if (r.called > 0) {
        calledAmt = parseNum(r.calledAmt);
        if (isNaN(calledAmt) || calledAmt < 0) {
          return setError(`Enter the amount for ${r.name}'s people`);
        }
      }
      out.push({
        person_id: r.person_id || null,
        person_name: r.name,
        rate_name: line?.rate_name || 'Work',
        rate_amount: own,
        quantity: r.quantity || 1,
        called_count: r.called,
        called_amount: calledAmt,
      });
    }
    onSave(out);
  };

  const total = rows.reduce((sum, r) => sum + rowTotal(r), 0);

  const options = people.map(p => {
    const subs = [];
    if (hasFixed(p)) {
      subs.push(`Fixed ${money(p.default_rate_amount)}`);
    }
    if (takenPersonIds.includes(p.id)) {
      subs.push('Already added');
    }
    return { key: p.id, label: p.name, sub: subs.join(' · ') || undefined, p };
  });

  return (
    <Sheet
      visible={visible}
      title={editing ? 'Edit person' : 'Add person'}
      onClose={onClose}
      onSave={submit}
      onDelete={editing ? onDelete : null}
      saveLabel={
        editing ? 'Save' : rows.length > 1 ? `Add ${rows.length}` : 'Add'
      }
    >
      {!editing ? (
        <>
          <Combo
            label="Person name"
            placeholder={
              rows.length ? `${rows.length} selected` : 'Person name'
            }
            value={search}
            onChangeText={setSearch}
            options={options}
            selectedKeys={rows.map(r => r.person_id)}
            onPick={o => togglePerson(o.p)}
            onCreate={createPerson}
          />
          <Field
            label="Amount ₹ (fills everyone)"
            value={shared}
            onChangeText={t => setSharedAmount(formatAmountInput(t))}
            keyboardType="numeric"
            placeholder="Amount"
          />
        </>
      ) : null}

      {rows.map(r => (
        <View key={r.key} style={s.personRow}>
          <View style={s.rowBetween}>
            <Text style={s.subtitle}>{r.name}</Text>
            {!editing ? (
              <Pressable
                hitSlop={10}
                onPress={() => setRows(rs => rs.filter(x => x.key !== r.key))}
              >
                <Text style={s.removeX}>✕</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={s.gapSm} />
          <View style={s.row}>
            <Field
              style={[s.flex, s.fieldTight]}
              label="Own amount ₹"
              value={r.own}
              onChangeText={t => {
                setOwn(r.key, formatAmountInput(t));
                setError(null);
              }}
              keyboardType="numeric"
              placeholder="Amount"
            />
            {!isMine(r) ? (
              <>
                <View style={s.hgap} />
                <View style={[s.flex, s.fieldTight]}>
                  <Text style={s.label}>People called</Text>
                  <Stepper
                    value={r.called}
                    onChange={n => updateRow(r.key, { called: n })}
                  />
                </View>
              </>
            ) : null}
          </View>
          {!isMine(r) && r.called > 0 ? (
            <Field
              style={s.fieldTight}
              label="Their amount ₹ (each)"
              value={r.calledAmt}
              onChangeText={t => {
                updateRow(r.key, {
                  calledAmt: formatAmountInput(t),
                  calledTouched: true,
                });
                setError(null);
              }}
              keyboardType="numeric"
              placeholder="Amount"
            />
          ) : null}
          {r.quantity !== 1 ? (
            <Text style={s.muted}>Old entry: counted × {qty(r.quantity)}</Text>
          ) : null}
          <Text style={s.muted}>
            = {money(parseNum(r.own) || 0)}
            {r.quantity !== 1 ? ` × ${qty(r.quantity)}` : ''}
            {r.called > 0
              ? ` + ${r.called} × ${money(parseNum(r.calledAmt) || 0)}`
              : ''}
            {'  =  '}
            {money(rowTotal(r))}
          </Text>
        </View>
      ))}

      {rows.length ? (
        <View style={s.rowBetween}>
          <Text style={s.subtitle}>Total</Text>
          <Text style={s.amount}>{money(total)}</Text>
        </View>
      ) : null}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <View style={s.gap} />
    </Sheet>
  );
}
