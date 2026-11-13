/** One person: avatar tile | name + phone | "₹500 / fixed". Tap to edit. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Phone, User } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { money } from '@/utils/format';

export default function PersonCard({ person, onPress }) {
  const s = useStyles();
  const hasRate =
    person.default_rate_amount !== null &&
    person.default_rate_amount !== undefined;
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
        {person.is_myself ? (
          <FixedText style={s.kitRowText}>Myself</FixedText>
        ) : null}
        {person.phone ? (
          <View style={s.kitInline}>
            <Phone size={14} strokeWidth={1.8} color={s.palMuted.color} />
            <FixedText style={s.kitInlineText} numberOfLines={1}>
              {person.phone}
            </FixedText>
          </View>
        ) : null}
      </View>
      {hasRate ? (
        <View style={s.kitRatePill}>
          <FixedText style={s.kitRateAmount}>
            {money(person.default_rate_amount)}
          </FixedText>
          <FixedText style={s.kitRateSuffix}> / fixed</FixedText>
        </View>
      ) : null}
    </Pressable>
  );
}
