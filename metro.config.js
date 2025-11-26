const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajouter le polyfill Buffer pour React Native
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
};

// Configuration pour forcer l'utilisation des versions CommonJS
config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'jsx', 'cjs'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Supprimer les warnings des packages avec exports invalides
// Force la résolution basée sur les fichiers au lieu des exports package.json
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

