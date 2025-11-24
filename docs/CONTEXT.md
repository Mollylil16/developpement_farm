# 🧠 Contexte du Projet - Fermier Pro

**Pour Agents IA et Développeurs**

Ce document fournit le contexte essentiel pour comprendre et modifier l'application Fermier Pro.

---

## 📋 Vue d'Ensemble

**Fermier Pro** est une application mobile React Native (Expo) de gestion d'élevage porcin pour les fermiers en Afrique de l'Ouest (Bénin, Togo, Côte d'Ivoire).

### Technologies
- **Frontend:** React Native 0.81.5 + Expo 54
- **State Management:** Redux Toolkit avec normalisation (normalizr)
- **Base de données:** SQLite (expo-sqlite)
- **Navigation:** React Navigation 7
- **Langage:** TypeScript 5.9

### Devise
- **CFA** (Franc CFA) - Utilisé dans toute l'application
- Format: `1 500 000 CFA`

---

## 🏗️ Architecture

### Structure des Dossiers

```
src/
├── components/          # Composants UI réutilisables
│   ├── __tests__/      # Tests des composants
│   ├── finance/        # Composants spécifiques finance
│   └── widgets/        # Widgets Dashboard
├── constants/          # Constantes (theme, races, etc.)
├── contexts/           # Contexts React (Theme, Language)
├── hooks/              # Custom hooks
├── locales/            # Traductions (fr, en)
├── navigation/         # Configuration navigation
├── screens/            # Écrans principaux
├── services/           # Services (database, PDF, notifications)
├── store/              # Redux store
│   ├── slices/        # Redux slices
│   └── selectors/     # Reselect selectors
├── types/              # Types TypeScript
└── utils/              # Fonctions utilitaires
```

### État Redux (Normalisé)

L'état est **normalisé** avec `normalizr` pour éviter la duplication :

```typescript
{
  entities: {
    animaux: { [id]: Animal },
    pesees: { [id]: Pesee },
    gestations: { [id]: Gestation },
    // ...
  },
  ids: {
    animaux: string[],
    pesees: string[],
    // ...
  }
}
```

⚠️ **Important:** Toujours utiliser les **selectors** pour accéder aux données :
- `selectAllAnimaux()` - Retourne les entités dénormalisées
- `selectAnimalById(id)` - Retourne un animal spécifique

---

## 🗄️ Base de Données (SQLite)

### Tables Principales

#### Projets
```sql
CREATE TABLE projets (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  date_creation TEXT,
  derniere_modification TEXT
)
```

#### Animaux (Production)
```sql
CREATE TABLE production_animaux (
  id TEXT PRIMARY KEY,
  projet_id TEXT,
  code TEXT UNIQUE NOT NULL,      -- Code d'identification unique
  nom TEXT,
  sexe TEXT CHECK(sexe IN ('male', 'femelle')),
  race TEXT,
  date_naissance TEXT,
  reproducteur INTEGER DEFAULT 0,  -- 0 ou 1 (boolean)
  statut TEXT DEFAULT 'actif',     -- 'actif', 'vendu', 'mort'
  FOREIGN KEY(projet_id) REFERENCES projets(id)
)
```

#### Pesées
```sql
CREATE TABLE production_pesees (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  date TEXT NOT NULL,
  poids_kg REAL NOT NULL,
  notes TEXT,
  FOREIGN KEY(animal_id) REFERENCES production_animaux(id)
)
```

#### Gestations
```sql
CREATE TABLE reproduction_gestations (
  id TEXT PRIMARY KEY,
  projet_id TEXT,
  truie_id TEXT,
  verrat_id TEXT,
  date_saillie TEXT,
  date_mise_bas_prevue TEXT,
  date_mise_bas_reelle TEXT,
  statut TEXT DEFAULT 'en_cours',  -- 'en_cours', 'terminee', 'annulee'
  nombre_porcelets_prevu INTEGER,
  nombre_porcelets_reel INTEGER,
  FOREIGN KEY(truie_id) REFERENCES production_animaux(id)
)
```

### ⚠️ Problème Actuel : `database.ts` (7500 lignes)

Le fichier `src/services/database.ts` est **monolithique**. Il contient:
- Toutes les requêtes SQL
- La logique métier
- Les migrations

**À refactoriser** en Repositories (voir Phase 2).

---

## 🎯 Modules Métier

### 1. Production (Cheptel)
- Gestion des animaux (truies, verrats, porcelets)
- Pesées et suivi de croissance
- Calcul du GMQ (Gain Moyen Quotidien)
- Estimations de vente

**Fichiers clés:**
- `src/store/slices/productionSlice.ts`
- `src/screens/ProductionScreen.tsx`

### 2. Reproduction
- Gestion des gestations
- Planning des saillies
- Suivi des sevrages
- Alertes de mise bas

**Cycles biologiques:**
- Gestation: 114 jours (±2)
- Lactation: 21 jours
- Sevrage: À 21 jours d'âge
- Repos truie: 7 jours après sevrage

**Fichiers clés:**
- `src/store/slices/reproductionSlice.ts`
- `src/components/GestationsListComponent.tsx`

### 3. Finance
- Revenus (ventes d'animaux)
- Dépenses ponctuelles
- Charges fixes mensuelles
- Graphiques et analyses

**Catégories de dépenses:**
- Vaccins
- Médicaments
- Alimentation
- Vétérinaire
- Entretien
- Équipements
- Autre

**Fichiers clés:**
- `src/store/slices/financeSlice.ts`
- `src/components/FinanceGraphiquesComponent.tsx`

### 4. Nutrition
- Formules alimentaires
- Calcul de rations
- Gestion des stocks
- Alertes de stock faible

**Fichiers clés:**
- `src/store/slices/stocksSlice.ts`
- `src/store/slices/nutritionSlice.ts`

### 5. Santé Vétérinaire
- Vaccinations
- Traitements
- Maladies
- Mortalités
- Visites vétérinaires

**Fichiers clés:**
- `src/store/slices/veterinairesSlice.ts`
- `src/store/slices/mortalitesSlice.ts`

### 6. Planning Production
- Simulation de production
- Planning des saillies
- Prévisions de ventes
- Recommandations stratégiques

**Fichiers clés:**
- `src/store/slices/planningProductionSlice.ts`
- `src/utils/planningProductionCalculs.ts` (400+ lignes)

---

## 🎨 Système de Design

### Thème
```typescript
// Mode clair et sombre
const { colors, isDark } = useTheme();

// Couleurs principales
colors.primary    // Vert forêt #2E7D32
colors.secondary  // Vert secondaire #66BB6A
colors.error      // Rouge #EF5350
colors.success    // Vert succès #66BB6A
colors.warning    // Orange #FFA726
```

### Spacing
```typescript
SPACING.xs   // 4
SPACING.sm   // 8
SPACING.md   // 16
SPACING.lg   // 24
SPACING.xl   // 32
```

### Border Radius
```typescript
BORDER_RADIUS.xs    // 4
BORDER_RADIUS.sm    // 8
BORDER_RADIUS.md    // 12
BORDER_RADIUS.lg    // 16
BORDER_RADIUS.round // 9999 (cercles)
```

---

## 🔧 Conventions de Code

### Nommage

#### Composants
- **PascalCase**: `ProductionAnimalFormModal.tsx`
- **Default export**: `export default function ProductionAnimalFormModal()`

#### Hooks
- **camelCase** avec préfixe `use`: `useAnimauxActifs.ts`

#### Types
- **PascalCase**: `ProductionAnimal`, `Gestation`
- **Suffix** pour les inputs: `CreateAnimalInput`, `UpdatePeseeInput`

#### Constantes
- **UPPERCASE_SNAKE_CASE**: `DUREE_GESTATION_JOURS = 114`

### Structure de Fichier

```typescript
/**
 * Description du fichier
 * Responsabilité unique
 */

// 1. Imports externes
import React, { useState } from 'react';
import { View, Text } from 'react-native';

// 2. Imports internes
import { useAppSelector } from '../store/hooks';
import { SPACING } from '../constants/theme';

// 3. Types/Interfaces
interface MyComponentProps {
  title: string;
}

// 4. Composant/Fonction
export default function MyComponent({ title }: MyComponentProps) {
  // Hooks en premier
  const [state, setState] = useState();
  
  // Calculs dérivés
  const computed = useMemo(() => {}, []);
  
  // Handlers
  const handleClick = useCallback(() => {}, []);
  
  // Render
  return <View>...</View>;
}

// 5. Styles
const styles = StyleSheet.create({});
```

### Redux Slice Pattern

```typescript
// 1. Actions async en premier
export const loadAnimaux = createAsyncThunk('production/loadAnimaux', ...);

// 2. Slice
const slice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    // Actions synchrones
  },
  extraReducers: (builder) => {
    // Gestion des actions async
  },
});

// 3. Exports
export const { action1, action2 } = slice.actions;
export default slice.reducer;
```

---

## 🧮 Règles Métier Critiques

### Production

#### GMQ (Gain Moyen Quotidien)
```typescript
GMQ (g/jour) = (Poids Final - Poids Initial) × 1000 / Nombre de jours
```

#### Estimation Âge Vente
```typescript
Jours restants = (Poids Cible - Poids Actuel) × 1000 / GMQ
```

**Coefficient pessimiste:** 0.85 (pour prévisions réalistes)

### Reproduction

#### Dates Clés
```typescript
Date Mise Bas = Date Saillie + 114 jours
Date Sevrage = Date Mise Bas + 21 jours
Prochaine Saillie = Date Sevrage + 7 jours (repos)
```

#### Alertes
- **7 jours avant** mise bas: Alerte warning
- **3 jours avant** mise bas: Alerte error (critique)

### Finance

#### Calculs
```typescript
Solde = Total Revenus - (Total Charges Fixes + Total Dépenses)
Taux d'épargne = (Revenus - Dépenses) / Revenus × 100
```

---

## ⚠️ Pièges Courants

### 1. État Redux Normalisé
❌ **MAUVAIS:**
```typescript
const animaux = useAppSelector(state => state.production.entities.animaux);
// Retourne un objet { [id]: Animal }
```

✅ **BON:**
```typescript
const animaux = useAppSelector(selectAllAnimaux);
// Retourne un array [Animal, Animal, ...]
```

### 2. Dates
❌ **MAUVAIS:**
```typescript
const date = new Date().toString(); // Format incohérent
```

✅ **BON:**
```typescript
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd'); // ISO format
```

### 3. Transactions SQLite
❌ **MAUVAIS:**
```typescript
await db.runAsync('INSERT ...');
await db.runAsync('UPDATE ...');
// Pas atomique !
```

✅ **BON:**
```typescript
await db.withTransactionAsync(async () => {
  await db.runAsync('INSERT ...');
  await db.runAsync('UPDATE ...');
});
```

---

## 🎯 Points d'Entrée pour Modifications

### Ajouter un Nouvel Écran
1. Créer `src/screens/MonEcran.tsx`
2. Ajouter route dans `src/navigation/types.ts`
3. Configurer dans `src/navigation/AppNavigator.tsx`

### Ajouter un Nouveau Champ à une Table
1. Créer migration dans `src/services/database.ts` (fonction `runMigrations`)
2. Mettre à jour le type TypeScript dans `src/types/`
3. Mettre à jour les requêtes SQL
4. Mettre à jour les formulaires

### Ajouter un Nouveau Module
1. Créer slice Redux: `src/store/slices/monModuleSlice.ts`
2. Créer types: `src/types/monModule.ts`
3. Créer selectors: `src/store/selectors/monModuleSelectors.ts`
4. Ajouter aux migrations database
5. Créer écran et composants

---

## 📊 Métriques de Qualité

### Limites Actuelles (à respecter lors des modifications)
- **Fichier:** Max 500 lignes (ESLint warning)
- **Fonction:** Max 100 lignes (ESLint warning)
- **Complexité cyclomatique:** Max 20 (ESLint warning)

### Coverage Tests (Objectif)
- **Statements:** 70%
- **Branches:** 60%
- **Functions:** 70%
- **Lines:** 70%

---

## 🚀 Commandes Utiles

```bash
# Développement
npm start                    # Lancer Expo
npm run android             # Lancer sur Android
npm run ios                 # Lancer sur iOS

# Qualité
npm run validate            # Lint + Type-check + Tests
npm run lint:fix            # Corriger auto le linting
npm run type-check          # Vérifier types TypeScript
npm run format              # Formater le code

# Tests
npm test                    # Lancer les tests
npm run test:watch          # Mode watch
npm run test:coverage       # Avec coverage
```

---

## 📚 Documentation Complémentaire

- **[README_TESTS.md](../README_TESTS.md)** - Guide complet des tests
- **[QUALITE_CODE.md](../QUALITE_CODE.md)** - Standards de qualité
- **[docs/architecture/]** - Diagrammes d'architecture
- **[docs/specs/]** - Spécifications fonctionnelles
- **[docs/guides/]** - Guides techniques

---

## ✅ Checklist Avant Modification

1. ⬜ Lire ce CONTEXT.md
2. ⬜ Comprendre le module concerné
3. ⬜ Vérifier les types TypeScript
4. ⬜ Utiliser les selectors Redux (pas d'accès direct à entities)
5. ⬜ Respecter les conventions de nommage
6. ⬜ Écrire/mettre à jour les tests
7. ⬜ Lancer `npm run validate`
8. ⬜ Tester manuellement sur device/émulateur

---

**Version:** 1.0.0  
**Dernière mise à jour:** 21 Novembre 2025  
**Mainteneur:** Équipe Fermier Pro

