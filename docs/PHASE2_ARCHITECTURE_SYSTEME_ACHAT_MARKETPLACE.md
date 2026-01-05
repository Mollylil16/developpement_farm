# PHASE 2 : ARCHITECTURE DU SYSTÈME D'ACHAT MARKETPLACE

## 📋 Date : 2025-01-XX
## 📋 Objectif : Définir l'architecture complète du système d'achat

---

## 2.1 - DÉCISIONS ARCHITECTURALES VALIDÉES

### A) Réponses aux questions de clarification

1. **Prix dans les offres** : ✅ **Prix total** (pas par sujet)
2. **Marquage "vendu"** : ✅ **Après livraison** (pas immédiatement après acceptation)
3. **Revenus** : ✅ **Un revenu pour tous les animaux** vendus pendant la transaction
4. **Contre-propositions** : ✅ **Illimité** (pas de limite sur les allers-retours)
5. **Table ventes** : ✅ **Nécessaire** (table séparée pour historique)

### B) Architecture générale

**Principe** : Le système reste **cohérent entre mode individuel et mode bande**. Les deux modes utilisent le même flux, les mêmes endpoints, et la même logique d'automatisation.

---

## 2.2 - FLUX UTILISATEUR COMPLET (UX)

### ÉTAPE 1 : DÉCOUVERTE (Acheteur)

1. Acheteur parcourt le Marketplace
2. Voit des FarmCards avec :
   - Nombre de sujets disponibles
   - Prix par sujet OU prix du lot
   - Aperçu (race, âge moyen, poids moyen)
3. Clique sur une FarmCard

### ÉTAPE 2 : DÉTAILS & SÉLECTION (Acheteur)

4. `FarmDetailsModal` s'ouvre avec :
   
   **A) Section Informations générales** :
   - Nom de l'élevage / Producteur
   - Localisation
   - Description générale
   
   **B) Section Liste des sujets** :
   - Tableau/Liste de TOUS les sujets disponibles
   - Pour chaque sujet :
     * Checkbox de sélection
     * Code/ID du sujet (ID réel)
     * Poids réel (kg, nombre entier)
     * Âge (mois)
     * Sexe
     * Race
     * Prix unitaire (calculé : `pricePerKg * weight`)
     * Bouton "Voir détails ▼" qui expand :
       → Historique prophylaxie complet
       → Historique pesées (graphique ou tableau)
       → Notes vétérinaires
       → Photos si disponibles
   
   **C) Section Sélection** :
   - Bouton "Tout sélectionner / Tout désélectionner"
   - Compteur : "X sujets sélectionnés sur Y"
   
   **D) Section Récapitulatif (dynamique)** :
   - Nombre de sujets sélectionnés : X
   - Poids total : Y kg
   - Prix total : Z FCFA
   - Si lot complet sélectionné : Badge "Réduction lot complet : -5%"
   
   **E) Section Actions** :
   - Bouton principal : "Faire une offre" (toujours visible)

### ÉTAPE 3 : OFFRE (Acheteur)

5. Acheteur clique "Faire une offre"
6. `OfferModal` s'ouvre :
   
   **Affichage** :
   - Récapitulatif de la sélection :
     * Liste des sujets sélectionnés (codes, poids)
     * Prix total demandé par le producteur : X FCFA
   
   **Formulaire** :
   - Prix total proposé : [input] FCFA
   - Message optionnel pour le producteur : [textarea]
   - Date de récupération souhaitée : [date picker]
   
   **Actions** :
   - "Envoyer l'offre" → Crée l'offre, notifie le producteur
   - "Annuler"

### ÉTAPE 4 : NÉGOCIATION (Producteur ↔ Acheteur)

7. Producteur reçoit notification "Nouvelle offre reçue"
8. Producteur voit l'offre dans ses notifications/tableau de bord
9. Producteur peut :
   
   **A) Accepter l'offre** → Passe directement à ÉTAPE 5 (Création transaction)
   
   **B) Refuser l'offre** → Fin de la transaction, acheteur notifié
   
   **C) Faire une contre-proposition** :
      - Modal de contre-proposition s'ouvre
      - Affiche l'offre de l'acheteur
      - Permet de proposer un nouveau prix total
      - Permet d'ajouter un message
      - "Envoyer la contre-proposition" → Notifie l'acheteur

