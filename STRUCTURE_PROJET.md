# 📁 Structure du Projet Fermier Pro

## 🎯 Vue d'ensemble

Cette document décrit la structure complète du projet frontend React Native/Expo avec Redux.

---

## 📂 Structure des Dossiers

```
fermier-pro/
├── src/
│   ├── store/                    # 🗄️ Redux Store
│   │   ├── slices/               # Redux slices (gestion d'état)
│   │   │   ├── authSlice.ts
│   │   │   ├── projetSlice.ts
│   │   │   ├── financeSlice.ts
│   │   │   ├── productionSlice.ts
│   │   │   ├── reproductionSlice.ts
│   │   │   ├── nutritionSlice.ts
│   │   │   ├── santeSlice.ts
│   │   │   ├── stocksSlice.ts
│   │   │   ├── reportsSlice.ts
│   │   │   ├── mortalitesSlice.ts
│   │   │   ├── planificationSlice.ts
│   │   │   ├── planningProductionSlice.ts
│   │   │   ├── collaborationSlice.ts
│   │   │   └── marketplaceSlice.ts
│   │   ├── selectors/            # Redux selectors (sélection de données)
│   │   ├── hooks.ts              # Redux hooks (useAppSelector, useAppDispatch)
│   │   └── store.ts              # Configuration du store Redux
│   │
│   ├── services/                  # 🔧 Services (logique métier)
│   │   ├── api/                   # API Client
│   │   │   ├── apiClient.ts       # Client HTTP principal
│   │   │   └── retryHandler.ts    # Gestion des retries
│   │   ├── auth/                  # Services d'authentification
│   │   │   ├── oauthService.ts    # OAuth (Google/Apple)
│   │   │   └── autoLogout.ts      # Auto-déconnexion
│   │   ├── chat/                  # Services de chat
│   │   ├── chatAgent/             # Agent conversationnel IA
│   │   ├── network/               # Services réseau
│   │   │   └── networkService.ts  # Détection de connectivité
│   │   ├── database.ts             # Service de base de données SQLite
│   │   └── ...                    # Autres services métier
│   │
│   ├── screens/                    # 📱 Écrans de l'application
│   │   ├── AuthScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ProductionScreen.tsx
│   │   ├── FinanceScreen.tsx
│   │   └── ...
│   │
│   ├── components/                 # 🧩 Composants réutilisables
│   │   ├── marketplace/            # Composants marketplace
│   │   ├── chatAgent/              # Composants chat agent
│   │   └── ...                     # Autres composants
│   │
│   ├── navigation/                 # 🧭 Navigation
│   │   ├── AppNavigator.tsx        # Navigateur principal
│   │   ├── CheptelStackNavigator.tsx
│   │   └── types.ts                # Types de navigation
│   │
│   ├── hooks/                      # 🪝 Custom Hooks
│   │   ├── useAuthLoading.ts
│   │   ├── useChatAgent.ts
│   │   ├── useMarketplace.ts
│   │   └── ...
│   │
│   ├── types/                      # 📝 Types TypeScript
│   │   ├── index.ts                # Types principaux
│   │   ├── common.ts               # Types communs (getErrorMessage, etc.)
│   │   ├── auth.ts
│   │   ├── production.ts
│   │   └── ...
│   │
│   ├── database/                   # 🗃️ Base de données
│   │   ├── repositories/           # Repositories (accès aux données)
│   │   ├── schemas/                # Schémas de tables
│   │   ├── migrations/             # Migrations SQLite
│   │   └── indexes/                # Index de base de données
│   │
│   ├── utils/                      # 🛠️ Utilitaires
│   │   ├── validation.ts           # Validation de formulaires
│   │   └── ...
│   │
│   ├── config/                      # ⚙️ Configuration
│   │   ├── api.config.ts           # Configuration API
│   │   ├── env.ts                  # Variables d'environnement
│   │   └── ...
│   │
│   ├── constants/                   # 📌 Constantes
│   │   ├── theme.ts                # Thème de l'application
│   │   └── ...
│   │
│   ├── contexts/                   # 🎭 Contextes React
│   │   ├── ThemeContext.tsx
│   │   ├── RoleContext.tsx
│   │   └── LanguageContext.tsx
│   │
│   └── locales/                    # 🌍 Internationalisation
│       ├── fr.json
│       └── en.json
│
├── backend/                        # 🖥️ Backend NestJS
│   ├── src/
│   │   ├── auth/                   # Module d'authentification
│   │   ├── users/                  # Module utilisateurs
│   │   └── ...
│   └── database/
│       └── migrations/             # Migrations PostgreSQL
│
└── scripts/                        # 📜 Scripts utilitaires
    ├── test-pesees.ts
    └── ...
```

