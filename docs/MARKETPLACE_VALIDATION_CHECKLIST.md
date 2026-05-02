# Checklist de validation - Uniformisation Marketplace

## Objectif
Valider que l'uniformisation des processus marketplace entre modes individuel et par bande fonctionne correctement.

## Pré-requis

### Base de données
- [ ] Migration 063 exécutée avec succès
- [ ] Colonnes ajoutées dans `batch_pigs` (marketplace_status, marketplace_listing_id, listed_at, sold_at)
- [ ] Colonnes ajoutées dans `batches` (marketplace_status, marketplace_listed_count)
- [ ] Contraintes renforcées sur `marketplace_listings`
- [ ] Trigger `update_batch_marketplace_status()` créé
- [ ] Vue `v_marketplace_listings_enriched` créée

### Backend
- [ ] `MarketplaceUnifiedService` créé et exporté dans le module
- [ ] Controller mis à jour pour utiliser le service unifié
- [ ] Endpoints `/marketplace/listings` et `/marketplace/listings/batch` utilisent le service unifié

### Frontend
- [ ] `UnifiedListingCard` créé et exporté
- [ ] `AddListingModal` créé et exporté
- [ ] Composants disponibles dans `src/components/marketplace/index.ts`

---

## Tests Backend

### 1. Création de listing individuel

**Étapes:**
1. Créer un projet avec `management_method = 'individual'`
2. Créer un animal actif dans `production_animaux`
3. Appeler `POST /marketplace/listings` avec:
   ```json
   {
     "subjectId": "<animal_id>",
     "farmId": "<projet_id>",
     "pricePerKg": 1500,
     "weight": 80,
     "lastWeightDate": "2026-01-02T00:00:00Z",
     "location": {
       "latitude": 5.345,
       "longitude": -4.024,
       "city": "Abidjan"
     }
   }
   ```

**Résultats attendus:**
- [ ] Listing créé avec `listing_type = 'individual'`
- [ ] `subject_id` renseigné, `batch_id` NULL
- [ ] `pig_count = 1`, `pig_ids = []`
- [ ] `production_animaux.marketplace_status = 'available'`
- [ ] `production_animaux.marketplace_listing_id` renseigné
- [ ] `calculated_price = pricePerKg * weight`

### 2. Création de listing bande (complète)

**Étapes:**
1. Créer un projet avec `management_method = 'batch'`
2. Créer une bande dans `batches` avec `total_count = 10`
3. Créer 10 porcs dans `batch_pigs` avec `batch_id` correspondant
4. Appeler `POST /marketplace/listings/batch` avec:
   ```json
   {
     "batchId": "<batch_id>",
     "farmId": "<projet_id>",
     "pricePerKg": 1500,
     "averageWeight": 75,
     "lastWeightDate": "2026-01-02T00:00:00Z",
     "location": {
       "latitude": 5.345,
       "longitude": -4.024,
       "city": "Abidjan"
     }
   }
   ```

**Résultats attendus:**
- [ ] Listing créé avec `listing_type = 'batch'`
- [ ] `batch_id` renseigné, `subject_id` NULL
- [ ] `pig_count = 10`, `pig_ids` contient 10 IDs
- [ ] `weight = 75` (poids moyen)
- [ ] Tous les `batch_pigs.marketplace_status = 'available'`
- [ ] Tous les `batch_pigs.marketplace_listing_id` renseignés
- [ ] Tous les `batch_pigs.listed_at` renseignés
- [ ] `batches.marketplace_status = 'fully_listed'`
- [ ] `batches.marketplace_listed_count = 10`
- [ ] `calculated_price = pricePerKg * weight * pig_count`

### 3. Création de listing bande (partielle)

**Étapes:**
1. Utiliser la même bande que le test 2
2. Appeler `POST /marketplace/listings/batch` avec `pigCount = 5`

