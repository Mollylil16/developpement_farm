# Guide d'utilisation des composants Marketplace unifiés

## Vue d'ensemble

Suite à l'uniformisation des processus marketplace entre le mode d'élevage individuel et le mode par bande, de nouveaux composants ont été créés pour offrir une expérience cohérente et simplifiée.

## Nouveaux composants

### 1. `UnifiedListingCard`

**Objectif:** Afficher un listing (individuel ou bande) avec un design cohérent.

**Props:**
```typescript
interface UnifiedListingCardProps {
  listing: MarketplaceListing;  // Le listing à afficher
  onPress: () => void;           // Action au clic
  selected?: boolean;            // Si la carte est sélectionnée
  selectable?: boolean;          // Si la sélection multiple est activée
  onSelect?: () => void;         // Callback de sélection
}
```

**Utilisation:**
```typescript
import { UnifiedListingCard } from '../components/marketplace';

<UnifiedListingCard
  listing={listing}
  onPress={() => navigateToDetails(listing.id)}
  selected={selectedIds.has(listing.id)}
  selectable={true}
  onSelect={() => toggleSelection(listing.id)}
/>
```

**Fonctionnalités:**
- Détecte automatiquement le type de listing (`listing.listingType`)
- Affiche les informations pertinentes selon le mode:
  - **Individuel:** Code animal, race, âge, statut sanitaire, poids
  - **Bande:** Nombre de sujets, poids moyen, poids total
- Badge distinctif ("Individuel" ou "Bande")
- Localisation commune
- Prix au kg et prix total
- Animations glassmorphism
- Support de la sélection multiple

### 2. `AddListingModal`

**Objectif:** Créer un nouveau listing (individuel ou bande) via un modal unifié.

**Props:**
```typescript
interface AddListingModalProps {
  visible: boolean;
  projetId: string;
  onClose: () => void;
  onSuccess: () => void;
  
  // Pour mode individuel
  subjectId?: string;
  subjectCode?: string;
  subjectWeight?: number;
  
  // Pour mode bande
  batchId?: string;
  batchName?: string;
  batchCount?: number;
  batchAverageWeight?: number;
  batchPigIds?: string[];  // IDs spécifiques (optionnel)
}
```

**Utilisation - Mode Individuel:**
```typescript
import { AddListingModal } from '../components/marketplace';

<AddListingModal
  visible={modalVisible}
  projetId={projetActif.id}
  onClose={() => setModalVisible(false)}
  onSuccess={handleListingCreated}
  subjectId={animal.id}
  subjectCode={animal.code}
  subjectWeight={animal.poids_actuel}
/>
```

**Utilisation - Mode Bande (toute la bande):**
```typescript
<AddListingModal
  visible={modalVisible}
  projetId={projetActif.id}
  onClose={() => setModalVisible(false)}
  onSuccess={handleListingCreated}
  batchId={batch.id}
  batchName={batch.pen_name}
  batchCount={batch.total_count}
  batchAverageWeight={batch.average_weight_kg}
/>
```

**Utilisation - Mode Bande (sélection partielle):**
```typescript
<AddListingModal
  visible={modalVisible}
  projetId={projetActif.id}
  onClose={() => setModalVisible(false)}
  onSuccess={handleListingCreated}
  batchId={batch.id}
  batchName={batch.pen_name}
  batchCount={batch.total_count}
  batchAverageWeight={batch.average_weight_kg}
  batchPigIds={selectedPigIds}  // Sous-ensemble
/>
```

**Fonctionnalités:**
- Détection automatique du mode selon les props fournies
- Formulaire adapté au type de listing
- Calcul automatique du prix total
- Gestion de la géolocalisation
- Conditions de vente par défaut
- Validation des données
- Gestion des erreurs

## Backend - Service unifié

### `MarketplaceUnifiedService`

Le nouveau service backend `MarketplaceUnifiedService` remplace les méthodes séparées pour une gestion cohérente.

**Méthodes principales:**

#### `createUnifiedListing(dto, userId, listingType)`
Crée un listing (individuel ou bande) avec validation et gestion des statuts.

**Paramètres:**
- `dto`: `CreateListingDto | CreateBatchListingDto`
- `userId`: ID de l'utilisateur
- `listingType`: `'individual' | 'batch'`

**Processus:**
1. Validation commune (propriété, prix, localisation)
2. Branchement selon le type
3. Pour individuel:
   - Vérification de l'animal
   - Vérification des doublons
   - Insertion dans `marketplace_listings`
   - Mise à jour de `production_animaux.marketplace_status`
4. Pour bande:
   - Vérification de la bande
   - Détermination des porcs à lister (tous ou sous-ensemble)
   - Insertion dans `marketplace_listings`
   - Mise à jour de `batch_pigs.marketplace_status` pour chaque porc
   - Trigger automatique pour `batches.marketplace_status`

#### `updateUnifiedListing(listingId, dto, userId)`
Met à jour un listing (prix, statut, localisation) avec synchronisation des entités sources.

**Mise à jour automatique:**
- Si `status = 'sold'` ou `'removed'`:
  - Individuel: réinitialise `production_animaux.marketplace_status`
  - Bande: réinitialise `batch_pigs.marketplace_status` pour tous les porcs du listing

#### `deleteUnifiedListing(listingId, userId)`
Supprime un listing (marque comme `removed`) avec nettoyage des références.

**Nettoyage automatique:**
- Individuel: `production_animaux.marketplace_status = 'not_listed'`
- Bande: `batch_pigs.marketplace_status = 'not_listed'` pour tous les porcs

## Migrations de base de données

### Migration 063: Uniformisation complète

**Colonnes ajoutées:**

