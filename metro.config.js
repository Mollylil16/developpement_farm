const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajouter le polyfill Buffer pour React Native
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
};

// Configuration pour forcer l'utilisation des versions CommonJS
config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'jsx', 'cjs'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;

