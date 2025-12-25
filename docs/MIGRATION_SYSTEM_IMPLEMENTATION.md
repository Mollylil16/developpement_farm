# Système de Migration Batch ↔ Individualisé

## 📋 Vue d'ensemble

Ce document décrit l'implémentation du système de migration entre les deux modes de gestion :
- **Mode Bande (Batch)** : Gestion par groupes homogènes
- **Mode Individualisé (Individual)** : Suivi individuel de chaque animal

## ✅ Implémentation Backend

### 1. Base de Données

**Migration créée :** `backend/database/migrations/049_create_migration_system.sql`

**Tables créées :**
- `migration_history` : Historique de toutes les migrations avec statistiques et options

**Modifications de tables existantes :**
- `production_animaux` : Ajout de `original_batch_id` (référence à la bande d'origine)
- `batches` : Ajout de `migrated_from_individual` et `original_animal_ids`
- `vaccinations` : Ajout de `batch_id` pour compatibilité
- `production_pesees` : Ajout de `batch_id` pour compatibilité
- `maladies` : Ajout de `batch_id` pour compatibilité

### 2. DTOs

**Fichiers créés :**
- `backend/src/migration/dto/batch-to-individual.dto.ts`
  - `BatchToIndividualOptionsDto` : Options de conversion batch → individualisé
  - `BatchToIndividualDto` : DTO principal
  - Enums : `DistributionMethod`, `HealthRecordsHandling`, `FeedRecordsHandling`

- `backend/src/migration/dto/individual-to-batch.dto.ts`
  - `IndividualToBatchOptionsDto` : Options de conversion individualisé → batch
  - `GroupingCriteriaDto` : Critères de regroupement
  - `IndividualToBatchDto` : DTO principal

- `backend/src/migration/dto/preview.dto.ts`
  - `PreviewBatchToIndividualDto`
  - `PreviewIndividualToBatchDto`

### 3. Service de Migration

**Fichier créé :** `backend/src/migration/pig-migration.service.ts`

**Méthodes principales :**

#### Conversion Batch → Individualisé
- `previewBatchToIndividual()` : Prévisualise la migration
- `convertBatchToIndividual()` : Exécute la conversion
  - Génère des identifiants uniques pour chaque porc
  - Distribue les poids selon la méthode choisie (uniforme, normale, manuelle)
  - Migre les enregistrements de santé (vaccinations, maladies)
  - Migre les pesées avec distribution de poids
  - Crée les animaux dans `production_animaux`

#### Conversion Individualisé → Batch
- `previewIndividualToBatch()` : Prévisualise la migration
- `convertIndividualToBatch()` : Exécute la conversion
  - Groupe les animaux selon les critères (stade, localisation, sexe, race)
  - Calcule les statistiques agrégées (poids moyen, âge moyen, etc.)
  - Crée les bandes dans `batches`
  - Crée les `batch_pigs` correspondants
  - Agrège les enregistrements de santé

**Méthodes utilitaires :**
- `generatePigIdentifiers()` : Génère des numéros d'identification selon un pattern
- `generateWeightDistribution()` : Génère une distribution normale de poids
- `determineProductionStage()` : Détermine le stade de production
- `groupPigsByCriteria()` : Groupe les porcs selon les critères
- `calculateBatchStatistics()` : Calcule les statistiques d'une bande
- `getMigrationHistory()` : Récupère l'historique des migrations

### 4. Contrôleur

**Fichier créé :** `backend/src/migration/migration.controller.ts`

**Endpoints :**
- `POST /migration/preview/batch-to-individual` : Prévisualisation batch → individualisé
- `POST /migration/preview/individual-to-batch` : Prévisualisation individualisé → batch
- `POST /migration/convert/batch-to-individual` : Conversion batch → individualisé
- `POST /migration/convert/individual-to-batch` : Conversion individualisé → batch
- `GET /migration/history/:projetId` : Historique des migrations

### 5. Module

**Fichier créé :** `backend/src/migration/migration.module.ts`
- Importé dans `app.module.ts`

## 🔄 Fonctionnalités Implémentées

### Conversion Batch → Individualisé

**Options disponibles :**
- Génération automatique d'IDs avec pattern personnalisable
- Distribution de poids : uniforme, normale (avec écart-type), ou manuelle
- Ratio mâles/femelles configurable
- Conservation de la référence à la bande d'origine
- Gestion des enregistrements de santé : duplication, générique, ou skip
- Gestion des enregistrements d'alimentation : division ou skip
- Création de pesées initiales

**Processus :**
1. Vérification des permissions
2. Création de l'enregistrement de migration
3. Génération des identifiants et distribution des attributs
4. Création des animaux dans `production_animaux`
5. Migration des enregistrements (vaccinations, maladies, pesées)
6. Mise à jour de l'historique

### Conversion Individualisé → Batch

**Options disponibles :**
- Critères de regroupement :
  - Par stade de production
  - Par localisation
  - Par sexe
  - Par race
  - Tolérance d'âge configurable
- Pattern pour numéro de bande
- Agrégation des enregistrements de santé
- Agrégation des enregistrements d'alimentation
- Conservation des enregistrements individuels
- Taille minimale de bande

**Processus :**
1. Vérification des permissions
2. Création de l'enregistrement de migration
3. Groupement des animaux selon les critères
4. Calcul des statistiques agrégées
5. Création des bandes dans `batches`
6. Création des `batch_pigs`
7. Agrégation des enregistrements de santé
8. Mise à jour de l'historique

## 📊 Gestion des Erreurs

- Transactions de base de données (ROLLBACK en cas d'échec)
- Enregistrement des erreurs dans `migration_history`
- Validation des permissions utilisateur
- Vérification de l'existence des entités

## 🔐 Sécurité

- Vérification de propriété des projets/bandes/animaux
- Authentification JWT requise
- Validation des données d'entrée avec class-validator

## ⏳ À Implémenter (Frontend)

### Composants nécessaires :

1. **MigrationWizard.tsx** : Assistant en plusieurs étapes
   - Étape 1 : Sélection du type de conversion
   - Étape 2 : Sélection des données (bandes ou animaux)
   - Étape 3 : Configuration des options
   - Étape 4 : Prévisualisation
   - Étape 5 : Exécution avec barre de progression
   - Étape 6 : Confirmation et rapport

2. **MigrationPreview.tsx** : Affiche la prévisualisation
   - Statistiques (nombre d'animaux/bandes à créer)
   - Avertissements
   - Données d'exemple

3. **MigrationProgress.tsx** : Barre de progression
   - Affichage des étapes en cours
   - Option d'annulation

4. **MigrationReport.tsx** : Rapport final
   - Résumé de la migration
   - Liste des modifications
   - Option d'export

5. **MigrationHistoryScreen.tsx** : Historique des migrations
   - Liste des migrations passées
   - Détails de chaque migration
   - Filtres par type, date, statut

### Services Frontend :

- `migrationService.ts` : Service pour appeler les APIs
- Types TypeScript pour les DTOs

### Navigation :

- Ajouter un écran dans les paramètres du projet
- Lien depuis le menu de gestion

## 🧪 Tests à Implémenter

### Tests Unitaires :
- Génération d'identifiants
- Distribution de poids
- Groupement d'animaux
- Calcul de statistiques

### Tests d'Intégration :
- Migration complète batch → individualisé
- Migration complète individualisé → batch
- Migration avec rollback
- Migration de grande bande (>1000 animaux)

### Tests E2E :
- Parcours complet de l'assistant
- Prévisualisation puis exécution
- Gestion d'erreurs

## 📝 Notes Techniques

### Performance :
- Pour grandes bandes (>500 animaux), traitement par lots recommandé
- Transactions optimisées
- Index sur les colonnes de migration

### Traçabilité :
- Toutes les migrations sont enregistrées dans `migration_history`
- Conservation des références entre modes (original_batch_id, original_animal_ids)
- Historique complet avec options et statistiques

### Compatibilité :
- Les enregistrements peuvent référencer les deux modes (batch_id dans vaccinations, etc.)
- Pas de perte de données lors de la migration
- Possibilité de migration inverse

## 🚀 Prochaines Étapes

1. ✅ Backend complet (fait)
2. ⏳ Créer les composants frontend
3. ⏳ Ajouter la navigation dans l'app
4. ⏳ Tests unitaires et d'intégration
5. ⏳ Documentation utilisateur
6. ⏳ Tests de performance avec grandes bandes

