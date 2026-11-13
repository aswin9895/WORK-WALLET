module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // "@/..." = "src/..." (also used by Jest through Babel)
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
        extensions: ['.js', '.json', '.scss', '.css'],
      },
    ],
    // Required by react-native-reanimated (used by react-native-keyboard-controller).
    // Must stay the LAST plugin.
    'react-native-worklets/plugin',
  ],
};
