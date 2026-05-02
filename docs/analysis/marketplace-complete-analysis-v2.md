# Analyse Complète du Module MARKETPLACE - Version 2
**Après Migration des Notifications et Améliorations de Sécurité**

**Date d'analyse** : 2026-01-XX  
**Version** : 2.0.0  
**Statut** : ✅ Analyse complète post-refactoring

---

## 📋 Résumé Exécutif

Cette analyse complète et approfondie du module MARKETPLACE a été réalisée après les modifications récentes qui ont migré toutes les méthodes de notification vers le `NotificationsService` dédié et ajouté des améliorations de sécurité (rate limiting, validation XSS, UUID).

### Changements Récents ✅
1. **Migration complète des notifications** : Toutes les méthodes legacy (`MarketplaceService.createNotification`, `SaleAutomationService.createNotification`) ont été migrées vers `NotificationsService`
2. **Améliorations de sécurité** :
   - Génération d'ID avec UUID v4 (remplace `Math.random()`)
   - Rate limiting sur tous les endpoints de notifications
   - Validation personnalisée `@IsActionUrl()` pour prévenir XSS
3. **Nettoyage du code** : Suppression des méthodes obsolètes (`mapRowToNotification`, `findAllNotifications`, `markNotificationAsRead` de `MarketplaceService`)

---

## 🏗️ Architecture Actuelle

### Structure Backend

```
backend/src/marketplace/
├── marketplace.module.ts              # Module NestJS (27 lignes)
├── marketplace.controller.ts          # Contrôleur REST API (1,041 lignes, 40+ endpoints)
├── marketplace.service.ts             # Service principal legacy (4,113 lignes) ⚠️ TROP GROS
├── marketplace-unified.service.ts     # Service unifié (individuel + bande)
├── notifications.service.ts           # Service de notifications (185 lignes) ✅ DÉDIÉ
├── sale-automation.service.ts         # Service d'automatisation (488 lignes)
├── marketplace.service.ts.backup      # Fichier backup ⚠️ À SUPPRIMER
├── dto/                               # 14 DTOs + validators
│   ├── notification.dto.ts            # ✅ Enum NotificationType étendu
│   ├── validators/
│   │   └── action-url.validator.ts    # ✅ Nouveau validateur XSS
│   └── ...
└── migrations/
    └── add-marketplace-indexes.sql
```

**Total Backend** : ~6,876 lignes de code TypeScript (hors DTOs détaillés)

### Services Backend

| Service | Lignes | Statut | Description |
|---------|--------|--------|-------------|
| `MarketplaceService` | 4,113 | ⚠️ Legacy | Service principal, très volumineux, migration en cours vers `MarketplaceUnifiedService` |
| `MarketplaceUnifiedService` | ~500 | ✅ Actif | Service unifié pour gérer individuel + batch |
| `NotificationsService` | 185 | ✅ **DÉDIÉ** | Service dédié aux notifications, toutes les méthodes legacy migrées |
| `SaleAutomationService` | 488 | ✅ Actif | Automatisation des ventes, utilise maintenant `NotificationsService` |
| `MarketplaceController` | 1,041 | ✅ Actif | 40+ endpoints REST, rate limiting sur notifications |

---

## 🔌 Endpoints API Backend

### Inventaire Complet des Endpoints

#### LISTINGS (10 endpoints)
- `POST /marketplace/listings` - Créer annonce individuelle (✅ Unified)
- `POST /marketplace/listings/batch` - Créer annonce batch (✅ Unified)
- `GET /marketplace/listings` - Récupérer toutes les annonces (pagination, filtres)
- `GET /marketplace/listings/:id` - Détails d'une annonce
- `GET /marketplace/animals/:animalId` - Infos publiques d'un animal
- `GET /marketplace/listings/:listingId/subjects` - Sujets d'un listing
- `POST /marketplace/listings/details` - Plusieurs listings avec détails
- `PATCH /marketplace/listings/:id` - Mettre à jour (✅ Unified)
- `DELETE /marketplace/listings/:id` - Supprimer (✅ Unified)
- `POST /marketplace/listings/:listingId/complete-sale` - Finaliser vente

#### OFFERS (7 endpoints)
- `POST /marketplace/offers` - Créer une offre
- `GET /marketplace/offers` - Récupérer toutes les offres (filtre `listing_id`)
- `PATCH /marketplace/offers/:id/accept` - Accepter une offre
- `PATCH /marketplace/offers/:id/counter` - Contre-proposition
- `PATCH /marketplace/offers/:id/reject` - Rejeter une offre
- `GET /marketplace/my-offers` - Mes offres (acheteur)
- `GET /marketplace/my-received-offers` - Offres reçues (vendeur)