**Résultats attendus:**
- [ ] Listing créé avec `pig_count = 5`
- [ ] `pig_ids` contient 5 IDs (les 5 porcs les plus lourds non déjà listés)
- [ ] 5 `batch_pigs.marketplace_status = 'available'`
- [ ] `batches.marketplace_status = 'partially_listed'`
- [ ] `batches.marketplace_listed_count = 5`

### 4. Mise à jour de listing (individuel)

**Étapes:**
1. Créer un listing individuel (test 1)
2. Appeler `PATCH /marketplace/listings/:id` avec:
   ```json
   {
     "pricePerKg": 1600
   }
   ```

**Résultats attendus:**
- [ ] `marketplace_listings.price_per_kg = 1600`
- [ ] `calculated_price` recalculé automatiquement
- [ ] `updated_at` mis à jour

### 5. Mise à jour de statut (bande)

**Étapes:**
1. Créer un listing bande (test 2)
2. Appeler `PATCH /marketplace/listings/:id` avec:
   ```json
   {
     "status": "sold"
   }
   ```

**Résultats attendus:**
- [ ] `marketplace_listings.status = 'sold'`
- [ ] Tous les `batch_pigs.marketplace_status = 'sold'`
- [ ] Tous les `batch_pigs.sold_at` renseignés
- [ ] Tous les `batch_pigs.marketplace_listing_id` NULL
- [ ] `batches.marketplace_status = 'not_listed'`
- [ ] `batches.marketplace_listed_count = 0`

### 6. Suppression de listing (individuel)

**Étapes:**
1. Créer un listing individuel (test 1)
2. Appeler `DELETE /marketplace/listings/:id`

**Résultats attendus:**
- [ ] `marketplace_listings.status = 'removed'`
- [ ] `production_animaux.marketplace_status = 'not_listed'`
- [ ] `production_animaux.marketplace_listing_id` NULL

### 7. Validation des contraintes

**Étapes:**
1. Tenter de créer un listing individuel avec `subjectId` inexistant
2. Tenter de créer un listing bande avec `batchId` inexistant
3. Tenter de créer un listing individuel pour un animal déjà listé
4. Tenter de créer un listing bande avec `pigCount` > `total_count`

**Résultats attendus:**
- [ ] Erreur 404: Animal introuvable
- [ ] Erreur 404: Bande introuvable
- [ ] Erreur 400: Animal déjà en vente
- [ ] Erreur 400: Quantité supérieure au total disponible

### 8. Vue enrichie

**Étapes:**
1. Créer plusieurs listings (individuels et bandes)
2. Interroger `v_marketplace_listings_enriched`

**Résultats attendus:**
- [ ] Tous les listings actifs retournés
- [ ] `animal_details` présent pour les listings individuels
- [ ] `batch_details` présent pour les listings bande
- [ ] `producer_details` présent pour tous
- [ ] Données JSON correctement parsées

---

## Tests Frontend

### 9. UnifiedListingCard - Affichage individuel

**Étapes:**
1. Charger un listing individuel depuis l'API
2. Afficher avec `<UnifiedListingCard listing={listing} onPress={handlePress} />`

**Résultats attendus:**
- [ ] Badge "Individuel" affiché
- [ ] Code animal affiché
- [ ] Race affichée
- [ ] Âge affiché
- [ ] Poids affiché
- [ ] Statut de santé affiché (icône + couleur)
- [ ] Prix au kg affiché
- [ ] Prix total affiché
- [ ] Localisation affichée
- [ ] Animation glassmorphism fonctionne
- [ ] Clic sur la carte déclenche `onPress`

### 10. UnifiedListingCard - Affichage bande

**Étapes:**
1. Charger un listing bande depuis l'API
2. Afficher avec `<UnifiedListingCard listing={listing} onPress={handlePress} />`

