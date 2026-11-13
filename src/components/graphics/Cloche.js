/**
 * Serving cloche (dome + plate) illustration, with optional "shine" rays.
 * Colours are passed in from the theme palette.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export default function Cloche({
  size = 120,
  color,
  shine,
  rays = true,
  opacity = 1,
}) {
  const h = size * 0.8;
  return (
    <Svg width={size} height={h} viewBox="0 0 150 120" opacity={opacity}>
      {rays ? (
        <>
          <Line
            x1="22"
            y1="34"
            x2="34"
            y2="42"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Line
            x1="52"
            y1="12"
            x2="56"
            y2="26"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Line
            x1="128"
            y1="34"
            x2="116"
            y2="42"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {/* knob */}
      <Circle cx="75" cy="40" r="8" fill={color} />
      {/* dome */}
      <Path
        d="M23 96 C23 64 46 46 75 46 C104 46 127 64 127 96 Z"
        fill={color}
      />
      {/* shine on the dome */}
      {shine ? (
        <Path
          d="M44 86 C46 70 56 60 70 56"
          stroke={shine}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
      ) : null}
      {/* plate */}
      <Rect x="12" y="98" width="126" height="10" rx="5" fill={color} />
    </Svg>
  );
}
