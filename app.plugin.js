const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Plugin Expo pour résoudre les conflits de dépendances AndroidX
 * Force l'exclusion des anciennes bibliothèques de support Android
 */
module.exports = function withAndroidXFix(config) {
  return withGradleProperties(config, (config) => {
    // S'assurer que Jetifier est activé pour migrer automatiquement vers AndroidX
    config.modResults = config.modResults || [];
    
    // Vérifier si les propriétés existent déjà
    const hasAndroidX = config.modResults.some(
      (item) => item.key === 'android.useAndroidX'
    );
    const hasJetifier = config.modResults.some(
      (item) => item.key === 'android.enableJetifier'
    );

    if (!hasAndroidX) {
      config.modResults.push({
        type: 'property',
        key: 'android.useAndroidX',
        value: 'true',
      });
    }

    if (!hasJetifier) {
      config.modResults.push({
        type: 'property',
        key: 'android.enableJetifier',
        value: 'true',
      });
    }

    return config;
  });
};