**Résultats attendus:**
- [ ] Badge "Bande" affiché
- [ ] Nombre de sujets affiché
- [ ] Poids moyen affiché
- [ ] Poids total affiché
- [ ] Prix au kg affiché
- [ ] Prix total affiché
- [ ] Localisation affichée
- [ ] Animation glassmorphism fonctionne
- [ ] Clic sur la carte déclenche `onPress`

### 11. UnifiedListingCard - Sélection multiple

**Étapes:**
1. Afficher plusieurs cartes avec `selectable={true}`
2. Cliquer sur plusieurs cartes

**Résultats attendus:**
- [ ] Checkbox affiché en haut à droite
- [ ] Checkbox se remplit au clic
- [ ] Bordure change de couleur quand sélectionné
- [ ] `onSelect` appelé à chaque clic

### 12. AddListingModal - Mode individuel

**Étapes:**
1. Ouvrir le modal avec props individuelles:
   ```typescript
   <AddListingModal
     visible={true}
     projetId={projet.id}
     subjectId={animal.id}
     subjectCode={animal.code}
     subjectWeight={80}
     onClose={closeModal}
     onSuccess={refreshListings}
   />
   ```
2. Entrer un prix: `1500`
3. Accepter les conditions
4. Soumettre

**Résultats attendus:**
- [ ] Titre: "Publier un animal"
- [ ] Badge "Animal individuel" avec icône patte
- [ ] Code animal affiché
- [ ] Type: "Animal individuel"
- [ ] Poids affiché: "80.0 kg"
- [ ] Pas de champ "Quantité"
- [ ] Prix total calculé: `80 × 1500 = 120,000 FCFA`
- [ ] Conditions de vente affichées
- [ ] Checkbox de validation fonctionnel
- [ ] Bouton désactivé sans acceptation
- [ ] Soumission appelle `POST /marketplace/listings`
- [ ] Modal se ferme après succès
- [ ] `onSuccess` appelé

### 13. AddListingModal - Mode bande (complète)

**Étapes:**
1. Ouvrir le modal avec props bande:
   ```typescript
   <AddListingModal
     visible={true}
     projetId={projet.id}
     batchId={batch.id}
     batchName="A1"
     batchCount={10}
     batchAverageWeight={75}
     onClose={closeModal}
     onSuccess={refreshListings}
   />
   ```
2. Entrer un prix: `1500`
3. Accepter les conditions
4. Soumettre

**Résultats attendus:**
- [ ] Titre: "Publier une bande"
- [ ] Badge "Bande (lot)" avec icône personnes
- [ ] Nom de la bande affiché: "A1"
- [ ] Type: "Bande (lot)"
- [ ] Nombre de sujets: "10"
- [ ] Poids moyen: "75.0 kg"
- [ ] Poids total: "750.0 kg"
- [ ] Champ "Quantité" affiché avec valeur "10"
- [ ] Prix total calculé: `10 × 75 × 1500 = 1,125,000 FCFA`
- [ ] Conditions de vente affichées
- [ ] Soumission appelle `POST /marketplace/listings/batch`
- [ ] Modal se ferme après succès
- [ ] `onSuccess` appelé

### 14. AddListingModal - Mode bande (partielle)

**Étapes:**
1. Ouvrir le modal avec `batchPigIds` spécifiques (5 IDs)
2. Champ "Quantité" devrait être désactivé et afficher "5"
3. Soumettre

**Résultats attendus:**
- [ ] Quantité: "5" (non éditable)
- [ ] Helper text: "5 sujets sélectionnés"
- [ ] Prix total calculé: `5 × 75 × 1500 = 562,500 FCFA`
- [ ] Soumission avec `pigIds` dans le body

### 15. Gestion des erreurs

**Étapes:**
1. Ouvrir `AddListingModal` sans connexion internet
2. Soumettre le formulaire

**Résultats attendus:**
- [ ] Spinner affiché pendant la soumission
- [ ] Alert d'erreur affiché avec message clair
- [ ] Modal reste ouvert
- [ ] Bouton redevient actif

### 16. Géolocalisation

