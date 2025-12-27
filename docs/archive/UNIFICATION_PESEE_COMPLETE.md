# ✅ Unification WeighingScreen - TERMINÉE

## 📋 Résumé
L'écran de pesée a été unifié pour supporter les deux modes d'élevage (bande et individuel) sans duplication de code.

## 🔧 Modifications Effectuées

### 1. `src/screens/WeighingScreen.tsx` ✅ (NOUVEAU)
- **Écran unifié créé** : Supporte les deux modes automatiquement
- **Détection du mode** : Via `useModeElevage()` et paramètres de route
- **Affichage conditionnel** :
  - Mode batch : Affiche les pesées de la bande avec statistiques agrégées
  - Mode individuel : Affiche les pesées individuelles (depuis Redux)
- **Chargement des données** :
  - Mode batch : API `/batch-weighings/batch/${batch.id}/history`
  - Mode individuel : Redux (peseesRecents, peseesParAnimal)
- **Même UI** : Utilise les mêmes composants (Card, WeighingCard) pour les deux modes

### 2. `src/components/ProductionPeseeFormModal.tsx` ✅
- **Support mode batch** : Ajout des paramètres `batchId` et `batchTotalCount`
- **Champs conditionnels** :
  - Mode batch : Nombre de porcs, Poids moyen, Poids min/max (optionnel)
  - Mode individuel : Poids individuel avec IA (existant)
- **Appels API adaptés** :
  - Mode batch : Appelle `/batch-weighings` (POST)
  - Mode individuel : Utilise Redux actions (existant)
- **IA désactivée en mode batch** : Le bouton IA n'apparaît qu'en mode individuel

### 3. Backend ✅ (DÉJÀ EXISTANT)
- **Endpoints** :
  - `POST /batch-weighings` : Créer une pesée batch
  - `GET /batch-weighings/batch/:batchId/history` : Historique des pesées batch
- **Service** : `BatchWeighingService` avec sélection automatique des porcs
- **DTO** : `CreateWeighingDto` avec validation

### 4. Base de données ✅ (DÉJÀ EXISTANTE)
- **Table** : `batch_weighings` (migration 044)
- **Colonnes** : `id`, `batch_id`, `weighing_date`, `average_weight_kg`, `min_weight_kg`, `max_weight_kg`, `weighed_pigs` (JSONB), `count`, `notes`
- **Index** : `idx_batch_weighings_batch`, `idx_batch_weighings_date`

## 🎯 Fonctionnalités

### Mode Individuel
- Affichage des pesées récentes ou par animal
- Formulaire avec sélection d'animal
- Estimation IA du poids (photo/vidéo)
- Statistiques (total pesées, poids moyen)

### Mode Bande
- Affichage des pesées de la bande
- Formulaire avec nombre de porcs et poids moyen
- Sélection automatique des porcs (priorité aux non pesés récemment)
- Statistiques (total pesées, poids moyen de la bande)
- Même UI que le mode individuel (cohérence visuelle)

## 📝 Fichiers Créés/Modifiés
- ✅ `src/screens/WeighingScreen.tsx` - Créé (écran unifié)
- ✅ `src/components/ProductionPeseeFormModal.tsx` - Support batch ajouté

## 🗑️ Fichiers à Supprimer (après tests)
- ⚠️ `src/screens/BatchWeighingScreen.tsx` - Plus nécessaire (unifié dans WeighingScreen)

## 🔄 Intégration Navigation
- Mettre à jour les endroits qui naviguent vers `BatchWeighingScreen` pour utiliser `WeighingScreen` avec paramètre `batch`
- Exemple : `navigation.navigate('Weighing', { batch: { id, pen_name, total_count } })`

## 🧪 Tests à Effectuer
1. **Mode Individuel** :
   - Ouvrir WeighingScreen sans paramètres batch
   - Vérifier l'affichage des pesées récentes
   - Créer une pesée pour un animal
   - Tester l'estimation IA

2. **Mode Bande** :
   - Naviguer vers WeighingScreen avec paramètre batch
   - Vérifier l'affichage des pesées de la bande
   - Créer une pesée pour N porcs
   - Vérifier que les porcs sont automatiquement sélectionnés
   - Vérifier que les données sont correctement enregistrées

## 📐 Pattern Réutilisé
Le même pattern que VaccinationScreen :
1. Détecter le mode via `useModeElevage()` et paramètres de route
2. Charger les données appropriées selon le mode
3. Afficher conditionnellement les champs dans les formulaires
4. Adapter les appels API selon le mode
5. Utiliser les mêmes composants UI pour les deux modes

