/**
 * Decorative wave shapes for the Home screen.
 *
 * Each wave is wrapped in a View that owns the size (`style`); the SVG just
 * fills that View. (Giving the Svg itself height="100%" made it take the
 * whole screen on Android, so never size the Svg directly.)
 * Colours come from the theme palette.
 */
import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const cleanId = raw => raw.replace(/[^a-zA-Z0-9]/g, '');

/**
 * Curved bottom edge of the app bar: the bar's gradient continues into a
 * curve, with a highlight line along it.
 */
export function AppBarWave({ from, to, line, style }) {
  const id = `w${cleanId(useId())}`;
  return (
    <View style={style} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 34"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 0 H400 V4 C330 4 300 22 220 24 C140 26 60 26 0 30 Z"
          fill={`url(#${id})`}
        />
        <Path
          d="M0 30 C60 26 140 26 220 24 C300 22 330 4 400 4"
          stroke={line}
          strokeWidth="2.5"
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** Soft wave rising behind the main button, fading out towards the top. */
export function BottomWave({ color, style }) {
  const id = `b${cleanId(useId())}`;
  return (
    <View style={style} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 190"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="0.5" stopColor={color} stopOpacity="0.8" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 95 C80 70 150 120 240 95 C310 75 350 30 400 20 V190 H0 Z"
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}
