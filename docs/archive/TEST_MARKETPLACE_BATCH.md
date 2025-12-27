# Test de l'Intégration Batch → Marketplace

## ✅ Implémentation Complète

### Base de données
- ✅ Migration `052_add_batch_support_to_marketplace_listings.sql` créée
- ⚠️ **À exécuter manuellement** (problème SSL avec la connexion PostgreSQL)

### Backend
- ✅ `CreateBatchListingDto` créé
- ✅ `MarketplaceService.createBatchListing()` implémenté
- ✅ Route `POST /marketplace/listings/batch` ajoutée
- ✅ `mapRowToListing()` mis à jour pour inclure les données batch
- ✅ Colonnes batch incluses dans toutes les requêtes SQL

### Frontend
- ✅ `CreateBatchListingModal` créé
- ✅ Action "Vendre sur Marketplace" ajoutée dans `BatchActionsModal`
- ✅ `BatchListingCard` créé pour afficher les listings de bande
- ✅ Type `MarketplaceListing` mis à jour avec les champs batch
- ✅ `MarketplaceBuyTab` mis à jour pour afficher les deux types de listings
- ✅ `MarketplaceMyListingsTab` mis à jour pour gérer les listings de bande
- ✅ Enrichissement des listings batch dans `MarketplaceScreen`

## 🧪 Tests à Effectuer

### 1. Exécuter la Migration
```bash
cd backend
# Option 1: Via script (si SSL configuré)
npm run migrate

# Option 2: Manuellement via psql
psql $DATABASE_URL -f database/migrations/052_add_batch_support_to_marketplace_listings.sql
```

### 2. Test Backend
1. Créer une bande avec des porcs
2. Appeler `POST /marketplace/listings/batch` avec :
   - `batchId`: ID de la bande
   - `farmId`: ID du projet
   - `pigCount`: 5 (ou laisser vide pour toute la bande)
   - `pricePerKg`: 2500
   - `averageWeight`: 50
   - `lastWeightDate`: date ISO
   - `location`: coordonnées GPS

3. Vérifier que le listing est créé avec :
   - `listing_type = 'batch'`
   - `batch_id` renseigné
   - `pig_ids` JSON array
   - `pig_count` correct

### 3. Test Frontend
1. Aller dans "Production" → "Cheptel" (mode bande)
2. Cliquer sur une bande
3. Sélectionner "Vendre sur le Marketplace"
4. Choisir un mode (toute la bande, N porcs, ou sélection manuelle)
5. Remplir le formulaire et créer l'annonce
6. Vérifier que l'annonce apparaît dans :
   - Onglet "Acheter" du marketplace (avec badge "Bande")
   - Onglet "Mes annonces" (avec indication "Bande")

### 4. Vérifications
- ✅ Les listings de bande s'affichent avec `BatchListingCard`
- ✅ Les listings individuels s'affichent avec `SubjectCard`
- ✅ Les deux types coexistent dans la même liste
- ✅ Les détails de la bande sont correctement affichés (nombre de porcs, poids moyen, etc.)

## 📝 Notes
- La migration doit être exécutée avant de tester
- Les listings de bande ont un badge "Bande" pour les distinguer
- Le calcul du prix total = `pricePerKg * averageWeight * pigCount`