#### INQUIRIES (3 endpoints)
- `POST /marketplace/listings/:listingId/inquiries` - Créer une inquiry
- `GET /marketplace/listings/:listingId/inquiries` - Récupérer les inquiries
- `PATCH /marketplace/inquiries/:inquiryId` - Mettre à jour une inquiry
- `POST /marketplace/inquiries/:inquiryId/accept` - Accepter et finaliser

#### TRANSACTIONS (2 endpoints)
- `GET /marketplace/transactions` - Récupérer toutes les transactions
- `PATCH /marketplace/transactions/:id/confirm-delivery` - Confirmer livraison

#### RATINGS (2 endpoints)
- `POST /marketplace/ratings` - Créer une notation
- `GET /marketplace/ratings` - Récupérer toutes les notations (filtre `producer_id`)

#### PURCHASE REQUESTS (7 endpoints)
- `POST /marketplace/purchase-requests` - Créer une demande d'achat
- `GET /marketplace/purchase-requests` - Récupérer (filtres `buyer_id`, `status`)
- `GET /marketplace/purchase-requests/sent` - Demandes envoyées
- `GET /marketplace/purchase-requests/received` - Demandes reçues
- `GET /marketplace/purchase-requests/:id` - Détails d'une demande
- `PATCH /marketplace/purchase-requests/:id` - Mettre à jour
- `DELETE /marketplace/purchase-requests/:id` - Supprimer

#### NOTIFICATIONS (6 endpoints) ✅ AMÉLIORÉS
- `POST /marketplace/notifications` - Créer notification manuellement (⚠️ Tests uniquement)
- `GET /marketplace/notifications` - Récupérer notifications (filtre `unreadOnly`)
- `GET /marketplace/notifications/unread-count` - Compteur non lues
- `PATCH /marketplace/notifications/mark-read` - Marquer comme lues (batch)
- `PATCH /marketplace/notifications/mark-all-read` - Marquer toutes comme lues
- `DELETE /marketplace/notifications/:notificationId` - Supprimer

**Tous les endpoints de notifications ont maintenant** :
- ✅ Rate limiting (`@Throttle`)
- ✅ Validation `actionUrl` avec `@IsActionUrl()`
- ✅ Utilisation de `NotificationsService` (plus de code legacy)

#### PHOTOS (3 endpoints)
- `POST /marketplace/listings/:listingId/photos` - Upload photo(s)
- `DELETE /marketplace/listings/:listingId/photos/:photoId` - Supprimer photo
- `GET /marketplace/listings/:listingId/photos` - Récupérer photos

**Total** : **40+ endpoints REST**

---

## 🗄️ Base de Données

### Tables Marketplace

#### 1. `marketplace_listings`
- **Migrations** : `030_*`, `052_*`, `063_*`, `064_*`
- **Colonnes principales** :
  - `id`, `subject_id` (nullable pour batch), `producer_id`, `farm_id`
  - `listing_type` : `'individual' | 'batch'`
  - `batch_id`, `pig_ids` (JSONB), `pig_count`, `weight`
  - `price_per_kg`, `calculated_price`, `status`
  - `location_*`, `sale_terms` (JSONB)
  - `photos` (JSONB array)
- **Index** : 15+ index (producer, farm, status, location, batch, etc.)

#### 2. `marketplace_offers`
- **Migrations** : `031_*`, `067_*` (counter offers)
- **Nouveautés** : `counter_offer_of`, `date_recuperation_souhaitee`, `prix_total_final`
- **Index** : `counter_offer_of`, `date_recuperation`

#### 3. `marketplace_transactions`
- **Migrations** : `032_*`, `068_*` (ventes)
- **Nouveautés** : `vente_id`, `revenu_id`, `poids_total`, `nombre_sujets`, `date_vente`

#### 4. `marketplace_ratings`
- **Migration** : `033_*`

#### 5. `marketplace_notifications` ✅ AMÉLIORÉ
- **Migration** : `034_*`, `065_*`
- **Colonnes** :
  - `id` : TEXT PRIMARY KEY (✅ Maintenant généré avec UUID v4)
  - `user_id`, `type`, `title`, `message`, `body`
  - `related_id`, `related_type`
  - `read`, `action_url` (✅ Validé avec `@IsActionUrl()`)
  - `created_at`, `read_at`
