# 📋 Analyse Complète des Besoins Backend - Fermier Pro

## 🎯 Vue d'ensemble

Cette analyse identifie tous les besoins backend nécessaires pour connecter le frontend React Native à un serveur backend. Actuellement, le frontend utilise SQLite local, mais plusieurs fonctionnalités nécessitent une synchronisation backend.

---

## 📊 État Actuel

### Frontend (React Native + Expo)
- ✅ **Base de données**: SQLite local (expo-sqlite)
- ✅ **State Management**: Redux Toolkit avec async thunks
- ✅ **Services**: Tous les services utilisent directement SQLite
- ✅ **Chat**: Polling local (temporaire) + WebSocket (préparé mais non connecté)
- ⚠️ **Backend**: Aucune connexion active (tout est local)

### Backend Existant
- 📁 `fermier-pro/backend/` : Structure NestJS compilée (dist/) mais pas de code source visible
- 📁 `fermier-pro/admin-web/` : Serveur Express simple pour interface admin (port 3001)

---

## 🔌 Besoins Backend Identifiés

### 1. 🏪 MARKETPLACE (Priorité HAUTE)

#### Fonctionnalités nécessitant synchronisation:
- **Listings** : Partage d'annonces entre tous les utilisateurs
- **Offres** : Négociations en temps réel entre producteurs et acheteurs
- **Transactions** : Suivi des ventes multi-utilisateurs
- **Notifications** : Alertes de nouvelles offres, matchs, etc.
- **Chat Marketplace** : Communication entre producteurs et acheteurs

#### Endpoints API nécessaires:

```typescript
// MARKETPLACE LISTINGS
GET    /api/marketplace/listings              // Rechercher des annonces
GET    /api/marketplace/listings/:id          // Détails d'une annonce
POST   /api/marketplace/listings              // Créer une annonce
PUT    /api/marketplace/listings/:id          // Modifier une annonce
DELETE /api/marketplace/listings/:id          // Supprimer une annonce
GET    /api/marketplace/listings/my           // Mes annonces

// MARKETPLACE OFFERS
GET    /api/marketplace/offers                // Liste des offres
GET    /api/marketplace/offers/:id            // Détails d'une offre
POST   /api/marketplace/offers                // Créer une offre
PUT    /api/marketplace/offers/:id/accept     // Accepter une offre
PUT    /api/marketplace/offers/:id/reject     // Rejeter une offre
GET    /api/marketplace/offers/received        // Offres reçues
GET    /api/marketplace/offers/sent            // Offres envoyées

// MARKETPLACE TRANSACTIONS
GET    /api/marketplace/transactions          // Liste des transactions
GET    /api/marketplace/transactions/:id       // Détails d'une transaction
POST   /api/marketplace/transactions/:id/confirm-delivery  // Confirmer livraison
GET    /api/marketplace/transactions/my       // Mes transactions

// PURCHASE REQUESTS (Demandes d'achat)
GET    /api/marketplace/purchase-requests      // Liste des demandes
GET    /api/marketplace/purchase-requests/:id // Détails d'une demande
POST   /api/marketplace/purchase-requests      // Créer une demande
PUT    /api/marketplace/purchase-requests/:id  // Modifier une demande
DELETE /api/marketplace/purchase-requests/:id  // Supprimer une demande
POST   /api/marketplace/purchase-requests/:id/match  // Trouver des matchs

// MARKETPLACE NOTIFICATIONS
GET    /api/marketplace/notifications          // Liste des notifications
PUT    /api/marketplace/notifications/:id/read // Marquer comme lu
GET    /api/marketplace/notifications/unread-count // Nombre non lus
```

#### Services Frontend concernés:
- `src/services/MarketplaceService.ts`
- `src/services/PurchaseRequestService.ts`
- `src/store/slices/marketplaceSlice.ts`
- `src/hooks/useMarketplace.ts`
- `src/components/marketplace/*`

---

### 2. 💬 CHAT MARKETPLACE (Priorité HAUTE)