**Étapes:**
1. Ouvrir `AddListingModal`
2. Refuser la permission de localisation
3. Soumettre

**Résultats attendus:**
- [ ] Alert: "Localisation requise"
- [ ] Soumission annulée
- [ ] Modal reste ouvert

---

## Tests d'intégration

### 17. Workflow complet - Individuel

**Scénario:**
1. Créer un projet individuel
2. Ajouter un animal
3. Créer un listing via `AddListingModal`
4. Vérifier l'affichage avec `UnifiedListingCard`
5. Mettre à jour le prix
6. Vendre l'animal (changer statut)
7. Vérifier que l'animal n'apparaît plus dans les disponibles

**Résultats attendus:**
- [ ] Workflow fluide sans erreur
- [ ] Données cohérentes entre frontend et backend
- [ ] Statuts synchronisés à chaque étape

### 18. Workflow complet - Bande

**Scénario:**
1. Créer un projet par bande
2. Créer une bande avec 10 porcs
3. Créer un listing de 5 porcs via `AddListingModal`
4. Vérifier l'affichage avec `UnifiedListingCard`
5. Créer un second listing avec les 5 porcs restants
6. Vérifier que `batches.marketplace_status = 'fully_listed'`
7. Vendre le premier listing
8. Vérifier que `batches.marketplace_status = 'partially_listed'`

**Résultats attendus:**
- [ ] Workflow fluide sans erreur
- [ ] Statuts de bande correctement mis à jour
- [ ] Impossible de lister les mêmes porcs deux fois

### 19. Migration de données existantes

**Étapes:**
1. Si des listings existent avant la migration 063
2. Exécuter la migration
3. Vérifier que les listings existants ont:
   - `weight` renseigné (fallback si NULL)
   - `pig_ids = []` pour les individuels
   - `pig_count = 1` pour les individuels

**Résultats attendus:**
- [ ] Aucun listing cassé
- [ ] Contraintes respectées
- [ ] Données corrigées automatiquement

---

## Tests de performance

### 20. Requête sur gros volume

**Étapes:**
1. Créer 100 listings (50 individuels, 50 bandes)
2. Interroger `v_marketplace_listings_enriched`
3. Mesurer le temps de réponse

**Résultats attendus:**
- [ ] Temps < 500ms pour 100 listings
- [ ] Pas de requêtes N+1
- [ ] Index utilisés correctement

### 21. Trigger en masse

**Étapes:**
1. Créer une bande avec 100 porcs
2. Lister tous les porcs
3. Vendre le listing (change 100 statuts)
4. Mesurer le temps d'exécution du trigger

**Résultats attendus:**
- [ ] Temps < 1s pour 100 porcs
- [ ] Statut de la bande correctement mis à jour
- [ ] Pas de deadlock

---

## Validation finale

### Checklist de déploiement

- [ ] Tous les tests backend passent (1-8)
- [ ] Tous les tests frontend passent (9-16)
- [ ] Tests d'intégration passent (17-19)
- [ ] Tests de performance acceptables (20-21)
- [ ] Documentation à jour (`MARKETPLACE_UNIFIED_USAGE.md`)
- [ ] Migration 063 testée sur environnement de staging
- [ ] Composants unifiés exportés correctement
- [ ] Anciens composants marqués comme dépréciés (commentaires)
- [ ] README mis à jour avec instructions de migration

### Critères de succès

✅ **L'uniformisation est réussie si:**
- Aucune différence perceptible par l'utilisateur entre modes individuel et bande
- Mêmes composants frontend pour les deux modes
- Même logique backend pour CRUD
- Statuts toujours synchronisés entre `marketplace_listings`, `production_animaux`, `batch_pigs`, `batches`
- Aucune régression sur les fonctionnalités existantes
- Performance maintenue ou améliorée

---

**Date de validation:** _______________  
**Validé par:** _______________  
**Version:** 1.0.0

