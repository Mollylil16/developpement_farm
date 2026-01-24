module.exports = function (api) {
  api.cache(true);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Supprimer console.log en production (garder error et warn)
      ...(isProduction ? [
        ['transform-remove-console', { exclude: ['error', 'warn'] }]
      ] : []),
      // react-native-reanimated/plugin DOIT être en dernier
      'react-native-reanimated/plugin',
    ],
  };
};
