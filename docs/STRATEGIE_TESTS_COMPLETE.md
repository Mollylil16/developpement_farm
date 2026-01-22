# 🧪 Stratégie Complète de Tests - Fermier Pro

## 📊 État Actuel des Tests

### Frontend (React Native)
- ✅ **184 fichiers de tests** existants
- ✅ Tests unitaires pour services, hooks, composants
- ✅ Tests d'intégration pour certains use cases
- ⚠️ **Couverture partielle** - certains composants critiques manquent

### Backend (NestJS)
- ❌ **Aucun test** actuellement
- ⚠️ **Risque élevé** - code critique non testé

---

## 🎯 Composants Critiques Identifiés

### 🔴 Priorité 1 : Fonctionnalités à Haut Risque

#### 1. Marketplace (Transactions Financières)
- **Services critiques** :
  - `MarketplaceService.createOffer()` - Création d'offres
  - `MarketplaceService.acceptOffer()` - Acceptation d'offres (création transaction)
  - `MarketplaceService.getListingsWithSubjects()` - Récupération sujets (bug récent corrigé)
  - `MarketplaceUnifiedService` - Service unifié listings
  - `SaleAutomationService` - Automatisation ventes
  
- **Risques** :
  - Erreurs de calcul de prix
  - Problèmes de permissions (acheteur ne peut pas acheter ses propres sujets)
  - Bugs SQL (pig_ids JSONB, table incorrecte - déjà corrigés mais besoin de tests)
  - Transactions non atomiques

#### 2. Authentification & Autorisation
- **Services critiques** :
  - `AuthService.login()` / `register()`
  - `JwtStrategy.validate()`
  - `RolesGuard.canActivate()`
  - `JwtAuthGuard`
  
- **Risques** :
  - Fuites de données sensibles
  - Accès non autorisé
  - Tokens expirés/invalides non gérés

#### 3. Finance (Calculs Financiers)
- **Services critiques** :
  - `FinanceService.getSoldeByPeriod()`
  - `CalculateFinancialBalanceUseCase`
  - Calculs de charges fixes
  - Validation des montants
  
- **Risques** :
  - Erreurs de calcul
  - Arrondis incorrects
  - Périodes invalides

#### 4. Collaborations (Permissions)
- **Services critiques** :
  - `CollaborationsService` - Gestion permissions
  - Vérification accès vétérinaires/techniciens
  
- **Risques** :
  - Accès non autorisé aux données
  - Permissions incorrectes

### 🟡 Priorité 2 : Chemins Critiques Utilisateur

#### 5. Production (Gestion Animaux)
- Création/modification animaux
- Calculs de poids, GMQ
- Gestion batch vs individuel

#### 6. Santé (Vaccinations, Maladies)
- Création vaccinations
- Alertes sanitaires
- Recommandations

#### 7. Chat Agent (IA Conversationnelle)
- Actions critiques (création revenus/dépenses)
- Validation données
- Gestion erreurs

---

## 📋 Plan de Tests par Catégorie

### 1. Tests Unitaires des Composants Critiques

#### Backend - Marketplace Service

**Tests à créer** :
- ✅ `createOffer()` - Cas nominaux et limites
- ✅ `acceptOffer()` - Validation permissions, création transaction
- ✅ `getListingsWithSubjects()` - Test du bug corrigé (pig_ids JSONB, batch_pigs)
- ✅ `getListingSubjects()` - Gestion erreurs, cache
- ✅ `canUserMakeOffer()` - Validation règles métier

**Tests à créer** :
- ✅ `createUnifiedListing()` - Listings individuels et batch
- ✅ `updateUnifiedListing()` - Mise à jour sécurisée
- ✅ `deleteUnifiedListing()` - Vérification offres en attente

#### Backend - Auth Service

**Tests à créer** :
- ✅ `login()` - Cas nominaux, mauvais credentials, utilisateur inexistant
- ✅ `register()` - Validation données, doublons email
- ✅ `validateToken()` - Token valide, expiré, invalide
- ✅ `refreshToken()` - Rotation tokens, blacklist

#### Backend - Finance Service

**Tests à créer** :
- ✅ `getSoldeByPeriod()` - Calculs corrects, périodes invalides
- ✅ `calculateChargesFixesForPeriod()` - Calculs mensuels
- ✅ Validation montants (négatifs, décimaux, très grands nombres)

#### Frontend - Marketplace Components

**Tests à créer** :
- ✅ `MarketplaceScreen.handleMakeOfferFromFarm()` - Test du bug corrigé
- ✅ `FarmDetailsModal.handleMakeOffer()` - Validation originalListingId
- ✅ `OfferModal` - Validation formulaires, soumission

---

### 2. Tests d'Intégration

#### Backend - Marketplace Flow

**Tests à créer** :
- ✅ Flux complet : Création listing → Offre → Acceptation → Transaction
- ✅ Intégration avec base de données (PostgreSQL)
- ✅ Vérification cohérence données (listings, offers, transactions)
- ✅ Test du bug corrigé : getListingsWithSubjects avec batch listings

#### Backend - Auth Flow

**Tests à créer** :
- ✅ Inscription → Login → Accès route protégée
- ✅ Refresh token → Nouveau access token
- ✅ Logout → Token blacklisté

#### Frontend - Marketplace Flow

**Tests à créer** :
- ✅ Sélection sujets → Création offre → Soumission
- ✅ Intégration avec API backend
- ✅ Gestion erreurs réseau