- **Types ENUM** :
  - `notification_type` : `'offer_received' | 'offer_accepted' | 'offer_rejected' | 'offer_countered' | 'offer_withdrawn' | 'message_received' | 'listing_sold' | 'listing_expired' | 'purchase_request_match' | 'vente_confirmee' | 'achat_confirme'`
  - `notification_related_type` : `'offer' | 'transaction' | 'message' | 'rating'`
- **Index** : `user_id`, `read`, `created_at`, `(related_id, related_type)`

### Migrations Marketplace

| Migration | Description | Impact |
|-----------|-------------|--------|
| `030_*` | Création table `marketplace_listings` | Base |
| `031_*` | Création table `marketplace_offers` | Base |
| `032_*` | Création table `marketplace_transactions` | Base |
| `033_*` | Création table `marketplace_ratings` | Base |
| `034_*` | Création table `marketplace_notifications` | Base |
| `052_*` | Support batch dans listings | Important |
| `063_*` | Uniformisation batch support | Important |
| `064_*` | Ajout photos dans view | Amélioration |
| `065_*` | Migration notifications | ✅ Récent |
| `067_*` | Counter offers | Fonctionnalité |
| `068_*` | Intégration ventes | Intégration |

**Total** : 11 migrations marketplace

---

## 💻 Frontend

### Structure Frontend

```
src/
├── screens/marketplace/
│   └── MarketplaceScreen.tsx          # Écran principal (1,639 lignes) ⚠️ TROP GROS
├── components/marketplace/
│   ├── tabs/
│   │   ├── MarketplaceBuyTab.tsx
│   │   ├── MarketplaceMyListingsTab.tsx
│   │   ├── MarketplaceOffersTab.tsx
│   │   ├── MarketplaceRequestsTab.tsx
│   │   ├── MarketplaceMatchedRequestsTab.tsx
│   │   └── MarketplaceMyPurchaseRequestsTab.tsx
│   ├── CreatePurchaseRequestModal.tsx
│   ├── CreatePurchaseRequestOfferModal.tsx
│   ├── AddListingModal.tsx
│   └── ...
├── services/
│   ├── MarketplaceService.ts          # Service frontend (1,673 lignes)
│   ├── PurchaseRequestService.ts      # Service purchase requests (615 lignes)
│   └── notificationsService.ts        # Service notifications (181 lignes) ✅
├── hooks/
│   ├── useMarketplace.ts              # Hook marketplace
│   ├── useMarketplaceNotifications.ts # Hook notifications (235 lignes)
│   └── ...
├── database/repositories/
│   ├── MarketplaceListingRepository.ts
│   ├── MarketplaceRepositories.ts     # Offers, Transactions, Ratings, Notifications, Chat
│   └── PurchaseRequestRepository.ts
└── store/slices/
    └── marketplaceSlice.ts            # Redux slice
```

### Services Frontend

#### 1. `notificationsService.ts` ✅ CONFORME
- **Méthodes** : 
  - `getNotifications(unreadOnly)` → `GET /marketplace/notifications`
  - `getUnreadCount()` → `GET /marketplace/notifications/unread-count`
  - `markAsRead(notificationIds)` → `PATCH /marketplace/notifications/mark-read`
  - `markAllAsRead()` → `PATCH /marketplace/notifications/mark-all-read`
  - `deleteNotification(notificationId)` → `DELETE /marketplace/notifications/:id`

#### 2. `MarketplaceService.ts` (Frontend)
- **Classe** : Utilise des repositories frontend
- **Méthodes principales** : `createListing`, `searchListings`, `createOffer`, etc.
- **Statut** : ⚠️ Utilise des repositories qui appellent l'API backend (double couche)

#### 3. `PurchaseRequestService.ts`
- **Classe** : Service dédié aux purchase requests
- **Méthodes** : Matching, création, recherche, etc.

### Hooks Frontend

#### `useMarketplaceNotifications.ts`
- **Fonctionnalités** :
  - Chargement automatique des notifications
  - Polling configurable (60s par défaut)
  - Gestion état local (notifications, unreadCount)
  - Actions : `markAsRead`, `markAllAsRead`, `deleteNotification`
- **⚠️ PROBLÈME IDENTIFIÉ** : 
  - Lignes 147-152 : `markAllAsRead()` utilise un workaround obsolète :
    ```typescript
    const allNotifications = await apiClient.get<any[]>('/marketplace/notifications');
    await Promise.all(
      allNotifications.filter((n) => !n.read).map((n) => apiClient.patch(`/marketplace/notifications/${n.id}/read`))
    );
    ```
  - **DOIT utiliser** : `PATCH /marketplace/notifications/mark-all-read` (qui existe maintenant !)

