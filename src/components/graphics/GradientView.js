/**
 * A View with an SVG linear-gradient background. Children render on top.
 * Colours come from the theme (pass e.g. s.palHeroFrom.color).
 *
 * direction: 'horizontal' (left → right), 'vertical' (top → bottom),
 *            'diagonal' (top-left → bottom-right)
 *
 * The SVG is drawn at the View's measured pixel size (onLayout). Percent
 * sizes on an absolutely-positioned Svg render only partly on Android.
 * The SVG is drawn 1px LARGER than measured (rounded up): the measured size
 * is fractional and Android rounds the SVG down, leaving it ~2px short on
 * the right / bottom — that cut the tips off round buttons ("+ New"). The
 * box's own rounded clipping (overflow: hidden) trims the extra.
 */
import React, { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useStyles } from '@/theme';

const VECTORS = {
  horizontal: { x1: '0', y1: '0', x2: '1', y2: '0' },
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
};

export default function GradientView({
  from,
  to,
  direction = 'horizontal',
  style,
  children,
  onLayout,
  ...viewProps
}) {
  const s = useStyles();
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState(null);

  const handleLayout = e => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev =>
      prev && prev.width === width && prev.height === height
        ? prev
        : {
            width,
            height,
            drawWidth: Math.ceil(width) + 1,
            drawHeight: Math.ceil(height) + 1,
          },
    );
    onLayout?.(e);
  };

  return (
    <View style={style} onLayout={handleLayout} {...viewProps}>
      {size ? (
        <View style={s.fillAbsolute} pointerEvents="none">
          <Svg width={size.drawWidth} height={size.drawHeight}>
            <Defs>
              <LinearGradient id={id} {...VECTORS[direction]}>
                <Stop offset="0" stopColor={from} />
                <Stop offset="1" stopColor={to} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={size.drawWidth}
              height={size.drawHeight}
              fill={`url(#${id})`}
            />
          </Svg>
        </View>
      ) : null}
      {children}
    </View>
  );
}
