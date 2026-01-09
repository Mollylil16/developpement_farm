# 🐷 Fermier Pro

Application mobile de gestion d'élevage porcin pour l'Afrique de l'Ouest.

**Status:** ✅ Production Ready - Refactoring complet + Système OPEX/CAPEX  
**Version:** 1.0.0  
**Dernière mise à jour:** 21 Novembre 2025

👉 **Documentation complète:** [DOCUMENTATION.md](./DOCUMENTATION.md)  
💰 **Nouveau:** [Système OPEX/CAPEX](./README_OPEX_CAPEX.md)

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Lancer l'application
npm start

# Lancer sur Android/iOS
npm run android
npm run ios
```

## 📚 Documentation

### 📖 Guides Principaux
- **[DOCUMENTATION.md](DOCUMENTATION.md)** 📚 **Index complet de la documentation**
- **[README_OPEX_CAPEX.md](README_OPEX_CAPEX.md)** 💰 **Système OPEX/CAPEX (Nouveau !)**
- **[docs/CONTEXT.md](docs/CONTEXT.md)** ⭐ **Architecture globale**

### 💰 Système OPEX/CAPEX
Gestion financière avancée avec classification automatique et calcul de marges.

📁 **Documentation:** [docs/opex-capex/](docs/opex-capex/)
- Status complet et statistiques
- Guide d'intégration pratique
- Migration database (⚠️ OBLIGATOIRE)
- Tests manuels fonctionnels

### 📂 Archives
Historique complet du développement (phases 1-6, refactoring, corrections).

📁 **Documentation:** [docs/archive/](docs/archive/)

## 🧪 Qualité du Code

```bash
# Vérification complète
npm run validate

# Lint & correction auto
npm run lint:fix

# Vérification des types
npm run type-check

# Tests
npm test
npm run test:watch
npm run test:coverage
```

## 🏗️ Architecture

```
src/
├── components/      # Composants UI
├── screens/         # Écrans principaux
├── store/           # Redux (slices, selectors)
├── services/        # Database, PDF, Notifications
├── types/           # Types TypeScript
└── utils/           # Fonctions utilitaires
```

## 🔧 Stack Technique

- **Framework:** React Native 0.74.5 + Expo SDK 51
- **React:** 18.2.0
- **Langage:** TypeScript 5.3.3
- **State:** Redux Toolkit (normalized)
- **Database:** SQLite
- **Navigation:** React Navigation 6
- **Tests:** Jest + React Testing Library
- **Node.js:** 18.17.0 (voir `.nvmrc`)

## 📊 Modules

1. **Production** - Gestion du cheptel
2. **Reproduction** - Gestations et saillies
3. **Finance** - Revenus et dépenses
4. **Nutrition** - Aliments et stocks
5. **Santé** - Vétérinaire et traitements
6. **Planning** - Simulation de production

## ⚙️ Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm start` | Lancer Expo |
| `npm run android` | Lancer sur Android |
| `npm run ios` | Lancer sur iOS |
| `npm test` | Lancer les tests |
| `npm run validate` | Lint + Type-check + Tests |
| `npm run lint:fix` | Corriger le code automatiquement |
| `npm run format` | Formater avec Prettier |

## 🎯 Pour Commencer

### Développeurs
1. Lire [docs/CONTEXT.md](docs/CONTEXT.md)
2. Configurer l'environnement de développement
3. Lancer `npm run validate` pour vérifier la configuration

### Agents IA
1. Lire [llms.txt](llms.txt) pour le contexte rapide
2. Consulter [docs/CONTEXT.md](docs/CONTEXT.md) pour les détails
3. Respecter les conventions et limites (max 500 lignes/fichier)

## 📝 Conventions

- **Composants:** PascalCase, default export
- **Hooks:** camelCase avec préfixe `use`
- **État Redux:** Toujours utiliser les selectors
- **Dates:** Format ISO `yyyy-MM-dd`
- **Devise:** CFA

## ⚠️ Important

- ⚠️ État Redux **normalisé** - utiliser les selectors
- ⚠️ `database.ts` est trop grand (7500 lignes) - refactoring en cours
- ⚠️ Toujours tester sur device/émulateur
- ⚠️ Respecter les règles métier (gestation = 114 jours, etc.)

## 🆘 Troubleshooting

### L'app crash après une mise à jour de dépendances

**Solution immédiate :**
```bash
npm run restore-stable
```

Cela restaure la version stable de `package.json` et réinstalle les dépendances.

### Règles d'Or pour les Mises à Jour

⚠️ **NE JAMAIS faire ces commandes sans précaution :**

1. **`npm update`** - Peut casser la compatibilité
   - ✅ **À faire :** Toujours tester sur un environnement de dev d'abord
   - ✅ **Avant :** `npm run save-stable` pour sauvegarder la version qui marche

2. **`npm audit fix --force`** - ⚠️ **INTERDIT**
   - Peut mettre à jour des versions critiques (React, React Native, etc.)
   - ✅ **À faire :** Utiliser `npm audit fix` (sans --force) et vérifier les changements
   - ✅ **Alternative :** Corriger manuellement les vulnérabilités critiques uniquement

3. **Mise à jour manuelle de versions critiques**
   - ⚠️ Ne jamais mettre à jour React, React Native, ou Expo SDK sans validation
   - ✅ Consulter [VERSIONS.md](./VERSIONS.md) pour les versions testées

### Vérifier la Version de Node.js

```bash
node --version
```

**Version requise :** `18.17.0` (fixée dans `.nvmrc`)

Si vous utilisez `nvm` :
```bash
nvm use
```

### Problèmes de Compilation

1. **Erreurs liées à React/React Native**
   - Vérifier que React est en `18.2.0` (pas 19.x)
   - Vérifier que React Native est en `0.74.5`
   - Vérifier `package.json.stable` pour les versions qui fonctionnaient

2. **Erreurs liées à Expo**
   - Vérifier que Expo SDK est en `~51.0.32` (pas 54 beta)
   - Vérifier que toutes les dépendances Expo sont alignées sur SDK 51

3. **Erreurs de modules natifs**
   - Vérifier que Node.js est en version 18.17.0
   - Nettoyer et réinstaller : `rm -rf node_modules && npm install`

### Système de Protection des Versions

**Sauvegarder la version stable :**
```bash
npm run save-stable
```
Crée une copie de `package.json` dans `package.json.stable`

**Restaurer la version stable :**
```bash
npm run restore-stable
```
Restaure `package.json.stable` et réinstalle les dépendances

📚 **Documentation complète :** [VERSIONS.md](./VERSIONS.md)

## 🤝 Contribution

1. Créer une branche depuis `main`
2. Faire les modifications
3. Lancer `npm run validate`
4. Créer une Pull Request

## 📞 Support

- **Documentation:** [docs/CONTEXT.md](docs/CONTEXT.md)
- **Tests:** [docs/archive/README_TESTS.md](docs/archive/README_TESTS.md)
- **Qualité:** [docs/archive/QUALITE_CODE.md](docs/archive/QUALITE_CODE.md)

---

**Version:** 1.0.0  
**License:** Propriétaire  
**Mainteneur:** Équipe Fermier Pro
