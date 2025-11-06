# Fermier Pro - Application Mobile de Gestion de Ferme Porcine

## 📋 Vue d'ensemble

**Fermier Pro** est une application mobile React Native (Expo) conçue pour aider les éleveurs porcins à mieux gérer leur ferme. L'application offre des outils avancés pour le planning de reproduction, la gestion nutritionnelle, le suivi financier et l'analyse de performance.

## 🏗️ Architecture Technique

### Stack Technologique

- **Framework**: React Native avec Expo SDK 54
- **Langage**: TypeScript
- **Gestion d'état**: Redux Toolkit avec Redux Persist
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **Base de données**: SQLite (expo-sqlite)
- **Persistance**: AsyncStorage

### Structure du Projet

```
fermier-pro/
├── src/
│   ├── components/          # Composants réutilisables
│   ├── constants/           # Constantes (thème, couleurs)
│   ├── navigation/          # Configuration de navigation
│   ├── screens/             # Écrans de l'application
│   ├── services/            # Services (base de données)
│   ├── store/               # Redux store et slices
│   │   └── slices/          # Redux slices
│   └── types/               # Types TypeScript
├── App.tsx                  # Point d'entrée principal
└── package.json
```

## ✅ Fonctionnalités Implémentées

### 1. ✅ Base de Données SQLite

- **Tables créées**:
  - `projets` - Gestion des projets de ferme
  - `charges_fixes` - Charges récurrentes
  - `depenses_ponctuelles` - Dépenses ponctuelles
- **Service de base de données** complet avec méthodes CRUD
- **Index** pour optimiser les requêtes

### 2. ✅ Gestion de Projet

- **Création de projet** avec formulaire complet
- **Champs**: Nom, localisation, nombre de truies/verrats/porcelets, poids moyen, âge moyen, notes
- **Validation** des données
- **Persistance** dans SQLite et Redux

### 3. ✅ Navigation

- **Écran de création de projet** (première utilisation)
- **Navigation par onglets** avec 9 modules:
  - Dashboard
  - Reproduction
  - Nutrition
  - Finance
  - Rapports
  - Planification
  - Paramètres
  - Collaboration
  - Mortalités

### 4. ✅ Redux Store

- **Slice Projet**: Gestion de l'état des projets
- **Slice Finance**: Gestion de l'état financier
- **Redux Persist**: Persistance du projet actif
- **Hooks typés**: `useAppDispatch` et `useAppSelector`

### 5. ✅ Dashboard

- Affichage des statistiques du projet actif
- Cartes de statistiques (Truies, Verrats, Porcelets)

## 🚀 Installation et Démarrage

### Prérequis

- Node.js (LTS recommandé)
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app sur votre téléphone (iOS/Android)

### Installation

```bash
cd fermier-pro
npm install
```

### Démarrage

```bash
npm start
```

Ensuite:
- Scannez le QR code avec Expo Go (iOS) ou l'appareil photo (Android)
- Ou appuyez sur `i` pour iOS simulator, `a` pour Android emulator

## 📱 Fonctionnalités à Implémenter

### Module Finance (Prochaine étape)

- [ ] Gestion des charges fixes (CRUD complet)
- [ ] Gestion des dépenses ponctuelles avec photos
- [ ] Graphiques comparatifs (planifié vs réel)
- [ ] Graphiques d'évolution mensuelle/hebdomadaire
- [ ] Répartition par catégorie (camembert)

### Autres Modules

- [ ] Module Reproduction (gestations, sevrages, alertes)
- [ ] Module Nutrition (calculateur de rations)
- [ ] Module Rapports (export PDF, analyses)
- [ ] Module Planification
- [ ] Module Collaboration
- [ ] Module Mortalités

## 🗄️ Base de Données

### Tables Principales

#### Table `projets`
```sql
- id (TEXT PRIMARY KEY)
- nom (TEXT NOT NULL)
- localisation (TEXT NOT NULL)
- nombre_truies (INTEGER)
- nombre_verrats (INTEGER)
- nombre_porcelets (INTEGER)
- poids_moyen_actuel (REAL)
- age_moyen_actuel (INTEGER)
- notes (TEXT)
- statut (TEXT CHECK: 'actif', 'archive', 'suspendu')
- proprietaire_id (TEXT)
- date_creation (TEXT)
- derniere_modification (TEXT)
```

#### Table `charges_fixes`
```sql
- id (TEXT PRIMARY KEY)
- categorie (TEXT)
- libelle (TEXT)
- montant (REAL)
- date_debut (TEXT)
- frequence (TEXT CHECK: 'mensuel', 'trimestriel', 'annuel')
- jour_paiement (INTEGER)
- notes (TEXT)
- statut (TEXT CHECK: 'actif', 'suspendu', 'termine')
- date_creation (TEXT)
- derniere_modification (TEXT)
```

#### Table `depenses_ponctuelles`
```sql
- id (TEXT PRIMARY KEY)
- montant (REAL)
- categorie (TEXT)
- libelle_categorie (TEXT)
- date (TEXT)
- commentaire (TEXT)
- photos (TEXT - JSON array)
- date_creation (TEXT)
```

## 🎨 Thème et Design

### Palette de Couleurs

- **Primaire**: `#2E7D32` (Vert forêt)
- **Secondaire**: `#4CAF50` (Vert clair)
- **Accent**: `#FF9800` (Orange)
- **Erreur**: `#F44336` (Rouge)
- **Succès**: `#4CAF50` (Vert)

### Espacements et Tailles

Définis dans `src/constants/theme.ts`:
- `SPACING`: xs, sm, md, lg, xl
- `FONT_SIZES`: xs, sm, md, lg, xl, xxl
- `BORDER_RADIUS`: sm, md, lg, xl

## 📝 Dépendances Principales

```json
{
  "@react-navigation/native": "^7.1.19",
  "@react-navigation/bottom-tabs": "^7.8.1",
  "@react-navigation/stack": "^7.6.2",
  "@reduxjs/toolkit": "^2.10.1",
  "react-redux": "^9.2.0",
  "redux-persist": "^6.0.0",
  "expo-sqlite": "~16.0.9",
  "expo-image-picker": "~17.0.8",
  "react-native-calendars": "^1.1313.0",
  "react-native-chart-kit": "^6.12.0",
  "date-fns": "^4.1.0"
}
```

## 🔧 Développement

### Structure des Slices Redux

Chaque slice suit cette structure:
```typescript
interface SliceState {
  data: DataType[];
  loading: boolean;
  error: string | null;
}
```

### Services

- `databaseService`: Service singleton pour toutes les opérations SQLite
- Méthodes CRUD complètes pour chaque table
- Gestion d'erreurs intégrée

## 🐛 Dépannage

### Erreur de base de données
- Vérifiez que `expo-sqlite` est bien installé
- Redémarrez l'application

### Navigation ne fonctionne pas
- Vérifiez que tous les écrans sont bien importés
- Vérifiez que le projet actif est bien chargé dans Redux

## 📄 Licence

Propriétaire - Fermier Pro

## 👥 Équipe

Développé par l'équipe Fermier Pro

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2025


