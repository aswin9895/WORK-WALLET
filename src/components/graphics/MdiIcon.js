/**
 * Solid icon from Material Design Icons (@mdi/js, Apache-2.0).
 *   <MdiIcon path={mdiBriefcaseVariant} size={30} color={s.palAppbarIcon.color} />
 *   gradientTo — optional: fills top (color) → bottom (gradientTo)
 * Use for filled icons from the designs; outline icons come from
 * lucide-react-native.
 */
import React, { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export default function MdiIcon({ path, size = 24, color, gradientTo }) {
  const id = `mdi${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {gradientTo ? (
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={gradientTo} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Path d={path} fill={gradientTo ? `url(#${id})` : color} />
    </Svg>
  );
}
