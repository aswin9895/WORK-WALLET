/**
 * "Tap outside closes the dropdown" for every Combo.
 *
 * React Native has no outside-tap event, so:
 *   - an open Combo registers itself here (its wrapper view + a close fn);
 *   - <DropdownDismissArea> (mounted around the app in AppRoot and inside
 *     every popup/Modal, which is a separate window) sees every touch via
 *     onTouchStart — it never blocks or steals the touch;
 *   - a touch outside an open dropdown's on-screen box closes it. Touches
 *     inside (the input, the arrow, the list) are left alone.
 */
import React from 'react';
import { View } from 'react-native';

const openDropdowns = new Map(); // id -> { ref, close }

/** Register an open dropdown. Returns the unregister function. */
export function registerOpenDropdown(id, ref, close) {
  openDropdowns.set(id, { ref, close });
  return () => {
    openDropdowns.delete(id);
  };
}

/** Close every open dropdown that the touch at (pageX, pageY) is outside of. */
export function closeDropdownsOutside(pageX, pageY) {
  openDropdowns.forEach(({ ref, close }) => {
    const node = ref.current;
    if (!node) {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const inside =
        pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height;
      if (!inside) {
        close();
      }
    });
  });
}

/** Wrap a screen tree / popup content; passes every touch to the check. */
export function DropdownDismissArea({ style, children }) {
  return (
    <View
      style={style}
      onTouchStart={e => {
        if (openDropdowns.size) {
          closeDropdownsOutside(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }
      }}
    >
      {children}
    </View>
  );
}

/** For tests. */
export function _openDropdownCount() {
  return openDropdowns.size;
}
