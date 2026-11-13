/**
 * Total + aligned "label ... value" rows: Collected / To collect /
 * To pay people (catering detail).
 */
import React from 'react';
import { View } from 'react-native';
import { CircleCheck, Hourglass, Layers, Users } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { money } from '@/utils/format';

function Row({ Icon, label, value, ok }) {
  const s = useStyles();
  const color = ok ? s.palOk.color : s.palWarn.color;
  return (
    <View style={s.catSumRow}>
      <Icon size={18} strokeWidth={2} color={color} />
      <FixedText style={s.catSumLabel}>{label}</FixedText>
      <FixedText style={[s.catSumValue, ok ? s.catTextOk : s.catTextWarn]}>
        {money(value)}
      </FixedText>
    </View>
  );
}

export default function SummaryCard({ total, collected, toCollect, toPay }) {
  const s = useStyles();
  return (
    <View style={s.catSummary}>
      <View style={s.catSummaryTop}>
        <View style={s.kitTile}>
          <Layers size={22} strokeWidth={2} color={s.palTileIcon.color} />
        </View>
        <View style={s.catSummaryText}>
          <FixedText style={s.catSummaryLabel}>Total</FixedText>
          <FixedText style={s.catSummaryAmount}>{money(total)}</FixedText>
        </View>
      </View>
      <View style={s.catSummaryRows}>
        <Row Icon={CircleCheck} label="Collected" value={collected} ok />
        <Row Icon={Hourglass} label="To collect" value={toCollect} />
        <Row Icon={Users} label="To pay people" value={toPay} />
      </View>
    </View>
  );
}
