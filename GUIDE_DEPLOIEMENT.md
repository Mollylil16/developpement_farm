# Guide de Déploiement - Uniformisation Marketplace

## 🎯 Étapes à suivre maintenant

### Étape 1 : Vérification pré-déploiement ✅

Avant d'appliquer les changements, vérifiez que :

- [ ] Vous avez un backup récent de la base de données
- [ ] Le backend est à jour (NestJS démarre sans erreur)
- [ ] Le frontend compile sans erreur
- [ ] Vous avez accès à la base de données PostgreSQL

### Étape 2 : Application de la migration DB 🗄️

#### Option A : Via le script automatisé (Recommandé)

**Sur Windows PowerShell :**
```powershell
cd backend\database\migrations
psql -U postgres -d farm_db_dev -f 063_uniformize_marketplace_batch_support.sql
```

**Résultat attendu :**
```
NOTICE: ========================================
NOTICE: Migration 063 terminée avec succès
NOTICE: ========================================
NOTICE: Listings actifs: X (Y individuels, Z bandes)
NOTICE: Bandes avec statut marketplace: X
NOTICE: Porcs avec statut marketplace: X
```

#### Option B : Via un client PostgreSQL (pgAdmin, DBeaver, etc.)

1. Ouvrir `backend/database/migrations/063_uniformize_marketplace_batch_support.sql`
2. Exécuter le script complet
3. Vérifier qu'il n'y a pas d'erreur

#### Vérification post-migration

Exécutez ces requêtes pour vérifier que tout est OK :

```sql
-- 1. Vérifier les nouvelles colonnes dans batch_pigs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'batch_pigs' 
AND column_name IN ('marketplace_status', 'marketplace_listing_id', 'listed_at', 'sold_at');
-- Devrait retourner 4 lignes

-- 2. Vérifier les nouvelles colonnes dans batches
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'batches' 
AND column_name IN ('marketplace_status', 'marketplace_listed_count');
-- Devrait retourner 2 lignes

-- 3. Vérifier le trigger
SELECT tgname 
FROM pg_trigger 
WHERE tgname = 'trigger_sync_batch_marketplace_status';
-- Devrait retourner 1 ligne

-- 4. Vérifier la vue enrichie
SELECT COUNT(*) 
FROM information_schema.views 
WHERE table_name = 'v_marketplace_listings_enriched';
-- Devrait retourner 1
```

### Étape 3 : Redémarrage du backend 🔄

```powershell
cd backend
npm run start:dev
```

**Vérifiez dans les logs :**
- ✅ `MarketplaceUnifiedService` est chargé
- ✅ Aucune erreur de connexion DB
- ✅ Les routes marketplace sont disponibles

### Étape 4 : Tests backend manuels 🧪

#### Test 1 : Listing individuel

```bash
# Via PowerShell ou votre client HTTP préféré (Postman, Insomnia, etc.)
curl -X POST http://localhost:3000/marketplace/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subjectId": "ANIMAL_ID_EXISTANT",
    "farmId": "PROJET_ID",
    "pricePerKg": 1500,
    "weight": 80,
    "lastWeightDate": "2026-01-02T00:00:00Z",
    "location": {
      "latitude": 5.345,
      "longitude": -4.024,
      "city": "Abidjan"
    }
  }'
```

**Vérifiez en DB :**
```sql
SELECT * FROM marketplace_listings WHERE id = 'NOUVEAU_LISTING_ID';
-- listing_type devrait être 'individual'

SELECT marketplace_status, marketplace_listing_id 
FROM production_animaux 
WHERE id = 'ANIMAL_ID_EXISTANT';
-- marketplace_status devrait être 'available'
```

#### Test 2 : Listing bande

```bash
curl -X POST http://localhost:3000/marketplace/listings/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "batchId": "BATCH_ID_EXISTANT",
    "farmId": "PROJET_ID",
    "pricePerKg": 1500,
    "averageWeight": 75,
    "lastWeightDate": "2026-01-02T00:00:00Z",
    "location": {
      "latitude": 5.345,
      "longitude": -4.024,
      "city": "Abidjan"
    }
  }'
```

