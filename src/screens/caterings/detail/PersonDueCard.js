/** People tab: person | owed · paid | pending pill (or "Paid"). */
import React from 'react';
import { Pressable, View } from 'react-native';
import { User } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { money } from '@/utils/format';

export default function PersonDueCard({ person, onPress }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.kitRow, pressed && s.kitRowPressed]}
    >
      <View style={[s.kitTile, s.kitTileRound]}>
        <User size={22} strokeWidth={1.9} color={s.palTileIcon.color} />
      </View>
      <View style={[s.kitRowDivider, s.kitRowDividerAlways]} />
      <View style={s.kitRowBody}>
        <FixedText style={s.kitRowTitle} numberOfLines={1}>
          {person.name}
        </FixedText>
        <FixedText style={s.kitRowText} numberOfLines={1}>
          Owed {money(person.due)} · paid {money(person.paid)}
        </FixedText>
      </View>
      {person.pending > 0 ? (
        <View style={s.kitRatePill}>
          <FixedText style={s.kitRateAmount}>{money(person.pending)}</FixedText>
        </View>
      ) : (
        <View style={s.catPaidPill}>
          <FixedText style={s.catPaidPillText}>Paid</FixedText>
        </View>
      )}
    </Pressable>
  );
}
