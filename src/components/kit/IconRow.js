/**
 * Card row: icon tile | (divider) | title + text | (chevron).
 *
 *   iconPath  — @mdi/js path for the tile icon
 *   round     — round tile (theme decides how round: $tile-round-radius)
 *   divider   — 'theme' (only where the theme draws it, $row-divider)
 *               | 'always' | 'none'
 *   title     — optional bold title; text — body text
 *   onPress   — makes the row pressable and shows a chevron
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { mdiChevronRight } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import MdiIcon from '@/components/graphics/MdiIcon';

export default function IconRow({
  iconPath,
  round = false,
  divider = 'theme',
  title,
  text,
  onPress,
}) {
  const s = useStyles();
  const content = (
    <>
      <View style={[s.kitTile, round && s.kitTileRound]}>
        <MdiIcon path={iconPath} size={22} color={s.palTileIcon.color} />
      </View>
      {divider !== 'none' ? (
        <View
          style={[
            s.kitRowDivider,
            divider === 'always' && s.kitRowDividerAlways,
          ]}
        />
      ) : null}
      <View style={s.kitRowBody}>
        {title ? <FixedText style={s.kitRowTitle}>{title}</FixedText> : null}
        {text ? (
          <FixedText style={[s.kitRowText, !title && s.kitRowTextStrong]}>
            {text}
          </FixedText>
        ) : null}
      </View>
      {onPress ? (
        <MdiIcon path={mdiChevronRight} size={24} color={s.palMuted.color} />
      ) : null}
    </>
  );
  if (!onPress) {
    return <View style={s.kitRow}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.kitRow, pressed && s.kitRowPressed]}
    >
      {content}
    </Pressable>
  );
}
