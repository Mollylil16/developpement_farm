# 📌 Versions Critiques - Fermier Pro

**⚠️ ATTENTION : Ces versions sont testées et stables. Ne pas modifier sans validation complète.**

## 🎯 Versions Critiques

### React & React Native
- **React:** `18.2.0` (exact, pas de `^`)
- **React Native:** `0.74.5` (exact, pas de `^`)
- **⚠️ React 19.x est INCOMPATIBLE avec React Native 0.74.5**

### Expo SDK
- **Expo SDK:** `~51.0.32` (SDK 51 stable)
- **⚠️ Expo SDK 54 est en BETA et incompatible avec React 18.2.0**

### Node.js
- **Version minimale:** `18.17.0`
- **Version recommandée:** `18.17.0` (fixée dans `.nvmrc`)
- **⚠️ Node 20+ peut causer des problèmes avec certaines dépendances**

### React Native Reanimated
- **Version:** `~3.10.1`
- **⚠️ Reanimated 4.x nécessite react-native-worklets qui n'est pas compatible avec RN 0.74.5**

### React Navigation
- **Version:** `^6.x` (v6 compatible avec RN 0.74)
- **⚠️ React Navigation v7 nécessite React Native 0.76+**

## 🔒 Pourquoi ces versions ?

### React 18.2.0
- Compatible avec React Native 0.74.5
- Stable et testé en production
- React 19.x introduit des breaking changes majeurs

### React Native 0.74.5
- Version stable LTS
- Compatible avec Expo SDK 51
- Support complet de toutes les dépendances

### Expo SDK 51
- Version stable (non-beta)
- Compatible avec React 18.2.0
- Toutes les dépendances Expo alignées

### Node 18.17.0
- Version LTS stable
- Compatible avec toutes les dépendances natives
- Évite les problèmes de compatibilité avec les modules natifs

## ⚠️ Règles d'Or

1. **NE JAMAIS faire `npm update` sans tester**
   - Les mises à jour peuvent casser la compatibilité
   - Toujours tester sur un environnement de dev d'abord

2. **NE JAMAIS faire `npm audit fix --force`**
   - Peut mettre à jour des versions critiques
   - Utiliser `npm audit fix` (sans --force) et vérifier les changements

3. **Toujours sauvegarder avant une mise à jour**
   ```bash
   npm run save-stable
   ```

4. **En cas de problème après mise à jour**
   ```bash
   npm run restore-stable
   ```

## 📋 Checklist avant mise à jour

- [ ] Sauvegarder la version stable : `npm run save-stable`
- [ ] Créer une branche Git pour tester
- [ ] Lire les changelogs des packages à mettre à jour
- [ ] Tester sur un environnement de développement
- [ ] Vérifier que l'app compile sans erreur
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier les performances
- [ ] Si tout est OK, commit les changements

## 🔄 Système de Protection

### Sauvegarder la version stable
```bash
npm run save-stable
```
Crée une copie de `package.json` dans `package.json.stable`

### Restaurer la version stable
```bash
npm run restore-stable
```
Restaure `package.json.stable` et réinstalle les dépendances

## 📚 Documentation

- **package.json.stable** : Version de référence qui fonctionne
- **.nvmrc** : Version de Node.js fixée
- **VERSIONS.md** : Ce fichier - Documentation des versions critiques

## 🆘 En cas de problème

1. **L'app crash après une mise à jour**
   ```bash
   npm run restore-stable
   ```

2. **Erreurs de compilation**
   - Vérifier que Node.js est en version 18.17.0 : `node --version`
   - Si besoin, utiliser nvm : `nvm use`

3. **Conflits de dépendances**
   - Vérifier `package.json.stable` pour les versions qui fonctionnaient
   - Restaurer si nécessaire

4. **Problèmes avec React Native**
   - Vérifier que React est en 18.2.0 (pas 19.x)
   - Vérifier que React Native est en 0.74.5

---

**Dernière mise à jour :** 2026-01-02  
**Version stable documentée :** 1.0.0
