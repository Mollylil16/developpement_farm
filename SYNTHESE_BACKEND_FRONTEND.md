# 📊 Synthèse Backend ↔ Frontend - Fermier Pro

## 🎯 Vue d'ensemble

Ce document compare l'état actuel du backend NestJS avec les besoins identifiés du frontend React Native, et identifie les gaps à combler.

---

## ✅ BACKEND EXISTANT (NestJS + PostgreSQL)

### Architecture
- **Framework** : NestJS (TypeScript)
- **Base de données** : PostgreSQL (via `pg` pool)
- **Port** : 3000 (par défaut)
- **CORS** : Activé pour toutes les origines (`*`)
- **Structure** : Modules NestJS avec Controllers + Services

### Modules Implémentés

#### 1. ✅ **Database Module**
- **Service** : `DatabaseService`
- **Fonctionnalités** :
  - Pool de connexions PostgreSQL
  - Transactions
  - Health check
  - Configuration via variables d'environnement

#### 2. ✅ **Health Module**
- **Endpoint** : `GET /health`
- **Fonctionnalité** : Vérification de l'état du serveur

#### 3. ✅ **Users Module**
- **Controller** : `UsersController` (`/users`)
- **Endpoints** :
  - `POST /users` - Créer un utilisateur
  - `GET /users` - Liste tous les utilisateurs
  - `GET /users/:id` - Détails d'un utilisateur
  - `GET /users/email/:email` - Trouver par email
  - `GET /users/telephone/:telephone` - Trouver par téléphone
  - `GET /users/identifier/:identifier` - Trouver par identifiant
  - `PATCH /users/:id` - Modifier un utilisateur
  - `DELETE /users/:id` - Supprimer un utilisateur

#### 4. ✅ **Projets Module**
- **Controller** : `ProjetsController` (`/projets`)
- **Endpoints** :
  - `POST /projets` - Créer un projet
  - `GET /projets` - Liste tous les projets
  - `GET /projets?proprietaire_id=xxx` - Projets d'un propriétaire
  - `GET /projets/actif?user_id=xxx` - Projet actif d'un utilisateur
  - `GET /projets/:id` - Détails d'un projet
  - `PATCH /projets/:id` - Modifier un projet
  - `DELETE /projets/:id` - Supprimer un projet

#### 5. ✅ **Production Module**
- **Controllers** :
  - `AnimauxController` (`/animaux`)
  - `PeseesController` (`/pesees`)
  - `RapportsCroissanceController` (`/rapports-croissance`)

- **Endpoints Animaux** :
  - `POST /animaux` - Créer un animal
  - `GET /animaux?projet_id=xxx` - Animaux d'un projet
  - `GET /animaux/:id` - Détails d'un animal
  - `PATCH /animaux/:id` - Modifier un animal
  - `DELETE /animaux/:id` - Supprimer un animal

- **Endpoints Pesées** :
  - `POST /pesees` - Créer une pesée
  - `GET /pesees` - Liste des pesées
  - `GET /pesees/:id` - Détails d'une pesée
  - `PATCH /pesees/:id` - Modifier une pesée
  - `DELETE /pesees/:id` - Supprimer une pesée

- **Endpoints Rapports** :
  - `POST /rapports-croissance` - Créer un rapport
  - `GET /rapports-croissance` - Liste des rapports
  - `GET /rapports-croissance/:id` - Détails d'un rapport
  - `PATCH /rapports-croissance/:id` - Modifier un rapport
  - `DELETE /rapports-croissance/:id` - Supprimer un rapport

#### 6. ✅ **Finance Module**
- **Controllers** :
  - `ChargesFixesController` (`/charges-fixes`)
  - `DepensesController` (`/depenses`)
  - `RevenusController` (`/revenus`)

- **Endpoints Charges Fixes** :
  - `POST /charges-fixes` - Créer une charge fixe
  - `GET /charges-fixes?projet_id=xxx` - Charges d'un projet
  - `GET /charges-fixes?projet_id=xxx&actives=true` - Charges actives
  - `GET /charges-fixes/:id` - Détails
  - `PATCH /charges-fixes/:id` - Modifier
  - `DELETE /charges-fixes/:id` - Supprimer

- **Endpoints Dépenses** :
  - `POST /depenses` - Créer une dépense
  - `GET /depenses?projet_id=xxx` - Dépenses d'un projet
  - `GET /depenses/:id` - Détails
  - `PATCH /depenses/:id` - Modifier
  - `DELETE /depenses/:id` - Supprimer