#### Fonctionnalités nécessitant synchronisation:
- **Messages en temps réel** : Communication entre producteurs et acheteurs
- **Conversations** : Gestion des conversations par transaction
- **Notifications push** : Alertes de nouveaux messages

#### Endpoints API nécessaires:

```typescript
// CHAT CONVERSATIONS
GET    /api/chat/conversations                 // Liste des conversations
GET    /api/chat/conversations/:id             // Détails d'une conversation
POST   /api/chat/conversations                 // Créer une conversation
GET    /api/chat/conversations/:id/messages    // Messages d'une conversation

// CHAT MESSAGES
POST   /api/chat/messages                      // Envoyer un message
PUT    /api/chat/messages/:id/read            // Marquer comme lu
GET    /api/chat/messages/unread               // Messages non lus
```

#### WebSocket Events nécessaires:

```typescript
// Événements WebSocket pour chat en temps réel
ws://api.fermier-pro.com/chat?conversationId=xxx

// Événements émis par le serveur:
- 'message:new'        // Nouveau message reçu
- 'message:read'       // Message marqué comme lu
- 'conversation:new'    // Nouvelle conversation
- 'typing:start'        // Utilisateur en train d'écrire
- 'typing:stop'         // Utilisateur a arrêté d'écrire

// Événements émis par le client:
- 'message:send'       // Envoyer un message
- 'message:mark-read'  // Marquer un message comme lu
- 'typing:start'        // Indiquer qu'on écrit
- 'typing:stop'         // Indiquer qu'on a arrêté
```

#### Services Frontend concernés:
- `src/services/chat/ChatService.ts`
- `src/services/chat/WebSocketChatTransport.ts`
- `src/services/chat/PollingChatTransport.ts`
- `src/hooks/useMarketplaceChat.ts`
- `src/database/repositories/MarketplaceChatRepository.ts`

---

### 3. 👥 COLLABORATION (Priorité MOYENNE)

#### Fonctionnalités nécessitant synchronisation:
- **Invitations** : Inviter des collaborateurs à un projet
- **Permissions** : Gérer les rôles et permissions
- **Notifications** : Alertes d'invitations, acceptations, etc.

#### Endpoints API nécessaires:

```typescript
// COLLABORATEURS
GET    /api/collaborations                    // Liste des collaborateurs
GET    /api/collaborations/:id                // Détails d'un collaborateur
POST   /api/collaborations                    // Inviter un collaborateur
PUT    /api/collaborations/:id                 // Modifier les permissions
DELETE /api/collaborations/:id                // Retirer un collaborateur

// INVITATIONS
GET    /api/collaborations/invitations         // Invitations reçues
POST   /api/collaborations/invitations/:id/accept  // Accepter une invitation
POST   /api/collaborations/invitations/:id/reject   // Rejeter une invitation
```

#### Services Frontend concernés:
- `src/store/slices/collaborationSlice.ts`
- `src/screens/CollaborationScreen.tsx`

---

### 4. 🔐 AUTHENTIFICATION & UTILISATEURS (Priorité HAUTE)

#### Fonctionnalités nécessitant synchronisation:
- **Authentification** : Login, logout, refresh token
- **Gestion des utilisateurs** : Création, modification de profil
- **Multi-rôles** : Producteur, Acheteur, Vétérinaire, Technicien
- **Synchronisation de profil** : Photo, informations personnelles

#### Endpoints API nécessaires:

```typescript
// AUTHENTIFICATION
POST   /api/auth/register                     // Inscription
POST   /api/auth/login                        // Connexion
POST   /api/auth/logout                       // Déconnexion
POST   /api/auth/refresh                      // Rafraîchir le token
POST   /api/auth/forgot-password              // Mot de passe oublié
POST   /api/auth/reset-password               // Réinitialiser le mot de passe

// UTILISATEURS
GET    /api/users/me                          // Mon profil
PUT    /api/users/me                          // Modifier mon profil
POST   /api/users/me/photo                    // Upload photo de profil
GET    /api/users/:id                         // Profil d'un utilisateur
GET    /api/users/search                      // Rechercher des utilisateurs

// RÔLES & PERMISSIONS
GET    /api/users/me/roles                    // Mes rôles
POST   /api/users/me/roles                    // Ajouter un rôle
DELETE /api/users/me/roles/:role              // Retirer un rôle
```

