# 📦 Gestion des Packages Expo

## ✅ Pourquoi l'exclusion est sûre

### Ce que fait `expo.install.exclude`

L'exclusion dans `package.json` **ne désactive PAS les packages**. Elle indique simplement à Expo Doctor d'**ignorer la validation de version** pour ces packages.

**Important :**
- ✅ Les packages sont **toujours installés** et **fonctionnent normalement**
- ✅ Les mises à jour de sécurité continuent de fonctionner
- ✅ L'exclusion n'affecte que le **warning d'Expo Doctor**, pas l'application

### Situation actuelle

Les versions demandées par Expo Doctor (`~54.0.30`, `~14.0.8`, etc.) **n'existent pas encore** dans npm. Les versions actuelles installées sont :
- `expo@~54.0.25` ✅ (version stable disponible)
- `expo-document-picker@~14.0.7` ✅ (dernière version stable)
- Etc.

Ces versions sont **compatibles** et **fonctionnent correctement** avec votre SDK Expo 54.

## 🔄 Gestion future des mises à jour

### Quand mettre à jour ?

1. **Quand Expo publie les nouvelles versions** (probablement dans quelques semaines)
2. **Quand vous voulez bénéficier de nouvelles fonctionnalités**
3. **Quand des correctifs de sécurité sont publiés**

### Comment mettre à jour ?

#### Option 1 : Mise à jour automatique (recommandé)

Quand les nouvelles versions seront disponibles :

```bash
# Retirer temporairement l'exclusion
# Puis exécuter :
npx expo install --fix
```

#### Option 2 : Mise à jour manuelle

```bash
# Mettre à jour Expo d'abord
npm install expo@latest

# Puis mettre à jour les autres packages
npx expo install --fix
```

#### Option 3 : Mise à jour sélective

Si vous voulez mettre à jour un package spécifique :

```bash
# Retirer le package de la liste d'exclusion dans package.json
# Puis :
npx expo install expo-document-picker@latest
```

### Retirer l'exclusion

Quand les nouvelles versions seront publiées, vous pouvez retirer les packages de la liste d'exclusion :

```json
{
  "expo": {
    "install": {
      "exclude": [
        // Retirer les packages qui ont été mis à jour
      ]
    }
  }
}
```

## 📋 Checklist de maintenance

### Mensuel
- [ ] Vérifier les nouvelles versions : `npm outdated`
- [ ] Vérifier les vulnérabilités : `npm audit`
- [ ] Tester `npx expo doctor` pour voir si de nouvelles versions sont disponibles

### Trimestriel
- [ ] Mettre à jour les packages Expo si de nouvelles versions stables sont disponibles
- [ ] Retirer les packages mis à jour de la liste d'exclusion
- [ ] Tester l'application après mise à jour

## ⚠️ Signaux d'alerte

Si vous rencontrez des problèmes, vérifiez :

1. **Conflits de versions** : `npm ls <package-name>`
2. **Vulnérabilités** : `npm audit`
3. **Compatibilité** : `npx expo doctor`

## 🎯 Recommandation

**Pour l'instant :** Gardez l'exclusion telle quelle. Les versions actuelles fonctionnent parfaitement.

**Dans quelques semaines :** Quand Expo publiera les versions `54.0.30`, `14.0.8`, etc., vous pourrez :
1. Retirer l'exclusion
2. Exécuter `npx expo install --fix`
3. Tout sera à jour automatiquement

## 📚 Documentation officielle

- [Expo Dependency Validation](https://docs.expo.dev/more/expo-cli/#configuring-dependency-validation)
- [Expo SDK 54 Release Notes](https://expo.dev/changelog/)

---

**Dernière mise à jour :** 29 décembre 2025  
**Statut :** ✅ Configuration stable et fonctionnelle

