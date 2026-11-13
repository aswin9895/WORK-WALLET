/** Actual payments across caterings, scoped to myself / all / other people. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { mdiPoll } from '@mdi/js';
import { SlidersHorizontal } from 'lucide-react-native';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import GradientView from '@/components/graphics/GradientView';
import Cloche from '@/components/graphics/Cloche';
import MdiIcon from '@/components/graphics/MdiIcon';
import { money, todayIso, shortDate } from '@/utils/format';
import { earningsDateRange, paidEarnings } from '@/domain/earnings';
import EarningsFilterSheet, { EARNINGS_RANGES } from './EarningsFilterSheet';

export default function HeroCard({ data }) {
  const s = useStyles();
  const [filters, setFilters] = useState(() => ({
    scope: 'myself',
    range: 'all',
    from: todayIso(),
    to: todayIso(),
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { scope, range, from, to } = filters;
  const [start, end] = earningsDateRange(range, from, to);
  const invalidDates = start && end && start > end;
  const needsMyself = data && !data.myself && scope !== 'all';
  const total =
    data && !invalidDates && !needsMyself
      ? paidEarnings(data, scope, start, end)
      : null;
  return (
    // outer view carries the glow (boxShadow); inner one clips the gradient
    <View style={s.homeHeroShadow}>
      <GradientView
        from={s.palHeroFrom.color}
        to={s.palHeroTo.color}
        direction="diagonal"
        style={s.homeHero}
      >
        <View style={s.homeHeroArt} pointerEvents="none">
          <Svg width={190} height={120} viewBox="0 0 190 120">
            {/* soft mound the cloche sits on */}
            <Ellipse
              cx="130"
              cy="128"
              rx="120"
              ry="34"
              fill={s.palHeroHill.color}
            />
          </Svg>
          <View style={s.fillAbsolute}>
            <View style={s.homeHeroCloche}>
              <Cloche
                size={118}
                color={s.palHeroArt.color}
                shine={s.palHeroArtShine.color}
              />
            </View>
          </View>
        </View>
        <View style={s.homeHeroBody}>
          <View style={s.homeHeroIcon}>
            <MdiIcon path={mdiPoll} size={24} color={s.palHeroIcon.color} />
          </View>
          <View style={s.homeHeroText}>
            <View style={s.homeHeroHeading}>
              <FixedText style={[s.homeHeroLabel, s.flex]}>
                {scope === 'myself'
                  ? 'My earnings'
                  : scope === 'all'
                  ? 'Total paid'
                  : 'Paid to other people'}
              </FixedText>
              <Pressable
                style={s.homeHeroFilterButton}
                accessibilityRole="button"
                accessibilityLabel="Filter earnings"
                onPress={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal
                  size={18}
                  strokeWidth={1.9}
                  color={s.palHeroIcon.color}
                />
              </Pressable>
            </View>
            <FixedText style={s.homeHeroAmount}>
              {total === null ? '—' : money(total)}
            </FixedText>
            <FixedText style={s.homeHeroNote}>
              Across all caterings · Payments received
            </FixedText>
            <FixedText style={s.homeHeroNote}>
              {range === 'custom'
                ? `${shortDate(from)} – ${shortDate(to)}`
                : EARNINGS_RANGES.find(item => item.value === range).label}
            </FixedText>
          </View>
        </View>
      </GradientView>
      {filtersOpen ? (
        <EarningsFilterSheet
          value={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={value => {
            setFilters(value);
            setFiltersOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
