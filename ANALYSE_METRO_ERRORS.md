# 🔍 Analyse - Erreurs Metro Bundler (guardedLoadModule, metroRequire, loadModuleImplementation)

## 📋 Qu'est-ce que ces fonctions ?

Ces fonctions sont **internes à Metro bundler** (le bundler JavaScript de React Native/Expo) :

- **`loadModuleImplementation`** : Charge l'implémentation d'un module
- **`guardedLoadModule`** : Charge un module avec protection contre les erreurs
- **`metroRequire`** : Fonction de chargement de modules de Metro (équivalent à `require()`)

## ⚠️ Quand ces erreurs apparaissent-elles ?

Les erreurs liées à ces fonctions indiquent qu'**un module ne peut pas être chargé correctement** par Metro. Cela peut être causé par :

1. **Import circulaire** entre modules
2. **Module manquant** ou chemin d'import incorrect
3. **Erreur de syntaxe** dans un module
4. **Export manquant** ou incorrect
5. **Cache Metro corrompu**
6. **Problème d'ordre de chargement** des modules
7. **Dépendance manquante** dans `node_modules`
8. **Problème de résolution de module** (extensions `.ts` vs `.tsx`, chemins relatifs)

## 🔍 Diagnostic des erreurs Metro

### Erreur Type 1 : `guardedLoadModule`

**Symptômes :**
```
Error: guardedLoadModule failed
Unable to resolve module ./src/constants/theme
```

**Causes possibles :**
- Module introuvable (chemin incorrect)
- Extension de fichier manquante dans l'import
- Cache Metro corrompu

**Solutions :**
1. Vérifier le chemin d'import
2. Vérifier que le fichier existe
3. Nettoyer le cache Metro

### Erreur Type 2 : `metroRequire`

**Symptômes :**
```
Error: metroRequire is not a function
Cannot find module './App'
```

**Causes possibles :**
- Point d'entrée incorrect dans `package.json` ou `app.json`
- Module d'entrée manquant
- Problème de configuration Metro

**Solutions :**
1. Vérifier `"main"` dans `package.json` et `app.json`
2. Vérifier que le fichier d'entrée existe
3. Vérifier la configuration Metro (si personnalisée)

### Erreur Type 3 : `loadModuleImplementation`

**Symptômes :**
```
Error: loadModuleImplementation failed
ReferenceError: Property 'BORDER_RADIUS' doesn't exist
```

**Causes possibles :**
- Export manquant dans le module
- Import incorrect
- Problème d'ordre de chargement

**Solutions :**
1. Vérifier les exports/imports
2. Vérifier l'ordre des imports
3. Utiliser `denormalize` correctement pour les données Redux

## 🛠️ Solutions complètes

### Solution 1 : Nettoyer complètement le cache Metro

```powershell
# Arrêter tous les processus Node
taskkill /F /IM node.exe

# Nettoyer tous les caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\react-* -ErrorAction SilentlyContinue

# Réinstaller les dépendances (optionnel mais recommandé)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install

# Redémarrer avec cache nettoyé
npx expo start --clear --reset-cache
```

### Solution 2 : Vérifier les imports circulaires

Installez `madge` pour détecter les cycles :

```bash
npm install -g madge
madge --circular src/
```

**Exemple de problème :**
```typescript
// ❌ PROBLÉMATIQUE - Import circulaire
// Fichier A.ts
import { B } from './B';

// Fichier B.ts  
import { A } from './A'; // ← Import circulaire !
```

**Solution :**
- Extraire les types/interfaces dans un fichier séparé
- Utiliser des imports dynamiques (`lazy()`)
- Réorganiser la structure des modules

### Solution 3 : Vérifier la syntaxe TypeScript

```bash
# Vérifier avec TypeScript
npx tsc --noEmit

# Vérifier les erreurs critiques uniquement
npx tsc --noEmit 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 20
```

### Solution 4 : Vérifier les chemins d'import

**Problèmes courants :**

```typescript
// ❌ INCORRECT - Extension manquante (peut causer des problèmes)
import { BORDER_RADIUS } from './theme';

// ✅ CORRECT - Sans extension (recommandé pour TypeScript)
import { BORDER_RADIUS } from './theme';

// ❌ INCORRECT - Chemin relatif erroné
import { BORDER_RADIUS } from '../../constants/theme'; // Si vous êtes déjà dans src/

// ✅ CORRECT - Chemin relatif correct
import { BORDER_RADIUS } from '../constants/theme';
```

