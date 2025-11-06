module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-reanimated/plugin', {
        // Désactive le warning "Reduced Motion" en développement
        // Les animations fonctionneront toujours normalement
      }],
    ],
  };
};