---

## 🔍 Analyse des Appels API Frontend vs Backend

### Mapping Endpoints

| Endpoint Backend | Utilisation Frontend | Statut |
|------------------|----------------------|--------|
| `GET /marketplace/listings` | ✅ Utilisé partout | OK |
| `POST /marketplace/listings` | ✅ `AddListingModal.tsx` | OK |
| `POST /marketplace/listings/batch` | ✅ `AddListingModal.tsx` | OK |
| `GET /marketplace/listings/:id` | ✅ Multiples usages | OK |
| `GET /marketplace/notifications` | ✅ `notificationsService.ts`, `useMarketplaceNotifications.ts` | OK |
| `GET /marketplace/notifications/unread-count` | ✅ `notificationsService.ts` | OK |
| `PATCH /marketplace/notifications/mark-read` | ✅ `notificationsService.ts` | OK |
| `PATCH /marketplace/notifications/mark-all-read` | ⚠️ **NON UTILISÉ** (workaround obsolète dans `useMarketplaceNotifications.ts`) | ❌ À CORRIGER |
| `DELETE /marketplace/notifications/:id` | ✅ `notificationsService.ts` | OK |
| `GET /marketplace/purchase-requests` | ✅ Multiples usages | OK |
| `GET /marketplace/purchase-requests/sent` | ✅ `MarketplaceRequestsTab.tsx` | OK |
| `GET /marketplace/purchase-requests/received` | ✅ `MarketplaceRequestsTab.tsx` | OK |
| `GET /marketplace/offers` | ✅ Multiples usages | OK |
| `GET /marketplace/my-offers` | ✅ `MarketplaceService.ts` | OK |
| `GET /marketplace/my-received-offers` | ✅ `MarketplaceService.ts` | OK |
| `POST /marketplace/price-trends` | ⚠️ `PorkPriceTrendService.ts` (endpoint n'existe pas backend) | ❌ ENDPOINT MANQUANT |

### Endpoints Backend NON Utilisés Frontend

Aucun endpoint backend majeur non utilisé (sauf `POST /marketplace/notifications` qui est pour tests uniquement).

### Appels Frontend vers Endpoints Inexistants

- ❌ `POST /marketplace/price-trends` : Appelé par `PorkPriceTrendService.ts` mais endpoint n'existe pas dans `MarketplaceController`

---

## 🗑️ Code Obsolète / Orphelin / Inutilisé

### Backend

#### 1. ⚠️ `marketplace.service.ts.backup`
- **Fichier** : `backend/src/marketplace/marketplace.service.ts.backup`
- **Statut** : Backup obsolète
- **Action** : **À SUPPRIMER**

#### 2. ⚠️ `mapRowToNotification()` dans `MarketplaceService`
- **Fichier** : `backend/src/marketplace/marketplace.service.ts`
- **Ligne** : 1729-1744
- **Statut** : Méthode privée non utilisée (remplacée par `NotificationsService`)
- **Action** : **À SUPPRIMER**

#### 3. ⚠️ Section NOTIFICATIONS vide dans `MarketplaceController`
- **Fichier** : `backend/src/marketplace/marketplace.controller.ts`
- **Lignes** : 537-540
- **Statut** : Section commentaire vide (toutes les méthodes sont maintenant dans la section dédiée plus bas)
- **Action** : **À NETTOYER** (supprimer section vide)

### Frontend

#### 1. ⚠️ Workaround obsolète dans `useMarketplaceNotifications.ts`
- **Fichier** : `src/hooks/useMarketplaceNotifications.ts`
- **Lignes** : 141-160 (méthode `markAllAsRead`)
- **Problème** : Utilise un workaround (GET toutes + PATCH individuels) au lieu d'utiliser `PATCH /marketplace/notifications/mark-all-read`
- **Action** : **À CORRIGER** pour utiliser l'endpoint dédié

#### 2. ⚠️ `MarketplaceService` (Frontend) - Double couche
- **Fichier** : `src/services/MarketplaceService.ts`
- **Problème** : Service frontend qui utilise des repositories qui appellent l'API backend (double couche inutile)
- **Statut** : Utilisé mais pourrait être simplifié
- **Action** : **À ÉVALUER** (refactoring optionnel)

---

## 🔐 Sécurité

### Améliorations Récentes ✅

1. **Génération d'ID sécurisée**
   - ✅ Avant : `notif_${Date.now()}_${Math.random()}`
   - ✅ Après : `notif_${uuidv4()}` (UUID v4)
   - **Fichier** : `backend/src/marketplace/notifications.service.ts`

2. **Rate Limiting sur Notifications**
   - ✅ `POST /notifications` : 10/min
   - ✅ `GET /notifications` : 30/min
   - ✅ `GET /notifications/unread-count` : 60/min
   - ✅ `PATCH /notifications/mark-read` : 20/min
   - ✅ `PATCH /notifications/mark-all-read` : 5/min
   - ✅ `DELETE /notifications/:id` : 20/min
   - **Fichier** : `backend/src/marketplace/marketplace.controller.ts`

3. **Validation XSS `actionUrl`**
   - ✅ Validateur personnalisé `@IsActionUrl()`
   - ✅ Vérifie : chemin relatif, pas de protocoles externes, pas de caractères dangereux
   - **Fichier** : `backend/src/marketplace/dto/validators/action-url.validator.ts`

### Points Sécurisés Existants ✅

- ✅ JWT Auth sur tous les endpoints (`@UseGuards(JwtAuthGuard)`)
- ✅ Validation DTOs avec `class-validator`
- ✅ Vérification `user_id` dans toutes les méthodes (pas de cross-user)
- ✅ Foreign keys avec `ON DELETE CASCADE`
- ✅ Paramètres SQL avec placeholders (pas d'injection SQL)

### Points d'Attention ⚠️

1. ⚠️ **Rate limiting manquant** sur autres endpoints critiques (listings, offers, transactions)
2. ⚠️ **Validation entrées** : Renforcer validation côté serveur pour listings, offres, demandes d'achat
3. ⚠️ **RBAC** : Vérifier que toutes les routes sensibles vérifient correctement les rôles (ex: seul propriétaire peut modifier son listing)

---

## 📊 Métriques et Performance

### Taille du Code

| Composant | Lignes | Statut |
|-----------|--------|--------|
| Backend Total | ~6,876 | |
| `MarketplaceService` | 4,113 | ⚠️ TROP GROS |
| `MarketplaceController` | 1,041 | OK |
| `NotificationsService` | 185 | ✅ Bon |
| Frontend `MarketplaceScreen.tsx` | 1,639 | ⚠️ TROP GROS |
| Frontend `MarketplaceService.ts` | 1,673 | ⚠️ TROP GROS |

### Endpoints

- **Total** : 40+ endpoints REST
- **Rate limiting** : 6 endpoints (notifications uniquement)
- **Validation XSS** : 1 champ (`actionUrl`)

### Base de Données

- **Tables marketplace** : 5 tables principales
- **Migrations** : 11 migrations marketplace
- **Index** : 15+ index sur `marketplace_listings` seul

---

## 🐛 Problèmes Identifiés

### Critique 🔴

1. **Workaround obsolète dans `useMarketplaceNotifications.ts`**
   - **Impact** : Performance dégradée (N+1 requêtes au lieu d'1)
   - **Fichier** : `src/hooks/useMarketplaceNotifications.ts:141-160`
   - **Solution** : Utiliser `PATCH /marketplace/notifications/mark-all-read`

### Important ⚠️

2. **Fichier backup non supprimé**
   - **Impact** : Pollution du codebase
   - **Fichier** : `backend/src/marketplace/marketplace.service.ts.backup`
   - **Solution** : Supprimer

3. **Méthode obsolète `mapRowToNotification()`**
   - **Impact** : Code mort
   - **Fichier** : `backend/src/marketplace/marketplace.service.ts:1729-1744`
   - **Solution** : Supprimer

4. **Section NOTIFICATIONS vide dans controller**
   - **Impact** : Code confus
   - **Fichier** : `backend/src/marketplace/marketplace.controller.ts:537-540`
   - **Solution** : Supprimer

5. **Endpoint `POST /marketplace/price-trends` manquant**
   - **Impact** : Erreur silencieuse dans `PorkPriceTrendService.ts`
   - **Fichier** : `src/services/PorkPriceTrendService.ts:219`
   - **Solution** : Créer endpoint ou supprimer appel

### Mineur 🟡

6. **`MarketplaceService` (Frontend) double couche**
   - **Impact** : Complexité inutile
   - **Solution** : Refactoring optionnel

7. **`MarketplaceScreen.tsx` trop volumineux (1,639 lignes)**
   - **Impact** : Maintenabilité
   - **Solution** : Extraire sous-composants

8. **`MarketplaceService` (Backend) trop volumineux (4,113 lignes)**
   - **Impact** : Maintenabilité
   - **Solution** : Continuer migration vers `MarketplaceUnifiedService`

---

## ✅ Recommandations par Priorité

### Priorité HAUTE 🔴

1. **Corriger `markAllAsRead()` dans `useMarketplaceNotifications.ts`**
   - Utiliser `PATCH /marketplace/notifications/mark-all-read`
   - **Fichier** : `src/hooks/useMarketplaceNotifications.ts:141-160`
   - **Impact** : Performance (évite N+1 requêtes)

2. **Supprimer fichier backup**
   - Supprimer `backend/src/marketplace/marketplace.service.ts.backup`
   - **Impact** : Nettoyage codebase

3. **Supprimer méthode obsolète `mapRowToNotification()`**
   - Supprimer lignes 1729-1744 de `backend/src/marketplace/marketplace.service.ts`
   - **Impact** : Nettoyage code

4. **Nettoyer section NOTIFICATIONS vide dans controller**
   - Supprimer lignes 537-540 de `backend/src/marketplace/marketplace.controller.ts`
   - **Impact** : Clarté code

### Priorité MOYENNE ⚠️

5. **Créer ou supprimer endpoint `POST /marketplace/price-trends`**
   - Si nécessaire : Créer endpoint dans `MarketplaceController`
   - Sinon : Supprimer appel dans `PorkPriceTrendService.ts`
   - **Impact** : Éviter erreurs silencieuses

6. **Ajouter rate limiting sur endpoints critiques**
   - Listings (POST, PATCH, DELETE)
   - Offers (POST, PATCH)
   - Transactions (PATCH)
   - **Impact** : Sécurité

7. **Refactoriser `MarketplaceScreen.tsx`**
   - Extraire sous-composants
   - Réduire complexité
   - **Impact** : Maintenabilité

8. **Continuer migration vers `MarketplaceUnifiedService`**
   - Réduire `MarketplaceService` (backend)
   - **Impact** : Maintenabilité

### Priorité BASSE 🟡

9. **Tests unitaires et intégration**
   - Tests `NotificationsService`
   - Tests endpoints notifications
   - Tests E2E flux notifications
   - **Impact** : Qualité

10. **Améliorer gestion d'erreurs**
    - Types d'erreurs spécifiques
    - Messages utilisateur-friendly
    - **Impact** : UX

11. **WebSocket pour temps réel**
    - Implémenter Gateway NestJS
    - Remplacer polling par WebSocket
    - **Impact** : Performance, UX

12. **Pagination notifications**
    - Ajouter `limit` et `offset` params
    - Infinite scroll frontend
    - **Impact** : Performance

13. **Filtres avancés notifications**
    - Filtrer par type
    - Filtrer par date
    - Recherche
    - **Impact** : UX

---

## 🎯 Conclusion

### Points Forts ✅

1. ✅ **Architecture modulaire** : Services bien séparés
2. ✅ **NotificationsService dédié** : Toutes les méthodes legacy migrées
3. ✅ **Sécurité améliorée** : UUID, rate limiting, validation XSS
4. ✅ **Base de données solide** : Migrations structurées, index optimisés
5. ✅ **API REST complète** : 40+ endpoints bien documentés

### Points à Améliorer ⚠️

1. 🔴 **Workaround obsolète** : `markAllAsRead()` dans frontend
2. 🔴 **Code mort** : Méthode `mapRowToNotification()`, fichier backup
3. ⚠️ **Fichiers volumineux** : `MarketplaceService` (4,113 lignes), `MarketplaceScreen` (1,639 lignes)
4. ⚠️ **Rate limiting incomplet** : Uniquement sur notifications
5. ⚠️ **Endpoint manquant** : `POST /marketplace/price-trends`

### Score Global

- **Architecture** : 8/10 (✅ Bon, mais fichiers trop volumineux)
- **Sécurité** : 7/10 (✅ Améliorations récentes, mais rate limiting incomplet)
- **Maintenabilité** : 6/10 (⚠️ Code mort, fichiers volumineux)
- **Performance** : 7/10 (✅ Index DB, mais workaround N+1)
- **UX** : 7/10 (✅ Fonctionnel, mais améliorations possibles)

**Score Global** : **7/10** ⭐⭐⭐⭐⭐⭐⭐

---

**Fin de l'analyse**