10. Si contre-proposition, acheteur reçoit notification
11. Acheteur peut :
    - Accepter la contre-proposition → ÉTAPE 5
    - Refuser → Fin de la transaction
    - Faire une nouvelle offre → Retour ÉTAPE 3 (illimité)

### ÉTAPE 5 : CRÉATION TRANSACTION (Système)

12. Une fois l'offre acceptée (par producteur OU acheteur si contre-proposition) :

**Actions immédiates** :
- ✅ Créer une transaction avec statut `confirmed`
- ✅ Mettre à jour l'offre : `status = 'accepted'`
- ✅ Mettre à jour le listing : `status = 'reserved'`
- ✅ Notifier l'autre partie
- ❌ **NE PAS** marquer les animaux "vendu" (après livraison seulement)
- ❌ **NE PAS** créer de revenu (après livraison seulement)
- ❌ **NE PAS** mettre à jour le cheptel (après livraison seulement)

### ÉTAPE 6 : LIVRAISON & FINALISATION (Système)

13. Après que les deux parties aient confirmé la livraison :

**Automatisation complète** :

**A) Création de la vente** :
   - Créer une entrée dans la table `ventes`
   - Statut : "confirmée"
   - Montant : prix négocié final (depuis transaction)
   - Nombre de sujets : `transaction.subject_ids.length`
   - Poids total : calculé depuis les animaux
   - Date de vente : NOW()

**B) Mise à jour des animaux** :
   - Pour chaque sujet vendu :
     * UPDATE animaux SET statut = 'vendu', date_sortie = NOW(), acheteur_id = X
     * Si mode bande : UPDATE batch_pigs SET statut = 'vendu', date_sortie = NOW()
     * Si mode bande : UPDATE bandes SET nombre_animaux_actifs = nombre_animaux_actifs - N

**C) Actualisation du cheptel** :
   - UPDATE projets SET nombre_animaux_total = nombre_animaux_total - N
   - Recalculer les statistiques du projet

**D) Création du revenu (Finance > Revenus)** :
   - INSERT INTO revenus (
       projet_id,
       montant,
       date,
       categorie: 'vente_porc',
       description: "Vente de X sujet(s) - Codes: ...",
       acheteur,
       poids_total,
       nombre_animaux,
       vente_id,
       animal_ids: TEXT[] -- Array de tous les IDs
     ) VALUES (...)

**E) Mise à jour du marketplace** :
   - Si sujets partiels vendus : Retirer uniquement ces sujets du listing
   - Si lot complet vendu : Marquer le listing comme "vendu", le retirer du marketplace

**F) Notifications** :
   - Notifier le producteur : "Vente confirmée : X sujets vendus pour Y FCFA"
   - Notifier l'acheteur : "Achat confirmé : récupération prévue le [date]"

14. Producteur voit dans Finance > Revenus :
    - Nouvelle entrée avec montant, poids, nombre d'animaux, acheteur
    
15. Producteur voit dans son cheptel :
    - Nombre d'animaux réduit
    - Sujets vendus marqués "Vendu" avec date de sortie

---

## 2.3 - ARCHITECTURE TECHNIQUE

### A) MODIFICATIONS BASE DE DONNÉES

#### 1. Table `marketplace_offers` (modifications)

**Migration** : `backend/database/migrations/XXX_update_marketplace_offers_for_counter_offers.sql`

```sql
-- Ajouter les champs pour contre-propositions et date de récupération
ALTER TABLE marketplace_offers 
  ADD COLUMN IF NOT EXISTS date_recuperation_souhaitee DATE,
  ADD COLUMN IF NOT EXISTS counter_offer_of TEXT REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS prix_total_final NUMERIC;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_counter_offer_of ON marketplace_offers(counter_offer_of);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_date_recuperation ON marketplace_offers(date_recuperation_souhaitee);
```

**Champs ajoutés** :
- `date_recuperation_souhaitee` : DATE (date souhaitée pour récupérer les animaux)
- `counter_offer_of` : TEXT (ID de l'offre originale si c'est une contre-proposition)
- `prix_total_final` : NUMERIC (prix final négocié, rempli après acceptation)

#### 2. Table `marketplace_transactions` (modifications)

**Migration** : `backend/database/migrations/XXX_update_marketplace_transactions_for_ventes.sql`