---

## 🔗 Règles d'Import

### ✅ Chemins d'import corrects

```typescript
// Depuis un slice vers types
import { User, Projet } from '../../types';
import { getErrorMessage } from '../../types/common';

// Depuis un slice vers services
import { getDatabase } from '../../services/database';
import apiClient from '../../services/api/apiClient';

// Depuis un slice vers database
import { ProjetRepository } from '../../database/repositories';

// Depuis un screen vers store
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadProjets } from '../store/slices/projetSlice';

// Depuis un screen vers services
import apiClient from '../services/api/apiClient';

// Depuis un screen vers components
import Button from '../components/Button';
```

### ❌ Chemins d'import incorrects

```typescript
// ❌ Ne JAMAIS importer depuis store/services/
import { getDatabase } from '../store/services/database';

// ❌ Ne JAMAIS importer depuis services/slices/
import authReducer from '../services/slices/authSlice';
```

---

## 📋 Organisation par Domaine

### 🗄️ Redux Store (`src/store/`)

**Rôle** : Gestion de l'état global de l'application

- **`slices/`** : Chaque slice gère l'état d'un domaine (auth, projet, finance, etc.)
- **`selectors/`** : Fonctions pour sélectionner des données depuis le store
- **`hooks.ts`** : Hooks Redux typés (`useAppSelector`, `useAppDispatch`)
- **`store.ts`** : Configuration du store Redux avec persistance

### 🔧 Services (`src/services/`)

**Rôle** : Logique métier et communication avec le backend

- **`api/`** : Client HTTP pour communiquer avec le backend
- **`auth/`** : Services d'authentification (OAuth, auto-logout)
- **`database.ts`** : Service SQLite local (à migrer vers PostgreSQL)
- **`chat/`** : Services de chat en temps réel
- **`chatAgent/`** : Agent conversationnel IA

### 📱 Screens (`src/screens/`)

**Rôle** : Écrans de l'application (un écran = un fichier)

- Chaque écran est un composant React qui utilise les hooks Redux
- Les écrans importent les composants depuis `components/`

### 🧩 Components (`src/components/`)

**Rôle** : Composants réutilisables

- Organisés par domaine (marketplace, chatAgent, etc.)
- Peuvent utiliser les hooks Redux et les services

### 📝 Types (`src/types/`)

**Rôle** : Définitions TypeScript

- **`index.ts`** : Export de tous les types principaux
- **`common.ts`** : Types et utilitaires communs (`getErrorMessage`, etc.)
- Un fichier par domaine (auth.ts, production.ts, etc.)

---

## 🔄 Flux de Données

```
┌─────────────┐
│   Screen    │
└──────┬──────┘
       │
       ├──► useAppSelector() ──► Redux Store ──► Slice
       │
       ├──► useAppDispatch() ──► Action ──► Slice ──► Service
       │
       └──► Service ──► API Client ──► Backend
```

---

## ✅ Bonnes Pratiques

1. **Slices Redux** : Toujours dans `src/store/slices/`
2. **Services** : Toujours dans `src/services/`
3. **Imports relatifs** : Utiliser `../../` depuis `store/slices/` vers `types/` ou `services/`
4. **Types** : Centraliser dans `src/types/`
5. **Composants** : Réutilisables dans `src/components/`
6. **Écrans** : Un fichier par écran dans `src/screens/`

---

## 🚫 À Éviter

1. ❌ Ne pas mettre de slices dans `services/slices/`
2. ❌ Ne pas mettre de services dans `store/services/`
3. ❌ Ne pas utiliser de chemins absolus non configurés
4. ❌ Ne pas mélanger la logique métier dans les slices (utiliser les services)

---

## 📝 Notes

- **SQLite local** : Actuellement utilisé pour le cache local, à migrer vers PostgreSQL
- **Redux Persist** : Utilisé pour persister `auth` et `projet` dans AsyncStorage
- **API Client** : Gère automatiquement les tokens JWT, refresh, retry, et mode hors ligne

---

**Dernière mise à jour** : 2025-01-09
