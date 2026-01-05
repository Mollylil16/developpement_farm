# PHASE 1 : ANALYSE COMPLÈTE DU SYSTÈME D'ACHAT MARKETPLACE

## 📋 Date : 2025-01-XX
## 📋 Objectif : Documenter l'état actuel avant refactoring complet

---

## 1.1 - SYSTÈME DE NÉGOCIATION EXISTANT

### A) Composants Frontend

#### 1. `OfferModal.tsx` (`src/components/marketplace/OfferModal.tsx`)
**État** : ✅ Existe et fonctionnel

**Fonctionnalités** :
- Sélection multiple de sujets (`selectedIds: Set<string>`)
- Proposition de prix total (`proposedPrice: number`)
- Message optionnel (`message: string`)
- Comparaison prix proposé vs prix demandé
- Acceptation conditions de vente (checkbox)
- Validation (prix > 0, sujets sélectionnés, conditions acceptées)

**Props** :
```typescript
interface OfferModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { subjectIds: string[]; proposedPrice: number; message?: string }, listingId: string) => Promise<void>;
  subjects: SubjectCardType[]; // Liste des sujets disponibles
  listingId: string;
  originalPrice: number; // Prix demandé par le producteur
}
```

**Problèmes identifiés** :
- ❌ Prix proposé est un **prix total**, pas un prix par sujet
- ❌ Ne gère pas les achats partiels (peut proposer un prix total pour 3 sujets sur 10)
- ❌ Ne permet pas de saisir une date de récupération souhaitée
- ✅ Sélection multiple fonctionne correctement

#### 2. `OfferResponseModal.tsx` (`src/components/marketplace/OfferResponseModal.tsx`)
**État** : ✅ Existe et fonctionnel

**Fonctionnalités** :
- Accepter l'offre (`action: 'accept'`)
- Refuser l'offre (`action: 'reject'`)
- Faire une contre-proposition (`action: 'counter'`)
- Affichage des détails de l'offre (acheteur, sujets, prix proposé)
- Champ message optionnel pour refus/contre-proposition

**Props** :
```typescript
interface OfferResponseModalProps {
  visible: boolean;
  onClose: () => void;
  offer: Offer | null;
  onAccept: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onCounter: (newPrice: number, message?: string) => Promise<void>;
}
```

**Problèmes identifiés** :
- ❌ Contre-proposition : `newPrice` est un **prix total**, pas par sujet
- ❌ Ne gère pas les contre-propositions multiples (max 3 allers-retours ?)
- ❌ Acheteur ne peut pas accepter une contre-proposition directement depuis ce modal

#### 3. `ProducerOffersScreen.tsx` (`src/screens/marketplace/ProducerOffersScreen.tsx`)
**État** : ✅ Existe et fonctionnel

**Fonctionnalités** :
- Liste toutes les offres reçues par le producteur
- Affichage : sujet, prix proposé, prix initial, date, statut
- Actions : Accepter / Refuser / Contre-proposer
- Statuts : `pending`, `accepted`, `rejected`, `countered`, `expired`

**Problèmes identifiés** :
- ❌ N'affiche qu'un seul sujet par offre (ligne 201 : `item.subject?.code || item.subjectIds?.[0]`)
- ❌ Ne gère pas l'affichage de plusieurs sujets dans une offre
- ✅ Supporte les contre-propositions via `counterOffer`

### B) Backend - Routes API

#### 1. `POST /marketplace/offers` (Création d'offre)
**Fichier** : `backend/src/marketplace/marketplace.service.ts` (lignes 265-314)

**Body** :
```typescript
{
  listingId: string;
  subjectIds: string[]; // ✅ Supporte plusieurs sujets
  proposedPrice: number; // ❌ Prix total, pas par sujet
  message?: string;
}
```