```sql
-- Ajouter les champs pour lier avec ventes
ALTER TABLE marketplace_transactions
  ADD COLUMN IF NOT EXISTS poids_total INTEGER,
  ADD COLUMN IF NOT EXISTS nombre_sujets INTEGER,
  ADD COLUMN IF NOT EXISTS date_vente TIMESTAMP,
  ADD COLUMN IF NOT EXISTS vente_id TEXT REFERENCES ventes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revenu_id TEXT REFERENCES revenus(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_vente_id ON marketplace_transactions(vente_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_revenu_id ON marketplace_transactions(revenu_id);
```

**Champs ajoutés** :
- `poids_total` : INTEGER (poids total des animaux vendus)
- `nombre_sujets` : INTEGER (nombre de sujets vendus)
- `date_vente` : TIMESTAMP (date de vente, rempli après livraison)
- `vente_id` : TEXT (lien vers table `ventes`)
- `revenu_id` : TEXT (lien vers table `revenus`)

#### 3. Table `revenus` (modifications)

**Migration** : `backend/database/migrations/XXX_update_revenus_for_multiple_animals.sql`

```sql
-- Modifier animal_id pour supporter plusieurs animaux
ALTER TABLE revenus
  ADD COLUMN IF NOT EXISTS animal_ids TEXT[], -- Array d'IDs au lieu d'un seul
  ADD COLUMN IF NOT EXISTS acheteur VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nombre_animaux INTEGER,
  ADD COLUMN IF NOT EXISTS vente_id TEXT REFERENCES ventes(id) ON DELETE SET NULL;

-- Conserver animal_id pour compatibilité, mais animal_ids est la source de vérité
-- Si animal_id existe mais animal_ids est NULL, copier animal_id dans animal_ids
UPDATE revenus 
SET animal_ids = ARRAY[animal_id]::TEXT[]
WHERE animal_id IS NOT NULL AND (animal_ids IS NULL OR array_length(animal_ids, 1) IS NULL);

-- Index
CREATE INDEX IF NOT EXISTS idx_revenus_vente_id ON revenus(vente_id);
CREATE INDEX IF NOT EXISTS idx_revenus_animal_ids ON revenus USING GIN(animal_ids); -- GIN index pour recherche dans array

-- Commentaire
COMMENT ON COLUMN revenus.animal_ids IS 'Array des IDs des animaux vendus (remplace animal_id pour ventes multiples)';
COMMENT ON COLUMN revenus.vente_id IS 'Lien vers la table ventes si créé depuis marketplace';
```