#### Services Frontend concernés:
- `src/store/slices/authSlice.ts`
- `src/screens/AuthScreen.tsx`
- `src/screens/OnboardingAuthScreen.tsx`
- `src/contexts/RoleContext.tsx`

---

### 5. 📊 SYNCHRONISATION DES DONNÉES (Priorité MOYENNE)

#### Fonctionnalités nécessitant synchronisation:
- **Synchronisation multi-appareils** : Données identiques sur tous les appareils
- **Sauvegarde cloud** : Backup automatique des données
- **Résolution de conflits** : Gérer les modifications simultanées

#### Endpoints API nécessaires:

```typescript
// SYNCHRONISATION
POST   /api/sync/push                         // Envoyer les modifications locales
POST   /api/sync/pull                         // Récupérer les modifications serveur
GET    /api/sync/status                       // État de la synchronisation
POST   /api/sync/conflicts                    // Résoudre les conflits

// BACKUP & RESTORE
POST   /api/backup/create                     // Créer un backup
GET    /api/backup/list                       // Liste des backups
POST   /api/backup/restore/:id                // Restaurer un backup
```

#### Modules concernés:
- Tous les Redux slices qui modifient des données
- `src/services/database.ts`

---

### 6. 💰 PRIX RÉGIONAL (Priorité BASSE)

#### Fonctionnalités nécessitant synchronisation:
- **API externe** : Récupération du prix régional du porc
- **Cache** : Stockage du prix pour éviter trop d'appels API

#### Endpoints API nécessaires:

```typescript
// PRIX RÉGIONAL
GET    /api/prices/regional                   // Prix régional actuel
GET    /api/prices/history                    // Historique des prix
POST   /api/prices/update                     // Mettre à jour le prix (admin)
```

#### Services Frontend concernés:
- `src/services/RegionalPriceService.ts`
- `src/hooks/usePorkPriceTrend.ts`

---

### 7. 🏥 SERVICES VÉTÉRINAIRES (Priorité BASSE)

#### Fonctionnalités nécessitant synchronisation:
- **Recherche de vétérinaires** : Trouver des vétérinaires à proximité
- **Propositions de services** : Vétérinaires proposant leurs services
- **Notifications** : Alertes de propositions de services

#### Endpoints API nécessaires:

```typescript
// VÉTÉRINAIRES
GET    /api/veterinarians                      // Liste des vétérinaires
GET    /api/veterinarians/nearby               // Vétérinaires à proximité
GET    /api/veterinarians/:id                  // Détails d'un vétérinaire
POST   /api/veterinarians/:id/propose-service  // Proposer un service
GET    /api/veterinarians/service-proposals    // Propositions reçues
POST   /api/veterinarians/proposals/:id/accept // Accepter une proposition
POST   /api/veterinarians/proposals/:id/reject // Rejeter une proposition
```

#### Services Frontend concernés:
- `src/services/veterinarianService.ts`
- `src/services/ServiceProposalNotificationService.ts`
- `src/screens/VetProposeFarmsScreen.tsx`

---

### 8. 📱 NOTIFICATIONS PUSH (Priorité MOYENNE)

#### Fonctionnalités nécessitant synchronisation:
- **Notifications push** : Alertes en temps réel
- **Gestion des tokens** : Enregistrer les tokens FCM/APNS
- **Préférences** : Gérer les types de notifications

#### Endpoints API nécessaires:

```typescript
// NOTIFICATIONS PUSH
POST   /api/notifications/register-device      // Enregistrer un appareil
DELETE /api/notifications/unregister-device    // Désenregistrer un appareil
GET    /api/notifications/preferences           // Préférences de notifications
PUT    /api/notifications/preferences           // Modifier les préférences
POST   /api/notifications/send                 // Envoyer une notification (admin)
```