**Vérifiez en DB :**
```sql
SELECT * FROM marketplace_listings WHERE batch_id = 'BATCH_ID_EXISTANT';
-- listing_type devrait être 'batch'

SELECT marketplace_status 
FROM batch_pigs 
WHERE batch_id = 'BATCH_ID_EXISTANT';
-- Tous devraient être 'available'

SELECT marketplace_status, marketplace_listed_count 
FROM batches 
WHERE id = 'BATCH_ID_EXISTANT';
-- marketplace_status devrait être 'fully_listed'
```

### Étape 5 : Tests frontend 📱

#### Test 1 : Compiler le frontend

```powershell
cd ..  # Revenir à la racine
npm run android  # ou npm run ios
```

**Vérifiez :**
- ✅ Pas d'erreur de compilation
- ✅ `UnifiedListingCard` et `AddListingModal` sont importables
- ✅ L'app démarre sans crash

#### Test 2 : Affichage des listings

1. Naviguer vers le marketplace
2. Vérifier que les listings (individuels et bandes) s'affichent correctement
3. Chaque carte doit avoir son badge distinctif ("Individuel" ou "Bande")

#### Test 3 : Création d'un listing

1. Cliquer sur "Ajouter une annonce"
2. Le modal `AddListingModal` devrait s'ouvrir
3. Remplir le formulaire et soumettre
4. Vérifier que l'annonce apparaît dans la liste

### Étape 6 : Tests de validation complets 📋

Suivez la checklist complète : `docs/MARKETPLACE_VALIDATION_CHECKLIST.md`

**Priorité haute (à faire maintenant) :**
- ✅ Tests backend 1-3 (création individuel/bande)
- ✅ Tests frontend 9-10 (affichage)
- ✅ Tests frontend 12-13 (création)

**Priorité moyenne (cette semaine) :**
- ⏳ Tests backend 4-8 (mise à jour, suppression, validations)
- ⏳ Tests frontend 14-16 (edge cases)
- ⏳ Tests d'intégration 17-18

**Priorité basse (avant prod) :**
- ⏳ Test 19 (migration données)
- ⏳ Tests performance 20-21

### Étape 7 : Migration progressive des écrans existants 🔄

**Identifier les écrans à migrer :**

```powershell
# Trouver tous les usages de SubjectCard et BatchListingCard
cd src
grep -r "SubjectCard" . --include="*.tsx" --include="*.ts"
grep -r "BatchListingCard" . --include="*.tsx" --include="*.ts"
```

**Remplacer progressivement :**

```typescript
// AVANT
import { SubjectCard, BatchListingCard } from '../components/marketplace';

{listing.listingType === 'batch' ? (
  <BatchListingCard listing={listing} onPress={handlePress} />
) : (
  <SubjectCard subject={listing} onPress={handlePress} />
)}

// APRÈS
import { UnifiedListingCard } from '../components/marketplace';

<UnifiedListingCard listing={listing} onPress={handlePress} />
```

**Priorité de migration :**
1. `MarketplaceBuyTab.tsx` (onglet Acheter)
2. `MarketplaceMyListingsTab.tsx` (Mes annonces)
3. Autres écrans utilisant les cartes marketplace

### Étape 8 : Monitoring post-déploiement 📊

**Backend - Surveiller les logs :**
```powershell
# Dans le terminal backend
# Chercher les lignes :
# [MarketplaceUnifiedService] Listing créé: ...
# [MarketplaceUnifiedService] Listing ... mis à jour
```

**Base de données - Requêtes de monitoring :**

