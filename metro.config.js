const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajouter le polyfill Buffer pour React Native
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
};

// Configuration pour forcer l'utilisation des versions CommonJS
// Fusionner avec les extensions par défaut d'Expo pour éviter les warnings
config.resolver.sourceExts = [
  ...config.resolver.sourceExts, // Inclure les extensions par défaut d'Expo
  'cjs', // Ajouter CommonJS si nécessaire
];

// Utiliser 'main' avant 'browser' pour éviter les redirections vers .mjs
// Le champ "browser" de certains packages redirige vers .mjs (ex: make-plural)
// En priorisant 'main', on force l'utilisation des fichiers .js/.cjs
// Utiliser les champs de résolution par défaut de React Native
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

// Configuration pour ignorer le dossier backend et certains packages problématiques du file watcher Metro
// Le dossier backend/ est un projet séparé (NestJS) et ne doit pas être surveillé par Metro
// IMPORTANT: Ne PAS bloquer node_modules entier dans blockList car Metro en a besoin pour résoudre les modules
// On bloque seulement les packages spécifiques qui causent des erreurs (ex: jsdom, qui n'est pas utilisé en React Native)
config.resolver.blockList = [
  // Bloquer uniquement le dossier backend et ses sous-dossiers de la résolution
  /backend[/\\].*/,
  // Bloquer jsdom du file watcher (causes erreurs lstat, pas utilisé en React Native)
  // Note: Metro pourra toujours résoudre jsdom si nécessaire, mais ne le surveillera pas
  /node_modules[/\\]jsdom[/\\].*/,
  // Bloquer android et ios du file watcher (générés par prebuild, peuvent causer des erreurs ENOENT)
  // Note: Metro pourra toujours résoudre les modules natifs si nécessaire, mais ne surveillera pas ces dossiers
  /android[/\\].*/,
  /ios[/\\].*/,
];

// Configurer le watcher pour ignorer le dossier backend et node_modules
// Metro utilise watchman ou un fallback watcher qui lit tous les fichiers
// Note: watchman.ignore_dirs est obsolète dans les versions récentes de Metro
// On s'appuie sur blockList pour exclure ces dossiers de la résolution
// Le watcher utilisera automatiquement les exclusions via blockList

// Configuration supplémentaire pour le FallbackWatcher (utilisé si Watchman n'est pas disponible)
// Le FallbackWatcher utilise fileMap pour déterminer quels fichiers surveiller
// On configure projectRoot pour limiter la portée de la surveillance
config.projectRoot = __dirname;

// IMPORTANT: watchFolders contrôle ce que Metro surveille pour les changements
// Ne pas le limiter car Metro a besoin de détecter les changements dans tout le projet
// À la place, on s'appuie sur watchman.ignore_dirs (si Watchman est disponible)
// et sur la gestion d'erreurs du FallbackWatcher
// La résolution des modules fonctionne indépendamment via blockList

// Configuration pour le serveur Metro
if (!config.server) {
  config.server = {};
}

// Gestion des erreurs du FallbackWatcher pour ignorer les erreurs lstat/watch sur node_modules et android
// Cette configuration permet à Metro de continuer même si certains fichiers/dossiers
// causent des erreurs (ex: fichiers manquants, chemins trop longs sur Windows, dossiers supprimés)
// Intercepter les événements d'erreur du processus pour ignorer les erreurs UNKNOWN lstat et ENOENT watch
if (typeof process !== 'undefined' && process.emit) {
  const originalEmit = process.emit;
  process.emit = function (event, ...args) {
    // Ignorer les erreurs UNKNOWN lstat sur node_modules/jsdom
    if (event === 'error' && args[0] && args[0].code === 'UNKNOWN' && args[0].syscall === 'lstat') {
      const errorPath = args[0].path || '';
      if (errorPath.includes('node_modules') || errorPath.includes('jsdom')) {
        // Ignorer silencieusement ces erreurs spécifiques
        return false;
      }
    }
    // Ignorer les erreurs ENOENT (fichier/dossier non trouvé) lors du watch
    // Cela peut arriver si un dossier est supprimé ou renommé pendant que Metro le surveille
    if (event === 'error' && args[0] && args[0].code === 'ENOENT' && args[0].syscall === 'watch') {
      const errorPath = args[0].path || '';
      // Ignorer les erreurs ENOENT sur android (dossiers générés par prebuild qui peuvent être supprimés)
      if (errorPath.includes('android') || errorPath.includes('ios')) {
        // Ignorer silencieusement ces erreurs - Metro continuera à fonctionner
        return false;
      }
    }
    return originalEmit.apply(this, [event, ...args]);
  };
}

module.exports = config;
