# Correction de l'erreur "Cyclic dependency, node was: telephone"

## 🔍 Problème

Erreur Metro Bundler :
```
ERROR [runtime not ready]: Error: Cyclic dependency, node was:"telephone"
WARN [Worklets] Mismatch between C++ code version and JavaScript code version (0.5.2 vs. 0.5.1 respectively).
```

## ✅ Solutions

### Solution 1 : Nettoyer le cache Metro (RECOMMANDÉ)

L'erreur de dépendance circulaire avec "telephone" est souvent causée par un cache Metro corrompu, pas par un vrai cycle dans le code.

**Étapes :**

1. **Arrêter Metro Bundler** (si actif) : `Ctrl+C`

2. **Nettoyer le cache et redémarrer :**
   ```bash
   npx expo start -c
   ```
   
   Ou :
   ```bash
   npm start -- --reset-cache
   ```

3. **Si le problème persiste, nettoyer manuellement :**
   ```bash
   # Supprimer le cache Metro
   rm -rf node_modules/.cache
   rm -rf .expo
   
   # Redémarrer
   npx expo start -c
   ```

### Solution 2 : Vérifier les imports circulaires

Bien que le code semble correct, vérifiez s'il y a des imports circulaires :

**Fichiers à vérifier :**
- `src/types/auth.ts` → importe `roles.ts`
- `src/types/roles.ts` → ne doit PAS importer `auth.ts`
- `src/types/collaboration.ts` → utilise `telephone` mais ne devrait pas créer de cycle

**Vérification rapide :**
```bash
# Installer madge (outil de détection de cycles)
npm install -g madge

# Vérifier les cycles
madge --circular src/
```

### Solution 3 : Mettre à jour react-native-worklets (Warning séparé)

Le warning sur Worklets indique une version mismatch :

```bash
npm install react-native-worklets@latest
cd ios && pod install && cd ..  # Si iOS
```

Ou vérifier la version installée :
```bash
npm list react-native-worklets
```

## 🔍 Analyse du code

**Fichiers qui utilisent `telephone` :**
- `src/types/auth.ts` : `telephone?: string;` dans `User` interface
- `src/types/collaboration.ts` : `telephone?: string;` dans `Collaborateur` interface
- `src/database/schemas/core/users.schema.ts` : colonne `telephone` dans la table
- `src/database/repositories/UserRepository.ts` : méthode `findByTelephone()`

**Pas d'import circulaire détecté :**
- Les types importent d'autres types mais pas de cycles directs
- Les repositories importent les types mais pas l'inverse

## 💡 Cause probable

**Cache Metro corrompu** : Metro Bundler peut parfois créer des références circulaires dans son cache interne, même si le code source n'a pas de vrais cycles.

## 📝 Actions recommandées

1. ✅ **Nettoyer le cache Metro** (`npx expo start -c`)
2. ✅ **Redémarrer Metro**
3. ✅ **Tester l'application**
4. ⚠️ Si le problème persiste, vérifier avec `madge` pour détecter d'éventuels cycles

## 🚫 Ce qui ne devrait PAS être fait

- ❌ Ne pas modifier les types pour "casser" le cycle (il n'y en a probablement pas de réel)
- ❌ Ne pas supprimer le champ `telephone` (c'est une fonctionnalité importante)
- ❌ Ne pas ignorer l'erreur si elle persiste après nettoyage du cache

## 📊 Vérification post-fix

Après avoir nettoyé le cache :

1. Vérifier que Metro démarre sans erreur
2. Vérifier que l'app se charge correctement
3. Tester une fonctionnalité qui utilise `telephone` (ex: connexion par téléphone)
4. Vérifier les logs pour s'assurer qu'il n'y a plus d'erreur "Cyclic dependency"

