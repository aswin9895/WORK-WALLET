const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {sourceExts} = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * .scss / .css files are compiled to React Native style objects by
 * ./scss-transformer.js
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('./scss-transformer.js'),
  },
  resolver: {
    sourceExts: [...sourceExts, 'scss', 'css'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
