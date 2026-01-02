# Analyse des Incohérences Marketplace - Mode Individuel vs Mode Bande

## 📋 Résumé Exécutif

Cette analyse identifie les incohérences entre le fonctionnement du marketplace en mode suivi individuel et en mode suivi par bande, afin d'uniformiser les processus backend, frontend et base de données pour une meilleure expérience utilisateur.

## ✅ Statut : SOLUTIONS IMPLÉMENTÉES

Les solutions proposées dans cette analyse ont été implémentées. Consultez les documents suivants pour plus de détails :

- **Résumé de l'implémentation :** [`MARKETPLACE_UNIFORMIZATION_SUMMARY.md`](./MARKETPLACE_UNIFORMIZATION_SUMMARY.md)
- **Guide d'utilisation :** [`MARKETPLACE_UNIFIED_USAGE.md`](./MARKETPLACE_UNIFIED_USAGE.md)
- **Checklist de validation :** [`MARKETPLACE_VALIDATION_CHECKLIST.md`](./MARKETPLACE_VALIDATION_CHECKLIST.md)

**Date d'implémentation :** 2026-01-02  
**Version :** 1.0.0

---

## 🔍 1. INCOHÉRENCES BACKEND

### 1.1 Création de Listing

#### Mode Individuel (`createListing`)
- **Endpoint**: `POST /marketplace/listings`
- **DTO**: `CreateListingDto`
- **Champs requis**:
  - `subjectId` (obligatoire)
  - `weight` (poids individuel)
  - `pricePerKg`
  - `lastWeightDate`
  - `location` (address obligatoire)
- **Validation**: Vérifie que le sujet existe dans `production_animaux`
- **Calcul prix**: `calculatedPrice = pricePerKg * weight`
- **Mise à jour animal**: Met à jour `marketplace_status` et `marketplace_listing_id` dans `production_animaux`

#### Mode Bande (`createBatchListing`)
- **Endpoint**: `POST /marketplace/listings/batch`
- **DTO**: `CreateBatchListingDto`
- **Champs requis**:
  - `batchId` (obligatoire)
  - `averageWeight` (poids moyen)
  - `pricePerKg`
  - `lastWeightDate`
  - `location` (address optionnel)
  - `pigCount` ou `pigIds` (optionnel)
- **Validation**: Vérifie que la bande existe dans `batches`
- **Calcul prix**: `calculatedPrice = pricePerKg * averageWeight * pigCount`
- **Mise à jour**: Ne met PAS à jour les `batch_pigs` (commentaire ligne 605: "ils restent dans la bande")

**❌ INCOHÉRENCE 1.1**: 
- Le mode individuel met à jour le statut de l'animal, mais le mode bande ne met pas à jour les porcs de la bande
- Le champ `location.address` est obligatoire en mode individuel mais optionnel en mode bande
- Deux endpoints différents pour la même fonctionnalité

### 1.2 Structure de Données

#### Mode Individuel
```sql
- subject_id (NOT NULL)
- listing_type = 'individual' (défaut)
- batch_id = NULL
- pig_ids = NULL
- pig_count = 1 (défaut)
- weight = poids individuel
```

#### Mode Bande
```sql
- subject_id = NULL
- listing_type = 'batch'
- batch_id (NOT NULL)
- pig_ids = JSONB array
- pig_count = nombre de porcs
- weight = poids moyen (optionnel, dépend de la migration)
```

**❌ INCOHÉRENCE 1.2**:
- La colonne `weight` peut ne pas exister (dépend de la migration 052)
- Le code backend gère dynamiquement la présence/absence de `weight` (lignes 282-390)
- Pas de validation uniforme du poids

### 1.3 Mise à Jour de Listing

#### `updateListing` (lignes 503-567)
- Fonctionne pour les deux modes
- **Problème**: Ne gère pas la mise à jour de `weight`, `pigCount`, `pigIds` pour les listings batch
- Ne met à jour que: `pricePerKg`, `status`, `location`

**❌ INCOHÉRENCE 1.3**:
- Impossible de mettre à jour le poids ou le nombre de porcs d'un listing batch
- Pas de validation spécifique selon le type de listing

### 1.4 Suppression de Listing

#### `deleteListing` (lignes 569-608)
- Mode individuel: Met à jour `production_animaux` (lignes 594-604)
- Mode bande: Ne fait RIEN (commentaire ligne 605: "on ne modifie pas les batch_pigs")