### Solution 5 : Vérifier les exports/imports

**Vérifier que tous les exports existent :**

```bash
# Chercher tous les imports de BORDER_RADIUS
grep -r "import.*BORDER_RADIUS" src/

# Vérifier que tous les fichiers qui utilisent BORDER_RADIUS l'importent
grep -r "BORDER_RADIUS\." src/ | grep -v "import"
```

### Solution 6 : Vérifier la configuration Metro

Si vous avez un fichier `metro.config.js`, vérifiez :

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Vérifier les extensions résolues
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'ts',
  'tsx',
];

module.exports = config;
```

## 📊 Chaîne d'imports critique

Voici la chaîne d'imports depuis le point d'entrée :

```
index.ts
  └─> App.tsx
      ├─> ./src/store/store
      │   ├─> ./slices/authSlice
      │   ├─> ./slices/projetSlice
      │   └─> ... (autres slices)
      ├─> ./src/navigation/AppNavigator
      │   ├─> ../screens/* (tous les écrans)
      │   └─> ../constants/theme
      ├─> ./src/services/database
      │   └─> ../types (tous les types)
      ├─> ./src/components/NotificationsManager
      ├─> ./src/contexts/ThemeContext
      │   └─> ./src/constants/theme (BORDER_RADIUS ici)
      └─> ./src/components/ErrorBoundary
          └─> ./src/constants/theme (BORDER_RADIUS ici)
```

## 🔬 Diagnostic approfondi

### Vérifier les logs Metro complets

Les logs Metro devraient indiquer **quel module exact** cause le problème. Cherchez dans les logs :

```
ERROR  Unable to resolve module ./src/constants/theme
ERROR  guardedLoadModule failed
ERROR  metroRequire is not a function
ERROR  loadModuleImplementation failed
```

### Vérifier les dépendances manquantes

```bash
# Vérifier que toutes les dépendances sont installées
npm list --depth=0

# Vérifier les dépendances manquantes
npm audit
```

### Vérifier la configuration du point d'entrée

**Fichiers à vérifier :**

1. **`package.json`** :
```json
{
  "main": "index.ts"
}
```

2. **`app.json`** :
```json
{
  "expo": {
    "main": "index.ts"
  }
}
```

3. **`index.ts`** doit exister et importer `App.tsx` :
```typescript
import './App';
```

4. **`App.tsx`** doit exporter par défaut et enregistrer l'app :
```typescript
export default function App() {
  // ...
}

// Enregistrement
registerRootComponent(App);
if (!AppRegistry.getAppKeys().includes('main')) {
  AppRegistry.registerComponent('main', () => App);
}
```

## ✅ Corrections déjà appliquées

1. ✅ `BORDER_RADIUS` ajouté à `ErrorBoundary.tsx`
2. ✅ Import inutile de `BORDER_RADIUS` retiré de `App.tsx`
3. ✅ Utilisation correcte de `denormalize` dans les composants
4. ✅ Types explicites ajoutés pour éviter les erreurs `any`
5. ✅ Imports manquants ajoutés (`Haptics`, `ViewStyle`, etc.)
6. ✅ Caches nettoyés
7. ✅ Serveur redémarré avec `--clear --reset-cache`

## 🎯 Prochaines étapes si les erreurs persistent

1. **Vérifier les logs Metro** pour identifier le module exact qui cause l'erreur
2. **Vérifier les imports circulaires** avec madge
3. **Vérifier la syntaxe TypeScript** avec `tsc --noEmit`
4. **Réinstaller node_modules** complètement
5. **Vérifier la configuration Metro** (si personnalisée)
6. **Vérifier les versions des dépendances** (conflits possibles)

## 📝 Notes importantes

- **`guardedLoadModule`**, **`metroRequire`** et **`loadModuleImplementation`** sont des fonctions internes de Metro
- Les erreurs liées à ces fonctions indiquent un problème de chargement de module, pas un problème dans votre code directement
- Le problème est généralement résolu en nettoyant le cache ou en corrigeant les imports/exports
- Les erreurs TypeScript peuvent causer des problèmes de chargement de modules même si elles ne sont pas bloquantes au runtime

---

**Dernière mise à jour :** Après correction des erreurs TypeScript critiques