**Actions** :
- ✅ Vérifie que l'acheteur n'est pas le producteur
- ✅ Vérifie que le listing est disponible
- ✅ Crée l'offre avec statut `pending`
- ✅ Notifie le producteur
- ✅ Incrémente les `inquiries` du listing

**Table** : `marketplace_offers`
- ✅ Champ `subject_ids` : `TEXT[]` (array, supporte plusieurs sujets)

**Limitations** :
- ❌ `proposed_price` est un prix total, pas par sujet
- ❌ Pas de champ `date_recuperation_souhaitee`
- ❌ Pas de gestion du prix par sujet vs prix total

#### 2. `PUT /marketplace/offers/:id/accept` (Accepter offre)
**Fichier** : `backend/src/marketplace/marketplace.service.ts` (lignes 354-412)

**Actions** :
- ✅ Met à jour statut : `accepted`
- ✅ Crée une transaction avec statut `confirmed`
- ✅ Met à jour listing : `reserved`
- ✅ Notifie l'acheteur
- ✅ Marque les autres offres en conflit comme `expired`

**Problèmes identifiés** :
- ❌ **AUCUNE AUTOMATISATION POST-VENTE** :
  - ❌ Ne marque PAS les animaux comme "vendu"
  - ❌ Ne crée PAS de revenu dans Finance
  - ❌ Ne met PAS à jour le cheptel
  - ❌ Les animaux sont marqués "vendu" seulement après `confirmDelivery` (ligne 1130)

#### 3. `PUT /marketplace/offers/:id/reject` (Refuser offre)
**Fichier** : `backend/src/marketplace/marketplace.service.ts` (lignes 414-434)

**Actions** :
- ✅ Met à jour statut : `rejected`
- ✅ Notifie l'acheteur

**État** : ✅ Fonctionne correctement

#### 4. `counterOffer` (Contre-proposition)
**État** : ⚠️ **PARTIELLEMENT IMPLÉMENTÉ**

**Frontend** :
- ✅ `ProducerOffersScreen.tsx` ligne 137 : Appelle `service.counterOffer(offerId, user.id, counterPrice)`
- ✅ `OfferResponseModal.tsx` : Supporte les contre-propositions

**Backend** :
- ❓ **NON TROUVÉ** : Aucune route `/marketplace/offers/:id/counter` dans le backend
- ❓ **NON TROUVÉ** : Aucune méthode `counterOffer` dans `marketplace.service.ts`
- ⚠️ **PROBLÈME** : Le frontend appelle une fonction qui n'existe pas dans le backend

**Table `marketplace_offers`** :
- ✅ Statut `countered` existe dans l'ENUM `offer_status`
- ❌ Pas de champ `counter_offer_of` pour lier la contre-proposition à l'offre originale
- ❌ Pas de champ `prix_total_final` pour le prix négocié final

### C) Structure de données - Table `marketplace_offers`

**Fichier** : `backend/database/migrations/031_create_marketplace_offers_table.sql`

```sql
CREATE TABLE marketplace_offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id),
  subject_ids TEXT[] NOT NULL, -- ✅ Array de IDs (supporte plusieurs sujets)
  buyer_id TEXT NOT NULL,
  producer_id TEXT NOT NULL,
  proposed_price NUMERIC NOT NULL, -- ❌ Prix total, pas par sujet
  original_price NUMERIC NOT NULL,
  message TEXT,
  status offer_status NOT NULL DEFAULT 'pending', -- ✅ Enum : pending, accepted, rejected, countered, expired, withdrawn
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  date_creation TIMESTAMP,
  derniere_modification TIMESTAMP
);
```