**❌ INCOHÉRENCE 1.4**:
- Comportement asymétrique: le mode individuel nettoie les références, le mode bande non
- Risque de données orphelines

### 1.5 Gestion des Offres

#### `createOffer` (lignes 614-663)
- Utilise `subjectIds` (array) pour les deux modes
- **Problème**: Pour les listings batch, `subjectIds` devrait correspondre à `pigIds` du listing
- Pas de validation que les `subjectIds` correspondent aux `pigIds` du listing batch

**❌ INCOHÉRENCE 1.5**:
- Pas de validation spécifique pour les offres sur listings batch
- Le champ `subject_ids` dans `marketplace_offers` peut contenir des IDs qui ne correspondent pas aux `pig_ids` du listing

### 1.6 Mapping des Données

#### `mapRowToListing` (lignes 990-1037)
- Gère les deux modes avec des conditions `if/else`
- **Problème**: Logique conditionnelle complexe
- Pour les listings batch, parse `pig_ids` depuis JSONB ou string

**❌ INCOHÉRENCE 1.6**:
- Parsing JSONB fragile (lignes 1028-1032)
- Pas de validation de cohérence entre `pig_count` et `pig_ids.length`

---

## 🎨 2. INCOHÉRENCES FRONTEND

### 2.1 Création de Listing

#### Mode Individuel
- **Composant**: `BatchAddModal (lignes 265-328)`
- **Problème**: Le nom est trompeur - `BatchAddModal` crée des listings INDIVIDUELS en boucle
- Crée un listing par sujet sélectionné (boucle `for`)
- Récupère les données depuis `/production/animaux/{id}` et `/production/pesees`

#### Mode Bande
- **Composant**: Utilise `createBatchListing` directement
- Crée UN SEUL listing pour toute la bande
- Récupère les données depuis `/batch-pigs/projet/{id}`

**❌ INCOHÉRENCE 2.1**:
- `BatchAddModal` ne crée PAS de listings batch, mais des listings individuels multiples
- Nom du composant trompeur
- Deux workflows différents pour créer des listings

### 2.2 Affichage des Listings

#### Mode Individuel
- **Composant**: `SubjectCard` ou composant générique
- Affiche: code animal, race, poids individuel, prix

#### Mode Bande
- **Composant**: `BatchListingCard` (fichier séparé)
- Affiche: nombre de porcs, poids moyen, poids total, prix total

**❌ INCOHÉRENCE 2.2**:
- Deux composants différents pour afficher les listings
- Logique de détection: `item.listingType === 'batch' || item.batchId` (ligne 74 MarketplaceMyListingsTab)
- Pas de composant unifié

### 2.3 Enrichissement des Données

#### `MarketplaceScreen.tsx` (lignes 208-260)
- Mode individuel: Récupère animal + pesées depuis API
- Mode bande: Récupère bande depuis API si `weight` manquant
- **Problème**: Logique conditionnelle complexe avec try/catch imbriqués

**❌ INCOHÉRENCE 2.3**:
- Enrichissement différent selon le mode
- Gestion d'erreur incohérente (certaines erreurs sont ignorées, d'autres non)

### 2.4 Gestion des États

#### Redux Store
- Les listings batch et individuels sont mélangés dans le même store
- Pas de distinction claire dans les types

**❌ INCOHÉRENCE 2.4**:
- Type `MarketplaceListing` a des champs optionnels qui changent selon le mode
- Pas de type discriminant (`listingType` est optionnel)

---

## 🗄️ 3. INCOHÉRENCES BASE DE DONNÉES

### 3.1 Schéma de Table

#### `marketplace_listings`
```sql
- listing_type: TEXT DEFAULT 'individual' CHECK (listing_type IN ('individual', 'batch'))
- subject_id: TEXT (nullable pour batch)
- batch_id: TEXT (nullable pour individual)
- pig_ids: JSONB DEFAULT '[]'::jsonb
- pig_count: INTEGER DEFAULT 1
- weight: NUMERIC (optionnel, dépend de migration 052)
```

**❌ INCOHÉRENCE 3.1**:
- Contrainte CHECK existe (lignes 19-24 migration 052) mais:
  - `subject_id` peut être NULL (ligne 16)
  - Pas de contrainte NOT NULL sur `batch_id` quand `listing_type = 'batch'`
  - `weight` peut ne pas exister (migration conditionnelle)

