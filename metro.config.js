const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour Chart Kit et autres polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-svg': require.resolve('react-native-svg'),
};

module.exports = config;