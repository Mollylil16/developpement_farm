# Explication sur les Animations et le Warning "Reduced Motion"

## ⚠️ Warning "Reduced Motion"

### Ce que signifie le warning
Le warning apparaît parce que votre appareil a activé le paramètre d'accessibilité **"Réduction des mouvements"** (Reduced Motion) dans les paramètres système.

### Pourquoi ce warning apparaît ?
- `react-native-reanimated` est installé dans votre projet (utilisé par React Navigation pour certaines animations)
- Reanimated détecte automatiquement ce paramètre système
- C'est un **avertissement informatif**, pas une erreur

### Impact sur votre application
- **Les animations de votre app fonctionnent normalement** car vous utilisez `Animated` de React Native (pas Reanimated directement)
- Le warning n'affecte que les animations gérées par Reanimated (principalement les transitions de navigation)
- En production, ce warning n'apparaît pas

## ✅ Solution : Forcer les animations (si nécessaire)

Si vous voulez que les animations fonctionnent même avec "Reduced Motion" activé, vous pouvez configurer Reanimated pour ignorer ce paramètre.

### Option 1 : Configurer dans babel.config.js (Recommandé)

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-reanimated/plugin', {
        disableReducedMotionWarning: true, // Désactive le warning
      }],
    ],
  };
};
```

### Option 2 : Utiliser useReducedMotion dans le code

Si vous utilisez Reanimated directement, vous pouvez forcer les animations :

```javascript
import { useReducedMotion } from 'react-native-reanimated';

// Dans votre composant
const reducedMotion = useReducedMotion();
// Utiliser !reducedMotion pour forcer les animations
```

## 📝 Note importante

**Les animations de votre application fonctionnent déjà !** Le warning concerne uniquement les animations gérées par Reanimated (transitions de navigation). Vos animations personnalisées avec `Animated` de React Native ne sont pas affectées.