#### Services Frontend concernés:
- `src/services/notificationsService.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useMarketplaceNotifications.ts`

---

### 9. 📈 STATISTIQUES & RAPPORTS (Priorité BASSE)

#### Fonctionnalités nécessitant synchronisation:
- **Statistiques agrégées** : Données consolidées de tous les utilisateurs (anonymisées)
- **Rapports partagés** : Rapports partageables entre utilisateurs

#### Endpoints API nécessaires:

```typescript
// STATISTIQUES
GET    /api/statistics/global                  // Statistiques globales (anonymisées)
GET    /api/statistics/regional                // Statistiques régionales
GET    /api/statistics/trends                  // Tendances du marché

// RAPPORTS
GET    /api/reports                            // Liste des rapports
GET    /api/reports/:id                        // Détails d'un rapport
POST   /api/reports                            // Créer un rapport
POST   /api/reports/:id/share                  // Partager un rapport
```

#### Services Frontend concernés:
- `src/services/StatisticsService.ts`
- `src/services/exportService.ts`
- `src/services/pdfService.ts`

---

## 🏗️ Architecture Backend Recommandée

### Stack Technique

```typescript
// Backend Framework
NestJS (TypeScript)  // Déjà utilisé dans backend/

// Base de données
PostgreSQL           // Pour la production (multi-utilisateurs)
SQLite               // Pour développement local

// WebSocket
Socket.io            // Pour chat en temps réel

// Authentification
JWT                  // Tokens d'authentification
Passport.js          // Stratégies d'auth (local, JWT, OAuth)

// File Storage
AWS S3 / Cloudinary  // Pour les photos de profil, animaux, etc.

// Cache
Redis                // Pour cache et sessions

// Queue
Bull / BullMQ        // Pour tâches asynchrones (notifications, etc.)
```

### Structure des Modules NestJS

```
backend/
├── src/
│   ├── auth/                    # Authentification
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   └── guards/
│   │
│   ├── users/                   # Gestion des utilisateurs
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── entities/
│   │
│   ├── marketplace/             # Marketplace
│   │   ├── listings/
│   │   ├── offers/
│   │   ├── transactions/
│   │   ├── purchase-requests/
│   │   └── notifications/
│   │
│   ├── chat/                    # Chat en temps réel
│   │   ├── chat.controller.ts
│   │   ├── chat.gateway.ts     # WebSocket Gateway
│   │   └── chat.service.ts
│   │
│   ├── collaborations/           # Collaboration
│   │   ├── collaborations.controller.ts
│   │   └── collaborations.service.ts
│   │
│   ├── sync/                    # Synchronisation
│   │   ├── sync.controller.ts
│   │   └── sync.service.ts
│   │
│   ├── notifications/           # Notifications push
│   │   ├── notifications.controller.ts
│   │   └── notifications.service.ts
│   │
│   ├── database/               # Configuration DB
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   │
│   └── common/                 # Utilitaires communs
│       ├── decorators/
│       ├── filters/
│       ├── guards/
│       └── interceptors/
│
├── test/                       # Tests
└── dist/                       # Code compilé
```

---

## 🔄 Migration Frontend → Backend

### Étape 1: Configuration API

Créer un fichier de configuration pour l'API backend:

```typescript
// src/config/api.config.ts
export const API_CONFIG = {
  baseURL: __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://api.fermier-pro.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### Étape 2: Service API Client

Créer un service HTTP client:

```typescript
// src/services/api/apiClient.ts
import axios from 'axios';
import { API_CONFIG } from '../../config/api.config';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken(); // À implémenter
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Étape 3: Adapter les Redux Thunks

Modifier les async thunks pour utiliser l'API au lieu de SQLite:

```typescript
// Exemple: src/store/slices/marketplaceSlice.ts
export const searchListings = createAsyncThunk(
  'marketplace/searchListings',
  async (params: SearchParams, { rejectWithValue }) => {
    try {
      // AVANT (SQLite local)
      // const db = await getDatabase();
      // const service = getMarketplaceService(db);
      // return await service.searchListings(...);

      // APRÈS (API Backend)
      const response = await apiClient.get('/marketplace/listings', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Étape 4: Mode Hybride (Transition)

Pendant la transition, permettre un mode hybride:

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_BACKEND_API: false, // Activer progressivement
  USE_BACKEND_MARKETPLACE: false,
  USE_BACKEND_CHAT: false,
  // ...
};
```

---

## 📋 Checklist de Mise en Place

### Phase 1: Infrastructure (Semaine 1-2)
- [ ] Configurer NestJS avec PostgreSQL
- [ ] Mettre en place l'authentification JWT
- [ ] Créer les modules de base (auth, users)
- [ ] Configurer WebSocket (Socket.io)
- [ ] Mettre en place le système de fichiers (S3/Cloudinary)

### Phase 2: Marketplace (Semaine 3-4)
- [ ] Implémenter les endpoints listings
- [ ] Implémenter les endpoints offers
- [ ] Implémenter les endpoints transactions
- [ ] Implémenter les endpoints purchase-requests
- [ ] Adapter le frontend pour utiliser l'API

### Phase 3: Chat (Semaine 5)
- [ ] Implémenter le WebSocket Gateway
- [ ] Créer les endpoints REST pour chat
- [ ] Adapter le frontend pour WebSocket
- [ ] Tester la communication en temps réel

### Phase 4: Synchronisation (Semaine 6-7)
- [ ] Implémenter le système de sync
- [ ] Gérer les conflits
- [ ] Adapter tous les Redux thunks
- [ ] Tester la synchronisation multi-appareils

### Phase 5: Fonctionnalités Avancées (Semaine 8+)
- [ ] Notifications push
- [ ] Services vétérinaires
- [ ] Statistiques agrégées
- [ ] Optimisations et cache

---

## 🔒 Sécurité

### Points à implémenter:

1. **Authentification**
   - JWT avec refresh tokens
   - Rate limiting
   - Validation des entrées

2. **Autorisation**
   - Guards NestJS pour protéger les routes
   - Vérification des permissions par rôle
   - Validation de propriété des ressources

3. **Données sensibles**
   - Chiffrement des données sensibles
   - Validation et sanitization des entrées
   - Protection CSRF

4. **API**
   - Rate limiting par utilisateur
   - CORS configuré correctement
   - Headers de sécurité

---

## 📊 Métriques & Monitoring

### À implémenter:

- **Logging** : Winston ou Pino
- **Monitoring** : Prometheus + Grafana
- **Error Tracking** : Sentry
- **Performance** : APM (Application Performance Monitoring)
- **Analytics** : Suivi des utilisations d'API

---

## 🚀 Déploiement

### Environnements:

1. **Development** : Local (localhost:3000)
2. **Staging** : Serveur de test
3. **Production** : Cloud (AWS, GCP, Azure, ou DigitalOcean)

### Infrastructure recommandée:

- **Conteneurs** : Docker + Docker Compose
- **Orchestration** : Kubernetes (si besoin de scalabilité)
- **CI/CD** : GitHub Actions / GitLab CI
- **Database** : PostgreSQL managé (AWS RDS, etc.)
- **Cache** : Redis managé
- **CDN** : CloudFront / Cloudflare

---

## 📝 Notes Importantes

1. **Compatibilité ascendante** : Le frontend doit continuer à fonctionner en mode local pendant la transition
2. **Migration progressive** : Activer les fonctionnalités backend une par une
3. **Tests** : Tester chaque endpoint avant de l'activer en production
4. **Documentation** : Documenter tous les endpoints avec Swagger/OpenAPI
5. **Versioning** : Utiliser le versioning d'API (`/api/v1/...`)

---

## 🔗 Références

- **Frontend Services** : `fermier-pro/src/services/`
- **Redux Slices** : `fermier-pro/src/store/slices/`
- **Backend Existant** : `fermier-pro/backend/dist/` (compilé)
- **Admin Web** : `fermier-pro/admin-web/` (serveur Express simple)

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08  
**Auteur** : Analyse automatique du codebase

