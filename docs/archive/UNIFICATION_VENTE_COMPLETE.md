# ✅ Unification SaleScreen - TERMINÉE

## 📋 Résumé
L'écran de vente a été unifié pour supporter les deux modes d'élevage (bande et individuel) sans duplication de code.

## 🔧 Modifications Effectuées

### 1. `src/screens/SaleScreen.tsx` ✅ (NOUVEAU)
- **Écran unifié créé** : Supporte les deux modes automatiquement
- **Détection du mode** : Via `useModeElevage()` et paramètres de route
- **Affichage conditionnel** :
  - Mode batch : Affiche les ventes de la bande avec statistiques agrégées
  - Mode individuel : Affiche les ventes individuelles (depuis Redux, catégorie `vente_porc`)
- **Chargement des données** :
  - Mode batch : API `/batch-sales/batch/${batch.id}/history`
  - Mode individuel : Redux (revenus avec catégorie `vente_porc`)
- **Même UI** : Utilise les mêmes composants (Card, SaleCard) pour les deux modes

### 2. `CreateBatchSaleModal` ✅ (INTÉGRÉ DANS SaleScreen)
- **Modal intégré** : Créé directement dans SaleScreen pour les ventes batch
- **Champs** : Nombre de porcs, Poids total, Montant total, Date, Acheteur, Notes
- **Appels API** : Appelle `/batch-sales` (POST)
- **Sélection automatique** : Les porcs les plus lourds sont sélectionnés automatiquement

### 3. `RevenuFormModal` ✅ (EXISTANT)
- **Utilisé en mode individuel** : Déjà existant, utilisé tel quel
- **Catégorie** : `vente_porc` pour les ventes individuelles
- **Intégration** : Fonctionne avec Redux pour charger/affichage

### 4. Backend ✅ (DÉJÀ EXISTANT)
- **Endpoints** :
  - `POST /batch-sales` : Créer une vente batch
  - `GET /batch-sales/batch/:batchId/history` : Historique des ventes batch
- **Service** : `BatchSaleService` avec sélection automatique des porcs les plus lourds
- **DTO** : `CreateSaleDto` avec validation
- **Intégration revenus** : Crée automatiquement un revenu dans la table `revenus`

### 5. Base de données ✅ (DÉJÀ EXISTANTE)
- **Table batch_sales** : (migration 044)
  - Colonnes : `id`, `batch_id`, `sale_date`, `buyer_name`, `buyer_contact`, `sold_pigs` (JSONB), `count`, `total_weight_kg`, `price_per_kg`, `total_price`, `notes`
  - Index : `idx_batch_sales_batch`, `idx_batch_sales_date`
- **Table revenus** : (migration 009)
  - Utilisée pour les ventes individuelles avec catégorie `vente_porc`
  - Colonnes : `id`, `projet_id`, `montant`, `categorie`, `date`, `animal_id`, `poids_kg`, etc.

## 🎯 Fonctionnalités

### Mode Individuel
- Affichage des ventes individuelles (revenus avec catégorie `vente_porc`)
- Formulaire via `RevenuFormModal` avec sélection d'animal
- Statistiques (total ventes, revenu total)
- Filtrage par animal si `animalId` fourni

### Mode Bande
- Affichage des ventes de la bande
- Formulaire avec nombre de porcs, poids total, montant total
- Sélection automatique des porcs les plus lourds
- Statistiques (total ventes, porcs vendus, revenu total)
- Même UI que le mode individuel (cohérence visuelle)

## 📝 Fichiers Créés/Modifiés
- ✅ `src/screens/SaleScreen.tsx` - Créé (écran unifié avec modal batch intégré)

## 🗑️ Fichiers à Supprimer (après tests)
- ⚠️ `src/screens/BatchSaleScreen.tsx` - Plus nécessaire (unifié dans SaleScreen)

## 🔄 Intégration Navigation
- Mettre à jour les endroits qui naviguent vers `BatchSaleScreen` pour utiliser `SaleScreen` avec paramètre `batch`
- Exemple : `navigation.navigate('Sale', { batch: { id, pen_name, total_count } })`

## 🧪 Tests à Effectuer
1. **Mode Individuel** :
   - Ouvrir SaleScreen sans paramètres batch
   - Vérifier l'affichage des ventes individuelles (revenus vente_porc)
   - Créer une vente pour un animal via RevenuFormModal
   - Vérifier que la vente apparaît dans la liste

2. **Mode Bande** :
   - Naviguer vers SaleScreen avec paramètre batch
   - Vérifier l'affichage des ventes de la bande
   - Créer une vente pour N porcs
   - Vérifier que les porcs les plus lourds sont automatiquement sélectionnés
   - Vérifier que les données sont correctement enregistrées
   - Vérifier qu'un revenu est créé automatiquement dans la table revenus

## 📐 Pattern Réutilisé
Le même pattern que VaccinationScreen et WeighingScreen :
1. Détecter le mode via `useModeElevage()` et paramètres de route
2. Charger les données appropriées selon le mode
3. Afficher conditionnellement les champs dans les formulaires
4. Adapter les appels API selon le mode
5. Utiliser les mêmes composants UI pour les deux modes

## 🔗 Intégration Backend
- Les ventes batch créent automatiquement un revenu dans la table `revenus` pour la comptabilité
- Les ventes individuelles utilisent directement la table `revenus` avec catégorie `vente_porc`
- Les deux approches sont cohérentes pour les rapports financiers