- **Endpoints Revenus** :
  - `POST /revenus` - Créer un revenu
  - `GET /revenus?projet_id=xxx` - Revenus d'un projet
  - `GET /revenus/:id` - Détails
  - `PATCH /revenus/:id` - Modifier
  - `DELETE /revenus/:id` - Supprimer

#### 7. ✅ **Santé Module**
- **Controllers** :
  - `VaccinationsController` (`/vaccinations`)
  - `MaladiesController` (`/maladies`)
  - `TraitementsController` (`/traitements`)
  - `VisitesVeterinairesController` (`/visites-veterinaires`)
  - `CalendrierVaccinationsController` (`/calendrier-vaccinations`)
  - `RappelsVaccinationsController` (`/rappels-vaccinations`)
  - `StatistiquesSanteController` (`/statistiques-sante`)

- **Endpoints Vaccinations** :
  - `POST /vaccinations` - Créer une vaccination
  - `GET /vaccinations?projet_id=xxx` - Vaccinations d'un projet
  - `GET /vaccinations?animal_id=xxx` - Vaccinations d'un animal
  - `GET /vaccinations/retard?projet_id=xxx` - Vaccinations en retard
  - `GET /vaccinations/avenir?projet_id=xxx&jours=7` - Vaccinations à venir
  - `GET /vaccinations/:id` - Détails
  - `PATCH /vaccinations/:id` - Modifier
  - `DELETE /vaccinations/:id` - Supprimer

- **Endpoints similaires pour** : Maladies, Traitements, Visites, Calendrier, Rappels, Statistiques

#### 8. ✅ **Nutrition Module**
- **Controllers** :
  - `IngredientsController` (`/ingredients`)
  - `RationsController` (`/rations`)
  - `StocksController` (`/stocks`)

- **Endpoints Ingredients** :
  - `POST /ingredients` - Créer un ingrédient
  - `GET /ingredients` - Liste tous les ingrédients
  - `GET /ingredients/:id` - Détails
  - `PATCH /ingredients/:id` - Modifier
  - `DELETE /ingredients/:id` - Supprimer

- **Endpoints similaires pour** : Rations, Stocks

#### 9. ✅ **Reproduction Module**
- **Controllers** : (détails non analysés mais module présent)

#### 10. ✅ **Collaborations Module**
- **Controller** : `CollaborationsController` (`/collaborations`)
- **Endpoints** :
  - `POST /collaborations` - Créer une collaboration
  - `GET /collaborations?projet_id=xxx` - Collaborations d'un projet
  - `GET /collaborations?projet_id=xxx&statut=xxx` - Filtrer par statut
  - `GET /collaborations?projet_id=xxx&role=xxx` - Filtrer par rôle
  - `GET /collaborations?user_id=xxx` - Collaborations d'un utilisateur
  - `GET /collaborations/invitations-en-attente/:userId` - Invitations en attente
  - `GET /collaborations/:id` - Détails
  - `PATCH /collaborations/:id` - Modifier
  - `DELETE /collaborations/:id` - Supprimer

#### 11. ✅ **Planifications Module**
- **Controller** : `PlanificationsController` (`/planifications`)
- **Endpoints** : (CRUD standard)

#### 12. ✅ **Mortalités Module**
- **Controller** : `MortalitesController` (`/mortalites`)
- **Endpoints** :
  - `POST /mortalites` - Créer une mortalité
  - `GET /mortalites?projet_id=xxx` - Mortalités d'un projet
  - `GET /mortalites?projet_id=xxx&categorie=xxx` - Filtrer par catégorie
  - `GET /mortalites?projet_id=xxx&debut=xxx&fin=xxx` - Filtrer par date
  - `GET /mortalites/statistiques?projet_id=xxx` - Statistiques
  - `GET /mortalites/taux-par-cause?projet_id=xxx` - Taux par cause
  - `GET /mortalites/:id` - Détails
  - `PATCH /mortalites/:id` - Modifier
  - `DELETE /mortalites/:id` - Supprimer

---

## ❌ BACKEND MANQUANT (Besoins Frontend)

### 1. 🔴 **AUTHENTIFICATION** (Priorité CRITIQUE)
**Status** : ❌ **AUCUN ENDPOINT**

**Besoins Frontend** :
- Login / Logout
- Register
- JWT tokens (access + refresh)
- Password reset
- OAuth (Google, Apple)

