const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajouter le polyfill Buffer pour React Native
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
};

// Configuration pour forcer l'utilisation des versions CommonJS
// Ajouter 'cjs' aux extensions par défaut d'Expo
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
// Utiliser 'main' avant 'browser' pour éviter les redirections vers .mjs
// Le champ "browser" de certains packages redirige vers .mjs (ex: make-plural)
// En priorisant 'main', on force l'utilisation des fichiers .js/.cjs
config.resolver.resolverMainFields = ['react-native', 'main'];

// Configuration pour supprimer les warnings des packages Redux avec exports invalides
// (@reduxjs/toolkit, redux, reselect, etc.)

// 1. Désactiver la résolution via le champ "exports" dans package.json
// Les packages Redux définissent des exports (.mjs) qui n'existent pas
// Cette option force Metro à ignorer ces exports et utiliser les chemins classiques
config.resolver.unstable_enablePackageExports = false;

// 2. Garder la recherche hiérarchique active (comportement standard)
// false = NE PAS désactiver = recherche hiérarchique ACTIVE
// Cela permet à Metro de chercher les modules dans node_modules des dossiers parents
// Cette option n'affecte PAS les warnings exports, mais on la définit explicitement
// pour éviter toute ambiguïté et ne pas dépendre de la valeur par défaut de Metro
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
