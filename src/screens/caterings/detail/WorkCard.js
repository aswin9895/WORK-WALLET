/**
 * One work in the catering detail list: calendar tile, date + place,
 * session badge, people + extras, total, and a status strip
 * (green when collected, orange when to collect; right side: pay status).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { CalendarDays, Tag, Users } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { CheckBox, FixedText } from '@/components/ui';
import { extraTotal } from '@/domain/dues';
import { workPeopleCount } from '@/domain/lines';
import { money, qty, shortDate } from '@/utils/format';

/** "Aswin +3, Akhil" (+3 = people called) */
function namesSummary(lines) {
  if (!lines.length) {
    return 'No people added';
  }
  return lines
    .map(l => {
      let t = l.person_name;
      if (l.quantity !== 1) {
        t += ` ×${qty(l.quantity)}`;
      }
      if (l.called_count > 0) {
        t += ` +${l.called_count}`;
      }
      return t;
    })
    .join(', ');
}

export default function WorkCard({
  work,
  selectMode,
  selected,
  onPress,
  onLongPress,
}) {
  const s = useStyles();
  const collected = !!work.collected_at;
  const hasPeople = work.dues.rows.length > 0;
  const allPaid = hasPeople && work.dues.pending <= 0;
  const payText = !hasPeople
    ? ''
    : allPaid
    ? 'All paid'
    : `To pay ${money(work.dues.pending)}`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        s.catWork,
        pressed && s.catWorkPressed,
        selectMode && selected && s.catWorkSelected,
      ]}
    >
      <View style={s.catWorkTop}>
        {selectMode ? (
          <View style={s.catCheck}>
            <CheckBox on={selected} />
          </View>
        ) : null}
        <View style={s.kitTile}>
          <CalendarDays
            size={22}
            strokeWidth={1.9}
            color={s.palTileIcon.color}
          />
        </View>
        <View style={s.catWorkHead}>
          <FixedText style={s.catWorkDate}>{shortDate(work.date)}</FixedText>
          {work.place ? (
            <FixedText style={s.catWorkPlace} numberOfLines={1}>
              {work.place}
            </FixedText>
          ) : null}
        </View>
        {work.session ? (
          <View style={s.catSession}>
            <FixedText style={s.catSessionText}>{work.session}</FixedText>
          </View>
        ) : null}
      </View>

      <View style={s.catWorkMid}>
        <View style={s.catWorkLines}>
          <FixedText style={s.catWorkLineText}>
            People: {qty(workPeopleCount(work.lines))}
          </FixedText>
          <View style={s.catWorkLine}>
            <Users size={17} strokeWidth={1.8} color={s.palMuted.color} />
            <FixedText style={s.catWorkLineText} numberOfLines={2}>
              {namesSummary(work.lines)}
            </FixedText>
          </View>
          {work.extras.length ? (
            <View style={s.catWorkLine}>
              <Tag size={17} strokeWidth={1.8} color={s.palMuted.color} />
              <FixedText style={s.catWorkLineText} numberOfLines={2}>
                Extras:{' '}
                {work.extras
                  .map(e => `${e.name} ${money(extraTotal(e))}`)
                  .join(', ')}
              </FixedText>
            </View>
          ) : null}
        </View>
        <View style={s.catWorkDivider} />
        <FixedText style={s.catWorkAmount}>{money(work.total)}</FixedText>
      </View>

      <View style={[s.catStrip, collected ? s.catBarOk : s.catBarWarn]}>
        <FixedText
          style={[s.catStripText, collected ? s.catTextOk : s.catTextWarn]}
        >
          {collected ? 'Collected' : 'To collect'}
        </FixedText>
        <FixedText
          style={[s.catStripText, allPaid ? s.catTextOk : s.catTextWarn]}
        >
          {payText}
        </FixedText>
      </View>
    </Pressable>
  );
}
