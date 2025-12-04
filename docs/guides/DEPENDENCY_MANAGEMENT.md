# 📦 Gestion des Dépendances

Guide complet pour la gestion des dépendances dans le projet.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Vérification des dépendances](#vérification-des-dépendances)
3. [Mises à jour automatiques](#mises-à-jour-automatiques)
4. [Gestion des vulnérabilités](#gestion-des-vulnérabilités)
5. [Bonnes pratiques](#bonnes-pratiques)

---

## Introduction

Le projet utilise **npm** comme gestionnaire de paquets avec :
- ✅ **package-lock.json** : Lock file pour garantir la reproductibilité
- ✅ **Dependabot** : Mises à jour automatiques via GitHub
- ✅ **Renovate** : Alternative à Dependabot (optionnel)
- ✅ **Scripts npm** : Commandes pour vérifier et mettre à jour

### Statistiques

- **73 dépendances** dans `package.json`
- **Lock file** : `package-lock.json` présent
- **Audit automatique** : Configuré via Dependabot

---

## Vérification des dépendances

### Scripts disponibles

```bash
# Vérification complète (recommandé)
npm run deps:check

# Audit de sécurité uniquement
npm run deps:audit

# Vérifier les mises à jour disponibles
npm run deps:outdated

# Audit de sécurité (niveau modéré et supérieur)
npm run deps:security
```

### Vérification complète

Le script `deps:check` vérifie :
1. ✅ Présence et fraîcheur du lock file
2. ✅ Vulnérabilités de sécurité
3. ✅ Packages obsolètes
4. ✅ Dépendances dupliquées

```bash
npm run deps:check
```

**Sortie attendue :**
```
🔍 Vérification des dépendances
============================================================
🔒 Vérification du lock file
✅ package-lock.json trouvé
✅ Lock file récent (5 jours)

============================================================
🔍 Audit de sécurité
✅ Aucune vulnérabilité trouvée

============================================================
📦 Vérification des mises à jour disponibles
✅ Toutes les dépendances sont à jour

✅ Toutes les vérifications sont passées
```

---

## Mises à jour automatiques

### Dependabot (GitHub)

Dependabot est configuré dans `.github/dependabot.yml` :

- **Fréquence** : Hebdomadaire (chaque lundi à 9h)
- **Groupement** : Packages similaires groupés (Expo, React Navigation, etc.)
- **Limite** : Maximum 10 PR ouvertes simultanément
- **Auto-merge** : Désactivé (revue manuelle requise)

#### Configuration

```yaml
# .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
```

#### Groupement des mises à jour

Les mises à jour sont groupées par catégorie :
- **Expo packages** : `expo*`, `@expo/*`
- **React Navigation** : `@react-navigation/*`
- **React Native** : `react-native*`, `@react-native*`

Cela réduit le nombre de PR et facilite la revue.

### Renovate (Alternative)

Renovate est configuré dans `renovate.json` :

- **Auto-merge** : Activé pour les patches et les mises à jour de sécurité
- **Semantic commits** : Activé
- **Schedule** : Avant 10h le lundi

Pour activer Renovate, ajoutez l'app Renovate à votre repository GitHub.

---

## Gestion des vulnérabilités

### Audit de sécurité

```bash
# Audit complet
npm audit

# Audit avec niveau minimum
npm audit --audit-level=moderate

# Corriger automatiquement
npm audit fix

# Corriger avec force (peut casser des choses)
npm audit fix --force
```

### Niveaux de vulnérabilité

1. **Critical** 🔴 : Correction immédiate requise
2. **High** 🟠 : Correction dans les 24h
3. **Moderate** 🟡 : Correction dans la semaine
4. **Low** 🔵 : Correction dans le mois
5. **Info** ⚪ : Information seulement

### Processus de correction

1. **Identifier** : `npm audit`
2. **Corriger automatiquement** : `npm audit fix`
3. **Vérifier** : `npm audit` à nouveau
4. **Tester** : `npm test`
5. **Commit** : Si tout fonctionne

### Cas spéciaux

Si `npm audit fix` ne peut pas corriger automatiquement :

1. Vérifier les détails : `npm audit --json`
2. Mettre à jour manuellement la dépendance problématique
3. Vérifier les breaking changes dans le changelog
4. Tester exhaustivement

---

## Bonnes pratiques

### ✅ À faire

1. **Vérifier régulièrement**
   ```bash
   npm run deps:check
   ```

2. **Mettre à jour le lock file**
   ```bash
   npm install
   ```

3. **Revue des PR Dependabot**
   - Vérifier les changelogs
   - Tester localement
   - Valider les breaking changes

4. **Grouper les mises à jour**
   - Mettre à jour les packages liés ensemble
   - Ex: Tous les packages Expo en même temps

5. **Tester après mise à jour**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

### ❌ À éviter

1. **Ne pas ignorer les vulnérabilités**
   - Même les "low" peuvent être exploitées
   - Prioriser selon le contexte

2. **Ne pas supprimer le lock file**
   - Le lock file garantit la reproductibilité
   - Toujours commiter `package-lock.json`

3. **Ne pas auto-merge les mises à jour majeures**
   - Risque de breaking changes
   - Toujours revoir manuellement

4. **Ne pas mettre à jour tout d'un coup**
   - Mettre à jour par groupe logique
   - Tester entre chaque groupe

---

## Workflow recommandé

### Hebdomadaire

1. Vérifier les PR Dependabot
2. Tester et merger les patches
3. Revoyer les mises à jour mineures

### Mensuel

1. Exécuter `npm run deps:check`
2. Mettre à jour les packages obsolètes
3. Vérifier les breaking changes

### Trimestriel

1. Revoyer les mises à jour majeures
2. Mettre à jour les dépendances critiques
3. Nettoyer les dépendances inutilisées

---

## Dépannage

### Problème : Lock file désynchronisé

```bash
# Supprimer et régénérer
rm package-lock.json
npm install
```

### Problème : Conflits de dépendances

```bash
# Vérifier les dépendances dupliquées
npm ls --depth=0

# Résoudre manuellement si nécessaire
```

### Problème : Vulnérabilité non corrigeable

1. Vérifier si une mise à jour est disponible
2. Consulter les advisories npm
3. Chercher des alternatives si nécessaire
4. Documenter la décision

---

## Références

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Renovate](https://docs.renovatebot.com/)
- [npm outdated](https://docs.npmjs.com/cli/v8/commands/npm-outdated)