**Champs ajoutés/modifiés** :
- `animal_ids` : TEXT[] (array d'IDs, remplace `animal_id` pour ventes multiples)
- `acheteur` : VARCHAR(255) (nom complet de l'acheteur)
- `nombre_animaux` : INTEGER (nombre d'animaux vendus)
- `vente_id` : TEXT (lien vers table `ventes`)

#### 4. Table `ventes` (création)

**Migration** : `backend/database/migrations/XXX_create_ventes_table.sql`

```sql
CREATE TABLE IF NOT EXISTS ventes (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  producteur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acheteur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prix_total NUMERIC NOT NULL CHECK (prix_total >= 0),
  nombre_sujets INTEGER NOT NULL CHECK (nombre_sujets > 0),
  poids_total INTEGER NOT NULL CHECK (poids_total > 0), -- Nombre entier
  statut VARCHAR(50) DEFAULT 'confirmee',
  date_vente TIMESTAMP NOT NULL DEFAULT NOW(),
  date_recuperation DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ventes_projet_id ON ventes(projet_id);
CREATE INDEX IF NOT EXISTS idx_ventes_producteur_id ON ventes(producteur_id);
CREATE INDEX IF NOT EXISTS idx_ventes_acheteur_id ON ventes(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_ventes_transaction_id ON ventes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date_vente ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_ventes_statut ON ventes(statut);

-- Commentaires
COMMENT ON TABLE ventes IS 'Table pour stocker les ventes complétées du marketplace';
COMMENT ON COLUMN ventes.transaction_id IS 'Lien vers marketplace_transactions';
COMMENT ON COLUMN ventes.poids_total IS 'Poids total vendu en kg (nombre entier)';
```

**Champs** :
- `id` : TEXT (ID unique)
- `transaction_id` : TEXT (lien vers `marketplace_transactions`)
- `projet_id` : TEXT (projet du producteur)
- `producteur_id` : TEXT (ID du producteur)
- `acheteur_id` : TEXT (ID de l'acheteur)
- `prix_total` : NUMERIC (prix total négocié)
- `nombre_sujets` : INTEGER (nombre de sujets vendus)
- `poids_total` : INTEGER (poids total en kg, nombre entier)
- `statut` : VARCHAR(50) (ex: 'confirmee', 'annulee')
- `date_vente` : TIMESTAMP (date de la vente)
- `date_recuperation` : DATE (date de récupération prévue)

#### 5. Table `ventes_animaux` (création - liaison vente ↔ animaux)

**Migration** : `backend/database/migrations/XXX_create_ventes_animaux_table.sql`

```sql
CREATE TABLE IF NOT EXISTS ventes_animaux (
  vente_id TEXT NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL, -- Peut être production_animaux.id ou batch_pigs.id
  animal_type VARCHAR(20) NOT NULL CHECK (animal_type IN ('production_animaux', 'batch_pigs')),
  poids_vente INTEGER NOT NULL CHECK (poids_vente > 0), -- Poids au moment de la vente (entier)
  prix_unitaire NUMERIC NOT NULL CHECK (prix_unitaire >= 0),
  PRIMARY KEY (vente_id, animal_id, animal_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ventes_animaux_animal_id ON ventes_animaux(animal_id);
CREATE INDEX IF NOT EXISTS idx_ventes_animaux_animal_type ON ventes_animaux(animal_type);

-- Commentaires
COMMENT ON TABLE ventes_animaux IS 'Table de liaison entre ventes et animaux vendus';
COMMENT ON COLUMN ventes_animaux.animal_type IS 'Type d''animal : production_animaux ou batch_pigs';
```

**Champs** :
- `vente_id` : TEXT (ID de la vente)
- `animal_id` : TEXT (ID de l'animal, peut être `production_animaux.id` ou `batch_pigs.id`)
- `animal_type` : VARCHAR(20) ('production_animaux' ou 'batch_pigs')
- `poids_vente` : INTEGER (poids au moment de la vente, nombre entier)
- `prix_unitaire` : NUMERIC (prix par animal, calculé : `prix_total / nombre_sujets`)

### B) BACKEND - Service de vente automatique

#### 1. Service `SaleAutomationService`

**Fichier** : `backend/src/marketplace/sale-automation.service.ts`

**Responsabilités** :
- Traiter la vente après confirmation de livraison
- Créer l'entrée dans `ventes`
- Créer les entrées dans `ventes_animaux`
- Mettre à jour les animaux (statut = 'vendu')
- Mettre à jour le cheptel
- Créer le revenu dans Finance
- Mettre à jour le marketplace
- Envoyer les notifications

**Méthode principale** :
```typescript
async processSaleFromTransaction(transactionId: string): Promise<{
  venteId: string;
  revenuId: string;
}>
```

**Principe** : **TRANSACTIONNELLE** - Tout réussit ou tout échoue (rollback complet)

#### 2. Intégration dans `confirmDelivery`

**Fichier** : `backend/src/marketplace/marketplace.service.ts`

**Modification** : Après que les deux parties aient confirmé la livraison, appeler `SaleAutomationService.processSaleFromTransaction()`.

### C) BACKEND - Routes API

#### 1. `PUT /marketplace/offers/:id/counter` (NOUVELLE)

**Fichier** : `backend/src/marketplace/marketplace.controller.ts` + `marketplace.service.ts`

**Body** :
```typescript
{
  nouveau_prix_total: number;
  message?: string;
}
```

**Actions** :
- Vérifier que l'utilisateur est le producteur
- Vérifier que l'offre est en statut `pending`
- Créer une nouvelle offre avec :
  - `status = 'countered'`
  - `counter_offer_of = offerId` (lien vers l'offre originale)
  - `proposed_price = nouveau_prix_total`
  - `subject_ids` identiques à l'offre originale
- Mettre à jour l'offre originale : `status = 'countered'`
- Notifier l'acheteur

**Réponse** :
```typescript
{
  success: true;
  counter_offer_id: string;
}
```

#### 2. `PUT /marketplace/offers/:id/accept` (MODIFIÉE)

**Fichier** : `backend/src/marketplace/marketplace.service.ts`

**Actions actuelles** (conservées) :
- Mettre à jour l'offre : `status = 'accepted'`
- Créer la transaction avec statut `confirmed`
- Mettre à jour le listing : `status = 'reserved'`
- Notifier l'acheteur

**Modifications** :
- Si l'offre est une contre-proposition (`counter_offer_of` existe) :
  - Permettre à l'acheteur d'accepter (pas seulement le producteur)
  - Mettre à jour `prix_total_final` dans la transaction

#### 3. `PUT /marketplace/transactions/:id/confirm-delivery` (MODIFIÉE)

**Fichier** : `backend/src/marketplace/marketplace.service.ts`

**Actions actuelles** (conservées) :
- Confirmer la livraison (producteur OU acheteur)
- Si les deux ont confirmé : `status = 'completed'`

**Modifications** :
- Après que les deux aient confirmé :
  - Appeler `SaleAutomationService.processSaleFromTransaction(transactionId)`
  - Cette méthode fait TOUTE l'automatisation :
    - Créer `vente`
    - Créer `ventes_animaux`
    - Marquer animaux "vendu"
    - Mettre à jour cheptel
    - Créer revenu
    - Mettre à jour marketplace
    - Notifications

### D) FRONTEND - Composants

#### 1. `OfferModal.tsx` (modifications)

**Ajouts** :
- Champ "Date de récupération souhaitée" (date picker)
- **Prix total** (pas par sujet) - déjà fait
- Validation : date de récupération >= aujourd'hui

#### 2. `OfferResponseModal.tsx` (modifications)

**Ajouts** :
- Support des contre-propositions (prix total)
- Permettre à l'acheteur d'accepter une contre-proposition

#### 3. `MarketplaceService.ts` (frontend - modifications)

**Ajouts** :
- Méthode `counterOffer(offerId, producerId, newPrice, message?)`
- Appel API : `PUT /marketplace/offers/:id/counter`

---

## 2.4 - SCHÉMA DE DONNÉES

```
┌─────────────────────────┐
│  marketplace_offers     │
├─────────────────────────┤
│ id                      │
│ listing_id              │
│ subject_ids (TEXT[])    │
│ buyer_id                │
│ producer_id             │
│ proposed_price          │
│ original_price          │
│ prix_total_final        │ ← NOUVEAU
│ date_recuperation_...   │ ← NOUVEAU
│ counter_offer_of        │ ← NOUVEAU
│ status                  │
│ message                 │
└─────────────────────────┘
           │
           │ (counter_offer_of)
           │
           └──────────────┐
                          │
                          ▼
┌─────────────────────────┐
│ marketplace_transactions│
├─────────────────────────┤
│ id                      │
│ offer_id                │
│ listing_id              │
│ subject_ids (TEXT[])    │
│ buyer_id                │
│ producer_id             │
│ final_price             │
│ poids_total             │ ← NOUVEAU
│ nombre_sujets           │ ← NOUVEAU
│ date_vente              │ ← NOUVEAU
│ vente_id                │ ← NOUVEAU
│ revenu_id               │ ← NOUVEAU
│ status                  │
└─────────────────────────┘
           │
           │ (transaction_id)
           │
           ▼
┌─────────────────────────┐
│      ventes             │ ← NOUVELLE
├─────────────────────────┤
│ id                      │
│ transaction_id          │
│ projet_id               │
│ producteur_id           │
│ acheteur_id             │
│ prix_total              │
│ nombre_sujets           │
│ poids_total             │
│ statut                  │
│ date_vente              │
│ date_recuperation       │
└─────────────────────────┘
           │
           │ (vente_id)
           │
           ▼
┌─────────────────────────┐
│   ventes_animaux        │ ← NOUVELLE
├─────────────────────────┤
│ vente_id                │
│ animal_id               │
│ animal_type             │ ('production_animaux' | 'batch_pigs')
│ poids_vente             │
│ prix_unitaire           │
└─────────────────────────┘
           │
           │ (vente_id)
           │
           ▼
┌─────────────────────────┐
│      revenus            │
├─────────────────────────┤
│ id                      │
│ projet_id               │
│ montant                 │
│ categorie               │
│ date                    │
│ description             │
│ animal_ids (TEXT[])     │ ← MODIFIÉ (au lieu de animal_id)
│ acheteur                │ ← NOUVEAU
│ nombre_animaux          │ ← NOUVEAU
│ poids_total             │
│ vente_id                │ ← NOUVEAU
└─────────────────────────┘
```

---

## 2.5 - FICHIERS À MODIFIER/CRÉER

### Backend - Base de données

1. **`backend/database/migrations/XXX_update_marketplace_offers_for_counter_offers.sql`** ⭐ NOUVEAU
2. **`backend/database/migrations/XXX_update_marketplace_transactions_for_ventes.sql`** ⭐ NOUVEAU
3. **`backend/database/migrations/XXX_update_revenus_for_multiple_animals.sql`** ⭐ NOUVEAU
4. **`backend/database/migrations/XXX_create_ventes_table.sql`** ⭐ NOUVEAU
5. **`backend/database/migrations/XXX_create_ventes_animaux_table.sql`** ⭐ NOUVEAU

### Backend - Services

1. **`backend/src/marketplace/sale-automation.service.ts`** ⭐ NOUVEAU (CRITIQUE)
2. **`backend/src/marketplace/marketplace.service.ts`** (modifications)
   - Ajouter méthode `counterOffer`
   - Modifier `acceptOffer` pour gérer contre-propositions
   - Modifier `confirmDelivery` pour appeler automatisation
3. **`backend/src/marketplace/marketplace.controller.ts`** (modifications)
   - Ajouter route `PUT /offers/:id/counter`

### Backend - DTOs

1. **`backend/src/marketplace/dto/counter-offer.dto.ts`** ⭐ NOUVEAU

### Frontend - Services

1. **`src/services/MarketplaceService.ts`** (modifications)
   - Ajouter méthode `counterOffer`

### Frontend - Composants

1. **`src/components/marketplace/OfferModal.tsx`** (modifications)
   - Ajouter champ date de récupération
2. **`src/components/marketplace/OfferResponseModal.tsx`** (modifications)
   - Support acceptation contre-proposition par acheteur
3. **`src/screens/marketplace/ProducerOffersScreen.tsx`** (modifications)
   - Utiliser `counterOffer` au lieu de l'appel manquant

---

## 2.6 - ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Phase 3.1 : Base de données
1. Créer les migrations SQL
2. Tester les migrations
3. Vérifier les contraintes et index

### Phase 3.2 : Backend - Contre-propositions
1. Créer DTO `CounterOfferDto`
2. Implémenter `counterOffer` dans service
3. Ajouter route dans controller
4. Tester les contre-propositions

### Phase 3.3 : Backend - Service d'automatisation
1. Créer `SaleAutomationService`
2. Implémenter `processSaleFromTransaction`
3. Intégrer dans `confirmDelivery`
4. Tester l'automatisation complète

### Phase 3.4 : Frontend - Contre-propositions
1. Ajouter méthode `counterOffer` dans `MarketplaceService`
2. Modifier `OfferResponseModal` pour accepter contre-propositions
3. Ajouter champ date de récupération dans `OfferModal`
4. Tester le flux complet

### Phase 3.5 : Tests de validation
1. Test : Achat partiel avec négociation
2. Test : Achat lot complet sans négociation
3. Test : Contre-propositions multiples
4. Test : Automatisation post-livraison
5. Test : Mode individuel vs mode bande

---

## 2.7 - POINTS D'ATTENTION

### 1. Transactions SQL
⚠️ **CRITIQUE** : Le service `SaleAutomationService` doit utiliser des transactions SQL pour garantir la cohérence. Si une étape échoue, tout doit être rollback.

### 2. Gestion des erreurs
- Si un animal n'existe plus → Log warning, continuer avec les autres
- Si le projet n'existe plus → Erreur fatale, rollback
- Si création revenu échoue → Erreur fatale, rollback

### 3. Performance
- Utiliser `Promise.all()` pour paralléliser les mises à jour d'animaux
- Utiliser des index sur les colonnes fréquemment recherchées
- Limiter les requêtes N+1

### 4. Mode bande vs mode individuel
- Vérifier `animal_type` dans `ventes_animaux` pour savoir quelle table mettre à jour
- Pour batch_pigs : mettre à jour `batch_pigs` ET décrémenter `bandes.nombre_animaux_actifs`
- Pour production_animaux : mettre à jour `production_animaux` directement

### 5. Date de récupération
- Validation : date >= aujourd'hui
- Stocker dans `marketplace_offers` et copier dans `ventes.date_recuperation`

---

## 📋 LIVRABLE PHASE 2 : VALIDATION

✅ **Architecture complète définie**
✅ **Flux utilisateur détaillé**
✅ **Structure de base de données**
✅ **Fichiers à modifier/créer listés**
✅ **Ordre d'implémentation recommandé**
✅ **Points d'attention identifiés**

**PROCHAINE ÉTAPE** : Phase 3 - Implémentation