```sql
-- État global du marketplace
SELECT 
  COUNT(*) FILTER (WHERE listing_type = 'individual') as individuels,
  COUNT(*) FILTER (WHERE listing_type = 'batch') as bandes,
  COUNT(*) FILTER (WHERE status = 'available') as disponibles
FROM marketplace_listings
WHERE status != 'removed';

-- Synchronisation des statuts
SELECT 
  COUNT(*) as total_porcs_listes,
  COUNT(*) FILTER (WHERE marketplace_status = 'available') as disponibles,
  COUNT(*) FILTER (WHERE marketplace_status = 'sold') as vendus
FROM batch_pigs
WHERE marketplace_status IS NOT NULL AND marketplace_status != 'not_listed';

-- Bandes avec incohérences (devrait être 0)
SELECT b.id, b.marketplace_status, b.marketplace_listed_count,
       COUNT(bp.id) FILTER (WHERE bp.marketplace_status IN ('available', 'pending_sale')) as actual_count
FROM batches b
LEFT JOIN batch_pigs bp ON b.id = bp.batch_id
WHERE b.marketplace_status != 'not_listed'
GROUP BY b.id, b.marketplace_status, b.marketplace_listed_count
HAVING COUNT(bp.id) FILTER (WHERE bp.marketplace_status IN ('available', 'pending_sale')) != b.marketplace_listed_count;
```

### Étape 9 : Documentation pour l'équipe 📚

**Partager avec l'équipe :**
1. `UNIFORMISATION_MARKETPLACE_COMPLETE.md` - Vue d'ensemble
2. `docs/MARKETPLACE_UNIFIED_USAGE.md` - Guide technique
3. Ce guide de déploiement

**Points à communiquer :**
- ✅ Nouveaux composants disponibles (`UnifiedListingCard`, `AddListingModal`)
- ✅ Anciens composants toujours fonctionnels mais dépréciés
- ✅ Migration progressive sur 2-3 semaines
- ✅ Aucun breaking change pour les utilisateurs

### Étape 10 : Planning de déploiement production 🚀

**Semaine 1 (actuelle) :**
- ✅ Migration DB sur dev
- ✅ Tests backend et frontend
- ✅ Migration des écrans principaux

**Semaine 2 :**
- ⏳ Déploiement sur staging
- ⏳ Tests utilisateurs beta
- ⏳ Corrections si nécessaire

**Semaine 3 :**
- ⏳ Revue de code finale
- ⏳ Documentation utilisateur
- ⏳ Préparation production

**Semaine 4 :**
- ⏳ Déploiement production (heure creuse)
- ⏳ Monitoring intensif 24h
- ⏳ Collecte feedback utilisateurs

## 🆘 En cas de problème

### Rollback de la migration

Si un problème critique survient :

```sql
-- 1. Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_sync_batch_marketplace_status ON batch_pigs;
DROP FUNCTION IF EXISTS update_batch_marketplace_status();

-- 2. Supprimer la vue
DROP VIEW IF EXISTS v_marketplace_listings_enriched;

-- 3. Supprimer les colonnes ajoutées
ALTER TABLE batch_pigs 
  DROP COLUMN IF EXISTS marketplace_status,
  DROP COLUMN IF EXISTS marketplace_listing_id,
  DROP COLUMN IF EXISTS listed_at,
  DROP COLUMN IF EXISTS sold_at;

ALTER TABLE batches
  DROP COLUMN IF EXISTS marketplace_status,
  DROP COLUMN IF EXISTS marketplace_listed_count;

-- 4. Restaurer les contraintes originales si nécessaire
ALTER TABLE marketplace_listings
  ALTER COLUMN weight DROP NOT NULL;
```

### Support

**Documentation :**
- Guide technique : `docs/MARKETPLACE_UNIFIED_USAGE.md`
- Checklist : `docs/MARKETPLACE_VALIDATION_CHECKLIST.md`
- Analyse : `docs/ANALYSE_MARKETPLACE_MODES.md`

**Contact :**
- Backend : Équipe Backend
- Frontend : Équipe Frontend
- DB : Équipe DevOps

## ✅ Checklist de déploiement

Cochez au fur et à mesure :

- [ ] Migration DB appliquée
- [ ] Vérifications post-migration OK
- [ ] Backend redémarré sans erreur
- [ ] Tests backend manuels passés
- [ ] Frontend compile sans erreur
- [ ] Tests frontend manuels passés
- [ ] Au moins 1 écran migré vers les nouveaux composants
- [ ] Documentation partagée avec l'équipe
- [ ] Monitoring en place
- [ ] Planning de déploiement staging défini

---

**Date de création :** 2026-01-02  
**Dernière mise à jour :** 2026-01-02  
**Version :** 1.0.0

