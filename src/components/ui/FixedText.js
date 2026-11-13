import React from 'react';
import { Text } from 'react-native';

/**
 * Text that keeps the designed size and ignores the phone's font-size
 * setting (owner's decision for redesigned screens, so they match the
 * mockups exactly). Use it instead of <Text> on redesigned screens.
 */
export default function FixedText(props) {
  return <Text allowFontScaling={false} {...props} />;
}