**Manques identifiés** :
- ❌ Pas de champ `prix_propose_unitaire` (prix par sujet)
- ❌ Pas de champ `prix_total_final` (prix négocié final)
- ❌ Pas de champ `date_recuperation_souhaitee`
- ❌ Pas de champ `counter_offer_of` (lien vers offre originale si contre-proposition)
- ❌ Pas de champ `numero_iteration` (nombre d'aller-retours)

---

## 1.2 - SYSTÈME DE VENTE & POST-VENTE EXISTANT

### A) Transactions

#### Table `marketplace_transactions`
**Fichier** : `backend/database/migrations/032_create_marketplace_transactions_table.sql`

```sql
CREATE TABLE marketplace_transactions (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES marketplace_offers(id),
  listing_id TEXT NOT NULL,
  subject_ids TEXT[] NOT NULL, -- ✅ Array de IDs
  buyer_id TEXT NOT NULL,
  producer_id TEXT NOT NULL,
  final_price NUMERIC NOT NULL,
  status transaction_status NOT NULL DEFAULT 'confirmed',
  delivery_details JSONB, -- Détails de livraison
  documents JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT
);
```

**Statuts** : `confirmed`, `preparing`, `ready_for_delivery`, `pending_delivery`, `in_transit`, `delivered`, `completed`, `cancelled`

**Problèmes identifiés** :
- ❌ Pas de champ `vente_id` (pas de table `ventes` séparée)
- ❌ Pas de champ `revenu_id` (pas de lien avec Finance)
- ❌ Pas de champ `poids_total`
- ❌ Pas de champ `nombre_sujets` (calculé depuis `subject_ids.length`)
- ❌ Pas de champ `date_vente` explicite

#### Création de transaction
**Fichier** : `backend/src/marketplace/marketplace.service.ts` (lignes 386-411)

**Quand** : Lorsque le producteur accepte une offre

**Actions** :
- ✅ Crée la transaction avec statut `confirmed`
- ✅ Met le listing à `reserved`
- ❌ **AUCUNE AUTOMATISATION** :
  - ❌ Ne marque pas les animaux comme "vendu"
  - ❌ Ne crée pas de revenu
  - ❌ Ne met pas à jour le cheptel

### B) Confirmation de livraison

#### Fonction `confirmDelivery`
**Fichier** : 
- Backend : `backend/src/marketplace/marketplace.service.ts` (lignes 823-?)
- Frontend : `src/services/MarketplaceService.ts` (lignes 1087-1170)

**Processus actuel** :
1. Producteur OU acheteur confirme la livraison
2. Système vérifie si les DEUX ont confirmé
3. **Seulement si les deux ont confirmé** :
   - Met à jour transaction : `status = 'completed'`
   - Met à jour listing : `status = 'sold'`
   - Marque les animaux : `statut = 'vendu'` (lignes 1124-1137)
   - Notifie les deux parties

**Problèmes identifiés** :
- ❌ **TROP TARDIF** : Les animaux ne sont marqués "vendu" qu'après confirmation de livraison
- ❌ **AUCUNE CRÉATION DE REVENU** : Le revenu n'est jamais créé automatiquement
- ❌ **PAS DE MISE À JOUR DU CHEPTEL** : Le compteur d'animaux n'est pas mis à jour
- ❌ **FLUX CONFUS** : L'acheteur doit attendre la livraison avant que la vente soit finalisée

### C) Revenus (Finance)

#### Table `revenus`
**Fichier** : `backend/database/migrations/009_create_revenus_table.sql`

```sql
CREATE TABLE revenus (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  montant NUMERIC NOT NULL,
  categorie TEXT NOT NULL, -- 'vente_porc', 'vente_autre', 'subvention', 'autre'
  libelle_categorie TEXT,
  date TIMESTAMP NOT NULL,
  description TEXT,
  commentaire TEXT,
  photos TEXT, -- JSON array
  poids_kg NUMERIC,
  animal_id TEXT REFERENCES production_animaux(id), -- ❌ UN SEUL animal_id
  ...
);
```

**Problèmes identifiés** :
- ❌ `animal_id` est UN SEUL ID (pas d'array) → Impossible d'enregistrer plusieurs animaux dans un seul revenu
- ❌ Pas de champ `vente_id` (pas de lien avec les transactions marketplace)
- ❌ Pas de champ `acheteur` (nom de l'acheteur)
- ❌ Pas de champ `nombre_animaux` (calculé depuis autre part ?)
- ❌ **CRÉATION MANUELLE** : Les revenus doivent être créés manuellement par le producteur

#### Création de revenu
**Endpoint** : `POST /finance/revenus`

**Utilisation actuelle** :
- ✅ Création manuelle via `RevenuFormModal.tsx`
- ✅ Création via chatbot (AgentActionExecutor)
- ❌ **AUCUNE CRÉATION AUTOMATIQUE** après vente marketplace

### D) Mise à jour du cheptel

#### Statuts des animaux
**Table** : `production_animaux`

**Champs** :
- `statut` : VARCHAR (ex: 'actif', 'vendu', 'mort', etc.)
- `date_sortie` : TIMESTAMP (quand l'animal sort de l'élevage)
- `acheteur_id` : UUID (ID de l'utilisateur acheteur)

**Problèmes identifiés** :
- ✅ Les champs existent
- ❌ **MISE À JOUR MANUELLE** : Les statuts ne sont pas mis à jour automatiquement après vente marketplace
- ❌ **SEULEMENT DANS `confirmDelivery`** : Les animaux sont marqués "vendu" seulement après confirmation de livraison (trop tard)

#### Compteurs du projet
**Table** : `projets`

**Champs** :
- `nombre_animaux_total` : INTEGER
- `nombre_truies` : INTEGER
- `nombre_verrats` : INTEGER
- etc.

**Problèmes identifiés** :
- ❌ **PAS DE MISE À JOUR AUTOMATIQUE** : Les compteurs ne sont pas décrémentés après vente
- ❌ Le producteur doit mettre à jour manuellement

#### Mode bande - Compteurs des batches
**Table** : `batches`

**Champs** :
- `total_count` : INTEGER
- `average_weight_kg` : REAL

**Problèmes identifiés** :
- ❌ **PAS DE MISE À JOUR AUTOMATIQUE** : Les compteurs ne sont pas décrémentés après vente de batch_pigs
- ❌ Le producteur doit mettre à jour manuellement

---

## 1.3 - SYSTÈME DE SÉLECTION DES SUJETS

### A) FarmDetailsModal

**Fichier** : `src/components/marketplace/FarmDetailsModal.tsx`

**Fonctionnalités actuelles** :
- ✅ Affiche tous les sujets disponibles d'une ferme
- ✅ Permet sélection multiple via checkboxes
- ✅ Affiche détails : ID, poids, race, prix
- ✅ Détails sanitaires expandables (vaccinations, maladies)
- ✅ Filtres par race, tri par prix/poids/date
- ✅ Récapitulatif : nombre sélectionnés, prix total
- ✅ Bouton "Faire une offre" (ligne 839)

**Problèmes identifiés** :
- ✅ Supporte les listings batch (lignes 175-273 : création de listings virtuels)
- ✅ Utilise `originalListingId` pour les listings batch
- ✅ IDs réels : `pigId` pour les batch_pigs
- ⚠️ Pas de support pour afficher le poids **réel** de chaque batch_pig (utilise poids moyen)

### B) Processus de sélection

**Flux actuel** :
1. Acheteur clique sur FarmCard → FarmDetailsModal s'ouvre
2. Acheteur sélectionne des sujets via checkboxes
3. Acheteur clique "Faire une offre"
4. `handleMakeOffer` construit `SelectedSubject[]` avec `{ listingId, subjectId }`
5. Appelle `onMakeOffer(selections)` → Ouvre `OfferModal`

**État** : ✅ Fonctionne pour mode individuel et mode bande

---

## 1.4 - IDENTIFICATION DES GAPS

### Gaps critiques pour le mode bande

1. ❌ **Prix par sujet** : Le système utilise un prix total, pas un prix par sujet
2. ❌ **Contre-propositions** : Backend non implémenté
3. ❌ **Automatisation post-vente** : Aucune automatisation
4. ❌ **Revenus multiples animaux** : Table `revenus` ne supporte qu'un seul `animal_id`
5. ❌ **Poids réel batch_pigs** : Utilise poids moyen au lieu du poids réel

### Gaps critiques pour le mode individuel

1. ❌ **Automatisation post-vente** : Aucune automatisation (identique au mode bande)
2. ❌ **Date de récupération** : Pas de champ pour la date souhaitée
3. ❌ **Flux trop tardif** : Animaux marqués "vendu" seulement après livraison

### Gaps communs (les deux modes)

1. ❌ **Service de vente automatique** : N'existe pas
2. ❌ **Transaction atomique** : Pas de transaction SQL pour garantir cohérence
3. ❌ **Création revenu automatique** : Manuelle
4. ❌ **Mise à jour cheptel** : Manuelle
5. ❌ **Gestion achats partiels** : Supporte mais pas optimisé (prix total au lieu de prix par sujet)

---

## 1.5 - RÉSUMÉ DES DIFFÉRENCES MODE INDIVIDUEL vs MODE BANDE

| Aspect | Mode Individuel | Mode Bande | Parité |
|--------|----------------|------------|--------|
| **Création listing** | ✅ Endpoint `/marketplace/listings` | ✅ Même endpoint (après refactoring) | ✅ OUI |
| **Sélection sujets** | ✅ Via FarmDetailsModal | ✅ Même modal | ✅ OUI |
| **Création offre** | ✅ Supporte plusieurs sujets | ✅ Supporte plusieurs batch_pigs | ✅ OUI |
| **Prix** | ❌ Prix total | ❌ Prix total | ✅ OUI (mais ❌ doit être par sujet) |
| **Contre-proposition** | ⚠️ Frontend OK, backend manquant | ⚠️ Frontend OK, backend manquant | ✅ OUI |
| **Acceptation offre** | ❌ Pas d'automatisation | ❌ Pas d'automatisation | ✅ OUI |
| **Marquage "vendu"** | ⚠️ Seulement après livraison | ⚠️ Seulement après livraison | ✅ OUI |
| **Création revenu** | ❌ Manuelle | ❌ Manuelle | ✅ OUI |
| **Mise à jour cheptel** | ❌ Manuelle | ❌ Manuelle | ✅ OUI |

**Conclusion** : Les deux modes ont les **MÊMES LIMITATIONS** concernant l'automatisation post-vente. Le processus est identique, ce qui facilite le refactoring.

---

## 1.6 - FICHIERS À MODIFIER/CRÉER

### Frontend - À MODIFIER

1. **`src/components/marketplace/OfferModal.tsx`**
   - [ ] Ajouter champ "Prix par sujet" (optionnel, calcule prix total automatiquement)
   - [ ] Ajouter champ "Date de récupération souhaitée"
   - [ ] Améliorer affichage : montrer prix par sujet ET prix total

2. **`src/components/marketplace/OfferResponseModal.tsx`**
   - [ ] Adapter pour contre-propositions avec prix par sujet
   - [ ] Permettre à l'acheteur d'accepter une contre-proposition

3. **`src/components/marketplace/FarmDetailsModal.tsx`**
   - [ ] Vérifier affichage poids réel pour batch_pigs (après refactoring précédent)
   - ✅ Déjà bon : sélection multiple, IDs réels

4. **`src/services/MarketplaceService.ts`**
   - [ ] Implémenter `counterOffer` (actuellement manquant)

### Frontend - À CRÉER

1. **`src/hooks/useMarketplaceOffers.ts`** (optionnel)
   - Hook pour gérer les offres (création, acceptation, contre-proposition)

### Backend - À MODIFIER

1. **`backend/src/marketplace/marketplace.service.ts`**
   - [ ] Implémenter `counterOffer` (ligne manquante)
   - [ ] Modifier `acceptOffer` pour déclencher automatisation complète
   - [ ] Créer fonction `processSaleFromOffer` (service de vente automatique)

2. **`backend/src/marketplace/marketplace.controller.ts`**
   - [ ] Ajouter route `PUT /marketplace/offers/:id/counter`
   - [ ] Vérifier route `PUT /marketplace/offers/:id/accept` appelle automatisation

### Backend - À CRÉER

1. **`backend/src/marketplace/sale-automation.service.ts`** ⭐ **CRITIQUE**
   - Service transactionnel pour automatiser la vente complète
   - Fonction `processSaleFromOffer(offer)`
   - Mise à jour animaux, cheptel, création revenu, notifications

### Base de données - À MODIFIER

1. **Table `marketplace_offers`**
   - [ ] Ajouter `prix_propose_unitaire` NUMERIC
   - [ ] Ajouter `prix_total_final` NUMERIC (prix négocié final)
   - [ ] Ajouter `date_recuperation_souhaitee` DATE
   - [ ] Ajouter `counter_offer_of` TEXT REFERENCES marketplace_offers(id)
   - [ ] Ajouter `numero_iteration` INTEGER (nombre d'aller-retours)

2. **Table `marketplace_transactions`**
   - [ ] Ajouter `poids_total` INTEGER
   - [ ] Ajouter `nombre_sujets` INTEGER
   - [ ] Ajouter `date_vente` TIMESTAMP
   - [ ] Ajouter `revenu_id` TEXT REFERENCES revenus(id)

3. **Table `revenus`**
   - [ ] Modifier `animal_id` → `animal_ids` TEXT[] (array au lieu d'un seul ID)
   - [ ] Ajouter `acheteur` VARCHAR(255)
   - [ ] Ajouter `nombre_animaux` INTEGER
   - [ ] Ajouter `vente_id` TEXT REFERENCES marketplace_transactions(id)

4. **Table `ventes`** (à créer si n'existe pas)
   - [ ] Vérifier si table existe
   - [ ] Si non, créer table pour historique des ventes

---

## 1.7 - QUESTIONS À CLARIFIER AVANT IMPLÉMENTATION

1. **Prix par sujet vs Prix total** :
   - Question : L'acheteur doit-il proposer un prix par sujet OU un prix total ?
   - Recommandation : **Prix par sujet** (plus flexible, permet négociation sur lot partiel)
   - Impact : Modifier `OfferModal`, `OfferResponseModal`, table `marketplace_offers`

2. **Quand marquer les animaux "vendu"** :
   - Actuel : Après confirmation de livraison (trop tard)
   - Recommandation : **Immédiatement après acceptation d'offre**
   - Impact : Modifier `acceptOffer` pour appeler automatisation

3. **Revenus multiples animaux** :
   - Question : Un revenu pour tous les animaux OU un revenu par animal ?
   - Recommandation : **Un revenu pour la vente complète** (avec array d'animal_ids)
   - Impact : Modifier table `revenus`

4. **Gestion des contre-propositions** :
   - Question : Max 3 allers-retours ? Ou illimité ?
   - Recommandation : **Max 3 allers-retours** (évite négociations infinies)
   - Impact : Ajouter compteur `numero_iteration`

5. **Table `ventes` séparée** :
   - Question : Faut-il une table `ventes` séparée de `marketplace_transactions` ?
   - Recommandation : **NON** (redondance), utiliser `marketplace_transactions` comme source de vérité
   - Impact : Enrichir `marketplace_transactions` au lieu de créer nouvelle table

---

## 📋 LIVRABLE PHASE 1 : VALIDATION

✅ **Documentation complète de l'existant**
✅ **Identification de tous les gaps**
✅ **Liste des fichiers à modifier/créer**
✅ **Questions à clarifier**

**PROCHAINE ÉTAPE** : Valider avec l'utilisateur les recommandations, puis passer à la Phase 2 (Architecture).