### 3.2 Index

#### Index créés (migration 052)
- `idx_marketplace_listings_batch_id`
- `idx_marketplace_listings_listing_type`
- `idx_marketplace_listings_batch_active`

**❌ INCOHÉRENCE 3.2**:
- Pas d'index sur `subject_id` pour les listings individuels
- Index `batch_active` seulement pour les listings batch

### 3.3 Relations

#### Clés étrangères
- `subject_id` → `production_animaux(id)` (nullable)
- `batch_id` → `batches(id)` (nullable)

**❌ INCOHÉRENCE 3.3**:
- Pas de contrainte ON DELETE CASCADE cohérente
- Si un animal est supprimé, le listing individuel devient orphelin
- Si une bande est supprimée, le listing batch est supprimé (CASCADE)

---

## 🔧 4. PROBLÈMES DE FLUX

### 4.1 Workflow de Création

#### Mode Individuel
1. Sélectionner un animal
2. Récupérer poids depuis pesées
3. Créer listing avec `subjectId`
4. Mettre à jour `production_animaux.marketplace_status`

#### Mode Bande
1. Sélectionner une bande
2. Fournir `averageWeight` (manuel ou depuis bande)
3. Créer listing avec `batchId` + `pigIds`
4. Ne met PAS à jour les `batch_pigs`

**❌ INCOHÉRENCE 4.1**:
- Workflows différents
- Pas de synchronisation avec les données source en mode bande

### 4.2 Workflow de Vente

#### Mode Individuel
- Offre acceptée → Transaction créée
- Animal retiré du cheptel (statut changé)
- Listing marqué `sold`

#### Mode Bande
- Offre acceptée → Transaction créée
- **Problème**: Les porcs restent dans la bande (pas de retrait automatique)
- Listing marqué `sold`

**❌ INCOHÉRENCE 4.2**:
- Pas de retrait automatique des porcs vendus en mode bande
- Risque de vendre les mêmes porcs plusieurs fois

### 4.3 Workflow de Mise à Jour

#### Mode Individuel
- Mise à jour du poids possible via nouvelles pesées
- Listing peut être mis à jour avec nouveau poids

#### Mode Bande
- **Problème**: Impossible de mettre à jour `weight` ou `pigCount` via `updateListing`
- Doit supprimer et recréer le listing

**❌ INCOHÉRENCE 4.3**:
- Fonctionnalités de mise à jour limitées pour les listings batch

---

## 📊 5. RECOMMANDATIONS D'UNIFORMISATION

### 5.1 Backend - Unification des Endpoints

#### Solution Proposée
```typescript
// Un seul endpoint avec détection automatique
POST /marketplace/listings
Body: CreateListingDto (unifié)

// DTO unifié
class CreateListingDto {
  listingType: 'individual' | 'batch';
  subjectId?: string; // Si individual
  batchId?: string; // Si batch
  pigIds?: string[]; // Si batch
  pigCount?: number; // Si batch
  weight: number; // Poids individuel ou moyen
  // ... autres champs communs
}
```

**Avantages**:
- Un seul point d'entrée
- Validation unifiée
- Code plus maintenable

### 5.2 Backend - Gestion Uniforme des Statuts

#### Solution Proposée
```typescript
// Lors de la création d'un listing batch
async createBatchListing(...) {
  // Marquer les porcs comme "en vente"
  await client.query(
    `UPDATE batch_pigs 
     SET marketplace_status = 'available', 
         marketplace_listing_id = $1 
     WHERE id = ANY($2::varchar[])`,
    [listingId, pigIds]
  );
}

// Lors de la suppression
async deleteListing(...) {
  if (listing.listingType === 'batch') {
    await client.query(
      `UPDATE batch_pigs 
       SET marketplace_status = NULL, 
           marketplace_listing_id = NULL 
       WHERE marketplace_listing_id = $1`,
      [listingId]
    );
  }
}
```

### 5.3 Backend - Mise à Jour Complète

#### Solution Proposée
```typescript
async updateListing(id: string, dto: UpdateListingDto, userId: string) {
  // ... validation existante ...
  
  // Ajouter support pour weight et pigCount
  if (dto.weight !== undefined) {
    fields.push(`weight = $${paramIndex}`);
    values.push(dto.weight);
    paramIndex++;
    
    // Recalculer calculatedPrice
    if (listing.listingType === 'batch') {
      const newPrice = dto.pricePerKg * dto.weight * listing.pigCount;
      fields.push(`calculated_price = $${paramIndex}`);
      values.push(newPrice);
      paramIndex++;
    }
  }
  
  if (dto.pigCount !== undefined && listing.listingType === 'batch') {
    // Validation et mise à jour pigIds si nécessaire
    // ...
  }
}
```