#### `batch_pigs`
- `marketplace_status`: `'not_listed' | 'available' | 'pending_sale' | 'sold'`
- `marketplace_listing_id`: ID du listing actif
- `listed_at`: Date de mise en vente
- `sold_at`: Date de vente

#### `batches`
- `marketplace_status`: `'not_listed' | 'partially_listed' | 'fully_listed'`
- `marketplace_listed_count`: Nombre de porcs listés

**Contraintes renforcées:**
- `marketplace_listings.weight` est obligatoire
- `check_batch_listing` améliorée pour valider la cohérence
- `check_batch_pig_count` pour valider `pig_count` vs `pig_ids`

**Trigger automatique:**
`update_batch_marketplace_status()` - Met à jour automatiquement le statut de la bande quand un porc est listé/délisté.

**Vue enrichie:**
`v_marketplace_listings_enriched` - Vue avec toutes les données nécessaires pour l'affichage, incluant `animal_details`, `batch_details`, `producer_details`.

## Migration d'un code existant

### Avant (code séparé)

**Affichage:**
```typescript
// Avant - composants séparés
{listing.listingType === 'batch' ? (
  <BatchListingCard listing={listing} onPress={handlePress} />
) : (
  <SubjectCard subject={listing} onPress={handlePress} />
)}
```

**Après (composant unifié):**
```typescript
// Après - un seul composant
<UnifiedListingCard listing={listing} onPress={handlePress} />
```

### Avant (création séparée)

**Backend:**
```typescript
// Avant - deux endpoints
POST /marketplace/listings         // Individuel
POST /marketplace/listings/batch   // Bande
```

**Après (unifié):**
```typescript
// Après - mêmes endpoints mais avec service unifié en backend
POST /marketplace/listings         // Gère individuel via MarketplaceUnifiedService
POST /marketplace/listings/batch   // Gère bande via MarketplaceUnifiedService
```

## Bonnes pratiques

### 1. Utilisez `UnifiedListingCard` pour l'affichage
✅ **Bon:**
```typescript
<UnifiedListingCard listing={listing} onPress={handlePress} />
```

❌ **À éviter:**
```typescript
{listing.listingType === 'batch' ? <BatchListingCard ... /> : <SubjectCard ... />}
```

### 2. Utilisez `AddListingModal` pour créer des listings
✅ **Bon:**
```typescript
<AddListingModal
  visible={true}
  projetId={projet.id}
  batchId={batch.id}
  batchName={batch.pen_name}
  batchCount={batch.total_count}
  batchAverageWeight={batch.average_weight_kg}
  onClose={closeModal}
  onSuccess={refreshListings}
/>
```

❌ **À éviter:**
```typescript
// Créer un modal différent pour chaque mode
{isBatch ? <CreateBatchModal ... /> : <CreateAnimalModal ... />}
```

### 3. Filtrage et tri cohérents
Utilisez la vue enrichie pour des requêtes performantes:
```sql
SELECT * FROM v_marketplace_listings_enriched
WHERE status = 'available'
  AND (listing_type = 'individual' OR listing_type = 'batch')
ORDER BY listed_at DESC;
```

### 4. Gestion des statuts
Toujours utiliser les méthodes unifiées pour modifier les statuts:
```typescript
// ✅ Bon - utilise le service unifié
await marketplaceUnifiedService.updateUnifiedListing(listingId, { status: 'sold' }, userId);

// ❌ À éviter - mise à jour SQL directe
await db.query('UPDATE marketplace_listings SET status = $1 WHERE id = $2', ['sold', listingId]);
```

## Compatibilité

### Rétrocompatibilité
Les anciens composants (`SubjectCard`, `BatchListingCard`, `BatchAddModal`) restent disponibles pour la transition mais sont **dépréciés**.

**Plan de migration:**
1. Phase 1 (actuelle): Composants unifiés disponibles, anciens composants maintenus
2. Phase 2 (prochaine version): Warnings de dépréciation sur anciens composants
3. Phase 3 (version majeure suivante): Suppression des anciens composants

### Endpoints API
Les endpoints existants restent inchangés:
- `POST /marketplace/listings` - Mode individuel
- `POST /marketplace/listings/batch` - Mode bande
- `PATCH /marketplace/listings/:id` - Mise à jour (unifié)
- `DELETE /marketplace/listings/:id` - Suppression (unifié)

## Tests

### Tests unitaires recommandés

**Frontend:**
```typescript
describe('UnifiedListingCard', () => {
  it('renders individual listing correctly', () => {
    // Test d'affichage individuel
  });

  it('renders batch listing correctly', () => {
    // Test d'affichage bande
  });

  it('handles selection correctly', () => {
    // Test sélection multiple
  });
});

describe('AddListingModal', () => {
  it('submits individual listing', async () => {
    // Test création individuel
  });

  it('submits batch listing with all pigs', async () => {
    // Test création bande complète
  });

  it('submits batch listing with subset', async () => {
    // Test création bande partielle
  });
});
```

**Backend:**
```typescript
describe('MarketplaceUnifiedService', () => {
  it('creates individual listing and updates animal status', async () => {
    // Test création + synchronisation
  });

  it('creates batch listing and updates pig statuses', async () => {
    // Test création bande + synchronisation
  });

  it('deletes listing and cleans up references', async () => {
    // Test suppression + nettoyage
  });
});
```

## Support et questions

Pour toute question ou problème concernant ces nouveaux composants:
1. Consultez l'analyse complète: `docs/ANALYSE_MARKETPLACE_MODES.md`
2. Vérifiez la migration DB: `backend/database/migrations/063_uniformize_marketplace_batch_support.sql`
3. Examinez les exemples d'utilisation ci-dessus

---

**Dernière mise à jour:** 2026-01-02  
**Version:** 1.0.0