**Endpoints nécessaires** :
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/oauth/google
POST   /api/auth/oauth/apple
```

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 2. 🔴 **MARKETPLACE** (Priorité HAUTE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- Listings (annonces de vente)
- Offers (offres d'achat)
- Transactions (ventes)
- Purchase Requests (demandes d'achat)
- Notifications marketplace
- Chat marketplace

**Endpoints nécessaires** : ~25 endpoints (voir `ANALYSE_BESOINS_BACKEND.md`)

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 3. 🔴 **CHAT EN TEMPS RÉEL** (Priorité HAUTE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- WebSocket Gateway (Socket.io)
- Conversations
- Messages en temps réel
- Notifications de nouveaux messages

**Endpoints nécessaires** :
```
GET    /api/chat/conversations
GET    /api/chat/conversations/:id
POST   /api/chat/conversations
GET    /api/chat/conversations/:id/messages
POST   /api/chat/messages
PUT    /api/chat/messages/:id/read
GET    /api/chat/messages/unread
```

**WebSocket Events** :
- `message:new`
- `message:read`
- `conversation:new`
- `typing:start/stop`

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 4. 🟡 **SYNCHRONISATION** (Priorité MOYENNE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- Push/pull des modifications
- Résolution de conflits
- Backup/restore

**Endpoints nécessaires** :
```
POST   /api/sync/push
POST   /api/sync/pull
GET    /api/sync/status
POST   /api/sync/conflicts
POST   /api/backup/create
GET    /api/backup/list
POST   /api/backup/restore/:id
```

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 5. 🟡 **NOTIFICATIONS PUSH** (Priorité MOYENNE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- Enregistrement des tokens FCM/APNS
- Envoi de notifications
- Préférences de notifications

**Endpoints nécessaires** :
```
POST   /api/notifications/register-device
DELETE /api/notifications/unregister-device
GET    /api/notifications/preferences
PUT    /api/notifications/preferences
POST   /api/notifications/send
```

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 6. 🟢 **PRIX RÉGIONAL** (Priorité BASSE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- Récupération du prix régional
- Historique des prix
- Cache

**Endpoints nécessaires** :
```
GET    /api/prices/regional
GET    /api/prices/history
POST   /api/prices/update  (admin)
```

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 7. 🟢 **SERVICES VÉTÉRINAIRES** (Priorité BASSE)
**Status** : ❌ **AUCUN MODULE**

**Besoins Frontend** :
- Recherche de vétérinaires
- Propositions de services
- Notifications

**Endpoints nécessaires** :
```
GET    /api/veterinarians
GET    /api/veterinarians/nearby
GET    /api/veterinarians/:id
POST   /api/veterinarians/:id/propose-service
GET    /api/veterinarians/service-proposals
POST   /api/veterinarians/proposals/:id/accept
POST   /api/veterinarians/proposals/:id/reject
```

**Action** : ⚠️ **À CRÉER COMPLÈTEMENT**

---

### 8. 🟢 **STATISTIQUES & RAPPORTS** (Priorité BASSE)
**Status** : ⚠️ **PARTIEL** (statistiques santé existent)

**Besoins Frontend** :
- Statistiques globales (anonymisées)
- Statistiques régionales
- Rapports partageables

**Endpoints nécessaires** :
```
GET    /api/statistics/global
GET    /api/statistics/regional
GET    /api/statistics/trends
GET    /api/reports
GET    /api/reports/:id
POST   /api/reports
POST   /api/reports/:id/share
```

**Action** : ⚠️ **À ÉTENDRE**

---

## 📋 COMPARAISON DÉTAILLÉE

### Modules Backend vs Besoins Frontend

| Module | Backend | Frontend | Status | Action |
|--------|---------|----------|--------|--------|
| **Auth** | ❌ | ✅ | 🔴 Manquant | Créer complètement |
| **Users** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Projets** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Production** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Finance** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Santé** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Nutrition** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Reproduction** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Collaborations** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Planifications** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Mortalités** | ✅ | ✅ | ✅ OK | Vérifier compatibilité |
| **Marketplace** | ❌ | ✅ | 🔴 Manquant | Créer complètement |
| **Chat** | ❌ | ✅ | 🔴 Manquant | Créer complètement |
| **Sync** | ❌ | ✅ | 🟡 Manquant | Créer complètement |
| **Notifications** | ❌ | ✅ | 🟡 Manquant | Créer complètement |
| **Prix Régional** | ❌ | ✅ | 🟢 Manquant | Créer complètement |
| **Vétérinaires** | ❌ | ✅ | 🟢 Manquant | Créer complètement |
| **Statistiques** | ⚠️ Partiel | ✅ | 🟡 Partiel | Étendre |

---

## 🔧 GAPS TECHNIQUES À COMBLER

### 1. **Authentification JWT**
- ❌ Pas de module d'authentification
- ❌ Pas de guards pour protéger les routes
- ❌ Pas de stratégies Passport
- ❌ Pas de gestion de tokens

**Solution** : Créer un module `auth` avec :
- `AuthModule`
- `AuthService` (login, register, refresh)
- `JwtStrategy` (Passport)
- `JwtAuthGuard` (protéger les routes)
- `RolesGuard` (gestion des rôles)

### 2. **WebSocket / Socket.io**
- ❌ Pas de WebSocket Gateway
- ❌ Pas de support temps réel

**Solution** : Ajouter Socket.io :
- `ChatGateway` (WebSocket)
- Événements en temps réel
- Gestion des connexions

### 3. **File Upload**
- ❌ Pas de gestion de fichiers
- ❌ Pas de stockage (S3, Cloudinary)

**Solution** : Ajouter :
- `FileUploadModule`
- Configuration S3/Cloudinary
- Endpoints pour upload

### 4. **Validation & DTOs**
- ⚠️ DTOs non visibles dans le code compilé
- ⚠️ Validation à vérifier

**Solution** : S'assurer que :
- Tous les DTOs sont définis
- Validation avec `class-validator`
- Transformation avec `class-transformer`

### 5. **Error Handling**
- ⚠️ Gestion d'erreurs à vérifier

**Solution** : Ajouter :
- `ExceptionFilter` global
- Format d'erreur standardisé
- Logging des erreurs

### 6. **API Documentation**
- ❌ Pas de Swagger/OpenAPI visible

**Solution** : Ajouter :
- `@nestjs/swagger`
- Documentation automatique
- Exemples de requêtes

---

## 📊 STATISTIQUES

### Backend Existant
- ✅ **12 modules** implémentés
- ✅ **~80+ endpoints** REST
- ✅ **PostgreSQL** configuré
- ✅ **Structure modulaire** NestJS

### Backend Manquant
- ❌ **1 module critique** : Auth
- ❌ **5 modules prioritaires** : Marketplace, Chat, Sync, Notifications, Statistiques
- ❌ **2 modules optionnels** : Prix Régional, Vétérinaires
- ❌ **~50+ endpoints** à créer

### Taux de Complétion
- **Modules Core** : ~70% ✅
- **Modules Marketplace** : 0% ❌
- **Modules Temps Réel** : 0% ❌
- **Modules Utilitaires** : ~20% ⚠️

---

## 🚀 PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Infrastructure Critique (Semaine 1)
1. ✅ Créer le module `auth` avec JWT
2. ✅ Ajouter les guards et stratégies
3. ✅ Protéger les routes existantes
4. ✅ Tester l'authentification

### Phase 2 : Marketplace (Semaine 2-3)
1. ✅ Créer le module `marketplace`
2. ✅ Implémenter listings, offers, transactions
3. ✅ Implémenter purchase requests
4. ✅ Adapter le frontend

### Phase 3 : Chat Temps Réel (Semaine 4)
1. ✅ Installer Socket.io
2. ✅ Créer le `ChatGateway`
3. ✅ Implémenter les événements WebSocket
4. ✅ Adapter le frontend

### Phase 4 : Fonctionnalités Avancées (Semaine 5-6)
1. ✅ Module de synchronisation
2. ✅ Notifications push
3. ✅ Services vétérinaires
4. ✅ Prix régional

### Phase 5 : Optimisation (Semaine 7+)
1. ✅ File upload
2. ✅ Cache (Redis)
3. ✅ Documentation Swagger
4. ✅ Tests E2E

---

## 📝 NOTES IMPORTANTES

1. **Code Source Manquant** : Le backend n'a que des fichiers compilés (`dist/`). Le code source TypeScript n'est pas visible. Il faudra soit :
   - Retrouver le code source
   - Ou recréer les modules manquants en s'inspirant de la structure existante

2. **Compatibilité Frontend** : Les endpoints backend existants doivent être vérifiés pour correspondre aux besoins du frontend (noms de routes, formats de données, etc.)

3. **Base de Données** : Le backend utilise PostgreSQL, mais le frontend utilise SQLite. Il faudra :
   - Migrer les schémas SQLite vers PostgreSQL
   - Ou créer une couche d'abstraction

4. **Authentification** : **CRITIQUE** - Sans auth, le backend ne peut pas être utilisé en production. C'est la priorité #1.

5. **Marketplace & Chat** : Ces fonctionnalités sont essentielles pour la valeur métier de l'application. Priorité #2.

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08  
**Auteur** : Analyse automatique du codebase