### 5.4 Frontend - Composant Unifié

#### Solution Proposée
```typescript
// Un seul composant ListingCard
function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const isBatch = listing.listingType === 'batch';
  
  return (
    <Card>
      {isBatch ? (
        <BatchHeader pigCount={listing.pigCount} />
      ) : (
        <IndividualHeader subjectId={listing.subjectId} />
      )}
      <CommonContent listing={listing} />
    </Card>
  );
}
```

### 5.5 Base de Données - Contraintes Renforcées

#### Solution Proposée
```sql
-- Migration de correction
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS check_batch_listing;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing 
    CHECK (
      (listing_type = 'individual' AND subject_id IS NOT NULL AND batch_id IS NULL) OR
      (listing_type = 'batch' AND batch_id IS NOT NULL AND subject_id IS NULL)
    );

-- Rendre weight obligatoire
ALTER TABLE marketplace_listings
  ALTER COLUMN weight SET NOT NULL;

-- Ajouter colonne marketplace_status dans batch_pigs
ALTER TABLE batch_pigs
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_listing_id TEXT;
```

### 5.6 Frontend - Workflow Unifié

#### Solution Proposée
```typescript
// Un seul modal pour créer un listing
function CreateListingModal({ mode }: { mode: 'individual' | 'batch' }) {
  // Logique unifiée avec détection du mode
  const handleSubmit = async () => {
    if (mode === 'individual') {
      await createIndividualListing(...);
    } else {
      await createBatchListing(...);
    }
  };
}
```

---

## 🎯 6. PLAN D'ACTION PRIORITAIRE

### Phase 1: Backend (Critique)
1. ✅ Unifier les endpoints de création
2. ✅ Ajouter gestion des statuts pour `batch_pigs`
3. ✅ Améliorer `updateListing` pour supporter batch
4. ✅ Corriger `deleteListing` pour nettoyer les références batch

### Phase 2: Base de Données (Important)
1. ✅ Migration pour rendre `weight` obligatoire
2. ✅ Ajouter colonnes `marketplace_status` dans `batch_pigs`
3. ✅ Renforcer les contraintes CHECK
4. ✅ Ajouter index sur `subject_id`

### Phase 3: Frontend (Amélioration)
1. ✅ Renommer `BatchAddModal` → `CreateListingModal`
2. ✅ Créer composant `ListingCard` unifié
3. ✅ Simplifier l'enrichissement des données
4. ✅ Uniformiser les types TypeScript

### Phase 4: Tests & Validation
1. ✅ Tests unitaires pour les deux modes
2. ✅ Tests d'intégration end-to-end
3. ✅ Validation des migrations
4. ✅ Tests de performance

---

## 📝 7. NOTES TECHNIQUES

### 7.1 Migration Conditionnelle
La colonne `weight` peut ne pas exister selon l'état de la migration 052. Le code backend gère cela dynamiquement (lignes 282-390), mais c'est une source de complexité.

**Recommandation**: Forcer l'exécution de la migration 052 ou créer une migration de correction.

### 7.2 Parsing JSONB
Le parsing de `pig_ids` depuis JSONB est fragile (lignes 1028-1032). 

**Recommandation**: Utiliser une fonction helper robuste pour le parsing JSONB.

### 7.3 Validation des Offres
Les offres sur listings batch ne valident pas que les `subjectIds` correspondent aux `pigIds` du listing.

**Recommandation**: Ajouter validation dans `createOffer`.

---

## ✅ CONCLUSION

Les principales incohérences identifiées sont:
1. **Backend**: Deux endpoints séparés, gestion asymétrique des statuts
2. **Frontend**: Composants séparés, workflows différents
3. **Base de données**: Contraintes incomplètes, colonnes optionnelles
4. **Flux**: Pas de synchronisation automatique en mode bande

L'uniformisation nécessite:
- Refactoring des endpoints backend
- Migration de la base de données
- Refactoring des composants frontend
- Tests complets

**Estimation**: 3-5 jours de développement + 1 jour de tests