---

### 3. Tests Fonctionnels (End-to-End)

**Scénarios critiques à tester** :

1. **Parcours Achat Marketplace** (Bug récent)
   - Ouvrir marketplace
   - Sélectionner sujets batch
   - Faire une offre
   - Vérifier que le modal s'ouvre (bug corrigé)

2. **Parcours Vente Marketplace**
   - Créer listing batch
   - Recevoir offre
   - Accepter offre
   - Vérifier transaction créée

3. **Parcours Finance**
   - Créer revenu
   - Créer dépense
   - Vérifier solde calculé correctement

4. **Parcours Collaboration**
   - Inviter vétérinaire
   - Vérifier permissions
   - Accès aux données

---

### 4. Tests de Régression

**Bugs déjà rencontrés à tester** :

1. ✅ **Bug Marketplace - getListingsWithSubjects retourne vide**
   - Test : Listing batch avec pig_ids JSONB
   - Test : Vérification table batch_pigs vs production_animaux
   - Test : Conversion JSONB → array PostgreSQL

2. ✅ **Bug Marketplace - originalListingId manquant**
   - Test : Listings virtuels ont originalListingId
   - Test : Construction listingIds correcte

3. ✅ **Bug Photo Upload - URL incorrecte**
   - Test : URL générée avec Host header
   - Test : Environnement dev vs prod

4. ✅ **Bug Ingredients - Duplication**
   - Test : Pas de duplication lors enrichissement
   - Test : Double-check avant création

---

### 5. Tests de Validation Métier

**Règles métier critiques** :

1. **Marketplace** :
   - ✅ Un utilisateur ne peut pas acheter ses propres sujets
   - ✅ Une offre ne peut être faite que sur listings 'available'
   - ✅ Un listing ne peut être supprimé s'il a des offres 'pending'
   - ✅ Calcul prix = poids × prix_au_kg

2. **Finance** :
   - ✅ Montants ne peuvent pas être négatifs
   - ✅ Solde = revenus - dépenses - charges_fixes
   - ✅ Charges fixes calculées par mois

3. **Permissions** :
   - ✅ Vétérinaires/techniciens ont accès limité
   - ✅ Producteurs ont accès complet à leurs projets

---

## 🚀 Plan d'Implémentation Priorisé

### Phase 1 : Tests Backend Critiques (Semaine 1)

1. **Marketplace Service** (Priorité absolue - bug récent)
   - Tests unitaires `getListingsWithSubjects()` 
   - Tests unitaires `createOffer()` / `acceptOffer()`
   - Tests d'intégration flux complet

2. **Auth Service** (Sécurité)
   - Tests unitaires login/register
   - Tests guards et stratégies

3. **Finance Service** (Calculs critiques)
   - Tests unitaires calculs
   - Tests validation montants

### Phase 2 : Tests Frontend Manquants (Semaine 2)

1. **Marketplace Components**
   - Tests `MarketplaceScreen` (bug corrigé)
   - Tests `FarmDetailsModal`
   - Tests `OfferModal`

2. **Services Frontend**
   - Tests `MarketplaceService` (appels API)
   - Tests gestion erreurs

### Phase 3 : Tests E2E (Semaine 3)

1. **Scénarios critiques**
   - Parcours achat marketplace
   - Parcours vente marketplace
   - Parcours finance

### Phase 4 : Tests de Régression (Semaine 4)

1. **Bugs corrigés**
   - Tests pour chaque bug rencontré
   - Automatisation CI/CD

---

## 📝 Structure des Tests

### Backend (NestJS)

```
backend/src/
  marketplace/
    __tests__/
      marketplace.service.spec.ts          # Tests unitaires
      marketplace.integration.spec.ts       # Tests intégration
      marketplace.e2e.spec.ts              # Tests E2E
  auth/
    __tests__/
      auth.service.spec.ts
      jwt.strategy.spec.ts
      roles.guard.spec.ts
  finance/
    __tests__/
      finance.service.spec.ts
```

### Frontend (React Native)

```
src/
  screens/marketplace/
    __tests__/
      MarketplaceScreen.test.tsx            # Tests bug corrigé
  components/marketplace/
    __tests__/
      FarmDetailsModal.test.tsx
      OfferModal.test.tsx
  services/
    __tests__/
      MarketplaceService.test.ts            # Tests API calls
```

---

## 🎯 Métriques de Succès

- **Couverture Backend** : > 80% (actuellement 0%)
- **Couverture Frontend** : > 85% (actuellement ~60%)
- **Tests critiques** : 100% des fonctionnalités à haut risque
- **Tests régression** : 100% des bugs corrigés

---

## 🔧 Outils et Configuration

### Backend
- **Framework** : Jest + @nestjs/testing
- **Configuration** : À créer (`jest.config.js` dans backend/)
- **Mocking** : DatabaseService mocké pour tests unitaires
- **E2E** : Supertest pour tests API

### Frontend
- **Framework** : Jest + React Native Testing Library
- **Configuration** : Déjà configuré (`jest.config.js`)
- **Mocking** : API client mocké

---

## 📌 Prochaines Étapes Immédiates

1. ✅ Créer configuration Jest pour backend
2. ✅ Créer tests Marketplace Service (bug corrigé)
3. ✅ Créer tests Auth Service
4. ✅ Créer tests Finance Service
5. ✅ Ajouter tests frontend Marketplace manquants
6. ✅ Configurer CI/CD pour exécution automatique
