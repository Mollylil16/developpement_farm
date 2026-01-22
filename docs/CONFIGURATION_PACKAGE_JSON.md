# 📦 Configuration package.json - Séparation Dépendances

## ✅ Configuration Effectuée

### Backend (`backend/package.json`)

#### Scripts Principaux (en premier)
- ✅ `start`: `node dist/main.js` - Lance l'application en production
- ✅ `build`: `nest build` - Compile/builder l'application
- ✅ `test`: `jest` - Lance les tests

#### Dépendances de Production (`dependencies`)
Contient uniquement les packages nécessaires en production :
- Frameworks NestJS (@nestjs/*)
- Bibliothèques métier (bcrypt, pg, cloudinary, etc.)
- Packages runtime (rxjs, reflect-metadata, etc.)

#### Dépendances de Développement (`devDependencies`)
Tous les outils de test et de développement :
- ✅ **Jest** (`jest`) - Framework de test
- ✅ **ts-jest** (`ts-jest`) - Transformer TypeScript pour Jest
- ✅ **@types/jest** (`@types/jest`) - Types TypeScript pour Jest
- ✅ **@nestjs/testing** (`@nestjs/testing`) - Utilitaires de test NestJS
- ✅ **@types/node** (`@types/node`) - Types TypeScript pour Node.js
- ✅ **@types/*** - Tous les types TypeScript (nodemailer, qrcode, sharp, etc.)
- ✅ **TypeScript** (`typescript`) - Compilateur TypeScript
- ✅ **ESLint** (`eslint`) - Linter
- ✅ **Prettier** (`prettier`) - Formateur de code
- ✅ **tsx** (`tsx`) - Exécuteur TypeScript pour scripts

### Frontend (`package.json`)

#### Scripts Principaux (en premier)
- ✅ `start`: `expo start` - Lance l'application
- ✅ `build`: `expo export` - Compile/builder l'application
- ✅ `test`: `jest` - Lance les tests

#### Dépendances de Production (`dependencies`)
Contient uniquement les packages nécessaires en production :
- Frameworks React Native (react, react-native, expo)
- Bibliothèques UI (react-navigation, redux, etc.)
- Packages runtime (date-fns, lodash, etc.)

#### Dépendances de Développement (`devDependencies`)
Tous les outils de test et de développement :
- ✅ **Jest** (`jest`) - Framework de test
- ✅ **jest-expo** (`jest-expo`) - Preset Jest pour Expo
- ✅ **@types/jest** (`@types/jest`) - Types TypeScript pour Jest
- ✅ **@types/react** (`@types/react`) - Types TypeScript pour React
- ✅ **TypeScript** (`typescript`) - Compilateur TypeScript
- ✅ **ESLint** (`eslint`) - Linter
- ✅ **Prettier** (`prettier`) - Formateur de code
- ✅ **tsx** (`tsx`) - Exécuteur TypeScript pour scripts

## 📋 Résumé des Changements

### Backend
1. ✅ Scripts réorganisés : `start`, `build`, `test` en premier
2. ✅ Types TypeScript déplacés vers `devDependencies` :
   - `@types/nodemailer`
   - `@types/qrcode`
   - `@types/sharp`
3. ✅ Tous les outils de test dans `devDependencies` :
   - `jest`
   - `ts-jest`
   - `@types/jest`
   - `@nestjs/testing`

### Frontend
1. ✅ Scripts réorganisés : `start`, `build`, `test` en premier
2. ✅ Tous les outils de test déjà dans `devDependencies` :
   - `jest`
   - `jest-expo`
   - `@types/jest`

## 🎯 Avantages

1. **Séparation claire** : Dépendances production vs développement
2. **Installation optimisée** : `npm install --production` n'installe que les dépendances de production
3. **Builds plus rapides** : Moins de packages à installer en production
4. **Sécurité** : Réduction de la surface d'attaque en production
5. **Scripts standardisés** : `start`, `build`, `test` disponibles partout

## 🚀 Utilisation

### Backend
```bash
# Développement
cd backend
npm install              # Installe toutes les dépendances
npm run start:dev        # Lance en mode développement
npm test                 # Lance les tests

# Production
npm install --production # Installe uniquement les dépendances de production
npm run build            # Compile l'application
npm start                # Lance l'application
```

### Frontend
```bash
# Développement
npm install              # Installe toutes les dépendances
npm start                # Lance l'application
npm test                 # Lance les tests

# Production
npm install --production # Installe uniquement les dépendances de production
npm run build            # Compile l'application
```

## ✅ Vérification

Tous les frameworks de test sont maintenant dans `devDependencies` :
- ✅ Jest (backend et frontend)
- ✅ ts-jest (backend)
- ✅ jest-expo (frontend)
- ✅ @nestjs/testing (backend)
- ✅ @types/jest (backend et frontend)

Aucun framework de test (mocha, chai, sinon, etc.) n'est présent dans les `dependencies`.
