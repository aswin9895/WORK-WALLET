/**
 * One catering on Home: status avatar, name, "2 works · last 12/11/26",
 * "To collect" pill, total and a chevron.
 *
 * Avatar (status from domain cateringStatus):
 *   ok      — green tick: everything collected and paid
 *   pending — orange coins: money to collect or to pay
 *   empty   — purple bell: no work yet
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import {
  mdiCheckBold,
  mdiChevronRight,
  mdiDatabase,
  mdiRoomService,
} from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import MdiIcon from '@/components/graphics/MdiIcon';
import { money, shortDate } from '@/utils/format';
import MoneyPill from './MoneyPill';

const AVATAR = {
  ok: { path: mdiCheckBold, box: 'homeAvatarOk', color: 'palStatusOk' },
  pending: {
    path: mdiDatabase,
    box: 'homeAvatarPending',
    color: 'palStatusPending',
  },
  empty: {
    path: mdiRoomService,
    box: 'homeAvatarEmpty',
    color: 'palStatusEmpty',
  },
};

export default function CateringCard({ catering, onPress }) {
  const s = useStyles();
  const a = AVATAR[catering.status] || AVATAR.pending;
  const works = catering.work_count;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.homeCard, pressed && s.homeCardPressed]}
    >
      <View style={[s.homeAvatar, s[a.box]]}>
        <MdiIcon path={a.path} size={24} color={s[a.color].color} />
      </View>
      <View style={s.homeCardBody}>
        <FixedText style={s.homeCardName} numberOfLines={1}>
          {catering.name}
        </FixedText>
        <FixedText style={s.homeCardMeta} numberOfLines={1}>
          {works} work{works === 1 ? '' : 's'}
          {catering.last_date
            ? `  ·  last ${shortDate(catering.last_date)}`
            : ''}
        </FixedText>
        {catering.to_collect > 0 ? (
          <MoneyPill small text={`To collect ${money(catering.to_collect)}`} />
        ) : null}
      </View>
      <View style={s.homeCardDivider} />
      <FixedText style={s.homeCardAmount}>{money(catering.total)}</FixedText>
      <MdiIcon path={mdiChevronRight} size={22} color={s.palMuted.color} />
    </Pressable>
  );
}
