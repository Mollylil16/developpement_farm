# Gestion des Dépendances

## 📋 Vue d'ensemble

Ce document décrit la stratégie de gestion des dépendances pour Fermier Pro, incluant les processus de mise à jour, de vérification de sécurité et de maintenance.

## 🎯 Objectifs

- **Sécurité** : Détecter et corriger les vulnérabilités rapidement
- **Stabilité** : Maintenir des versions stables et testées
- **Maintenance** : Automatiser les mises à jour quand c'est possible
- **Traçabilité** : Documenter les changements de dépendances

## 📦 État actuel

- **Total de dépendances** : 73 (production + développement)
- **Lock file** : `package-lock.json` présent ✅
- **Vulnérabilités** : Aucune détectée actuellement ✅

## 🔧 Scripts disponibles

### Vérification

```bash
# Audit de sécurité complet
npm run deps:audit

# Audit avec niveau minimum (moderate et supérieur)
npm run deps:security

# Vérifier les dépendances obsolètes
npm run deps:outdated

# Vérification complète (audit + outdated)
npm run deps:check

# Script de vérification détaillée
node scripts/check-dependencies.js
```

### Mise à jour

```bash
# Corriger automatiquement les vulnérabilités
npm run deps:audit:fix

# Mettre à jour les dépendances (dans les limites des versions spécifiées)
npm run deps:update
```

## 🤖 Dependabot

### Configuration

Dependabot est configuré dans `.github/dependabot.yml` pour :

- **Mises à jour hebdomadaires** : Tous les lundis à 9h
- **Limite de PRs** : 10 PRs ouvertes simultanément
- **Groupement** : Dépendances groupées par écosystème (expo, react-native, testing, linting)
- **Ignorer les majeures** : Les mises à jour majeures nécessitent une revue manuelle

### Comportement

1. **Mises à jour mineures et patch** : Création automatique de PRs
2. **Mises à jour majeures** : Ignorées automatiquement (nécessitent une décision manuelle)
3. **Groupement** : Les dépendances similaires sont groupées dans une seule PR

### Labels

Les PRs Dependabot sont automatiquement étiquetées :
- `dependencies`
- `npm` (ou `github-actions`)
- `admin-web` (pour les dépendances du dossier admin-web)

## 🔒 Stratégie de sécurité

### Audit régulier

1. **Quotidien** : Vérification automatique via CI/CD
2. **Hebdomadaire** : Revue manuelle des PRs Dependabot
3. **Mensuel** : Audit complet avec `npm audit`

### Niveaux de sévérité

- **Critical** : Correction immédiate requise
- **High** : Correction dans les 24h
- **Moderate** : Correction dans la semaine
- **Low** : Correction lors de la prochaine mise à jour planifiée

### Processus de correction

1. **Détection** : Via `npm audit` ou Dependabot
2. **Évaluation** : Analyser l'impact de la vulnérabilité
3. **Correction** : 
   - `npm audit fix` pour les corrections automatiques
   - Mise à jour manuelle si nécessaire
4. **Test** : Vérifier que l'application fonctionne toujours
5. **Déploiement** : Déployer la correction rapidement

## 📊 Gestion des versions

### Stratégie de versioning

- **Patch (^1.2.3)** : Acceptées automatiquement
- **Minor (^1.2.3)** : Acceptées automatiquement après tests
- **Major (^1.2.3)** : Nécessitent une revue manuelle et des tests approfondis

### Dépendances critiques

Ces dépendances nécessitent une attention particulière lors des mises à jour :

- `react` / `react-native` : Tests approfondis requis
- `expo` : Vérifier la compatibilité avec les autres packages Expo
- `@reduxjs/toolkit` : Vérifier les breaking changes
- `expo-sqlite` : Tests de migration de base de données

## 🧹 Nettoyage

### Dépendances non utilisées

Pour identifier les dépendances non utilisées :

```bash
# Installer depcheck globalement
npm install -g depcheck

# Vérifier les dépendances non utilisées
depcheck
```

### Suppression

1. Identifier les dépendances non utilisées
2. Vérifier qu'elles ne sont pas utilisées indirectement
3. Supprimer avec `npm uninstall <package>`
4. Mettre à jour le lock file

## 📝 Checklist de mise à jour

Avant de mettre à jour une dépendance majeure :

- [ ] Lire les release notes
- [ ] Vérifier les breaking changes
- [ ] Tester localement
- [ ] Vérifier les tests unitaires
- [ ] Vérifier les tests d'intégration
- [ ] Tester sur iOS
- [ ] Tester sur Android
- [ ] Documenter les changements nécessaires
- [ ] Mettre à jour la documentation

## 🚨 Procédure d'urgence

En cas de vulnérabilité critique :

1. **Évaluer** : Analyser l'impact et la criticité
2. **Corriger** : Appliquer le correctif immédiatement
3. **Tester** : Tests rapides mais complets
4. **Déployer** : Déploiement d'urgence si nécessaire
5. **Communiquer** : Informer l'équipe des changements

## 📈 Métriques

### Suivi

- Nombre de vulnérabilités détectées
- Temps moyen de correction
- Taux de mises à jour automatiques
- Nombre de dépendances obsolètes

### Objectifs

- **0 vulnérabilité critique** : Objectif permanent
- **< 7 jours** : Temps moyen de correction des vulnérabilités high
- **> 80%** : Taux de mises à jour automatiques

## 🔗 Ressources

- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)
- [npm outdated documentation](https://docs.npmjs.com/cli/v8/commands/npm-outdated)
- [depcheck](https://github.com/depcheck/depcheck)

