# Analyse approfondie du module Reproduction - Gestation

**Date**: 2026-01-17  
**Objectif**: Identifier les incohérences, code mort, endpoints concurrents et méthodes non uniformisées entre les modes batch et individuel.

---

## 📋 Table des matières

1. [Architecture actuelle](#architecture-actuelle)
2. [Problèmes identifiés](#problèmes-identifiés)
3. [Incohérences structurelles](#incohérences-structurelles)
4. [Code mort et méthodes inutilisées](#code-mort-et-méthodes-inutilisées)
5. [Endpoints concurrents](#endpoints-concurrents)
6. [Différences de logique métier](#différences-de-logique-métier)
7. [Recommandations](#recommandations)

---

## 🏗️ Architecture actuelle

### Structure des fichiers

#### Mode Individuel
- **Controller**: `backend/src/reproduction/reproduction.controller.ts`
  - Routes: `/reproduction/gestations/*`
  - Endpoints: POST, GET, GET/:id, PATCH/:id, DELETE/:id
- **Service**: `backend/src/reproduction/reproduction.service.ts`
  - Méthodes: `createGestation`, `findAllGestations`, `findGestationsEnCours`, `findOneGestation`, `updateGestation`, `deleteGestation`
- **DTO**: `backend/src/reproduction/dto/create-gestation.dto.ts`
  - Champs: `projet_id`, `truie_id`, `truie_nom`, `verrat_id`, `verrat_nom`, `date_sautage`, `nombre_porcelets_prevu`, `notes`
- **Table DB**: `gestations`
  - Structure: `id`, `projet_id`, `truie_id` (FK → `production_animaux`), `verrat_id` (FK → `production_animaux`), `date_sautage`, `date_mise_bas_prevue`, `date_mise_bas_reelle`, `nombre_porcelets_prevu`, `nombre_porcelets_reel`, `statut` ('en_cours', 'terminee', 'annulee'), `notes`

#### Mode Batch
- **Controller**: `backend/src/batches/batch-gestation.controller.ts`
  - Routes: `/batch-gestations/*`
  - Endpoints: POST, PATCH/:id, GET/batch/:batchId, GET/:id
  - **⚠️ MANQUE**: DELETE endpoint
- **Service**: `backend/src/batches/batch-gestation.service.ts`
  - Méthodes: `createGestation`, `updateGestation`, `getGestationsByBatch`, `getGestationById`
  - **⚠️ MANQUE**: `deleteGestation`, `findAllGestations` (par projet)
- **DTO**: `backend/src/batches/dto/create-gestation.dto.ts`
  - Champs: `batch_id`, `mating_date`, `verrat_id?`, `verrat_nom?`, `piglets_expected?`, `notes?`
  - **⚠️ INCOHÉRENCE**: `mating_date` vs `date_sautage` (mode individuel)
- **Table DB**: `batch_gestations`
  - Structure: `id`, `batch_id`, `pig_id` (FK → `batch_pigs`), `mating_date`, `expected_delivery_date`, `actual_delivery_date`, `piglets_born_count`, `piglets_alive_count`, `piglets_dead_count`, `status` ('pregnant', 'delivered', 'aborted', 'lost'), `notes`

---

## 🚨 Problèmes identifiés

### 1. **Endpoints manquants en mode batch**

#### ❌ DELETE manquant
- **Mode individuel**: `DELETE /reproduction/gestations/:id` ✅
- **Mode batch**: **AUCUN endpoint DELETE** ❌
- **Impact**: Impossible de supprimer une gestation batch via l'API

#### ❌ GET par projet manquant
- **Mode individuel**: `GET /reproduction/gestations?projet_id=xxx` ✅
- **Mode batch**: Seulement `GET /batch-gestations/batch/:batchId` (par bande) ❌
- **Impact**: Impossible de récupérer toutes les gestations batch d'un projet en une requête

### 2. **Incohérences de nommage**

| Concept | Mode Individuel | Mode Batch | Problème |
|---------|----------------|------------|----------|
| Date sautage | `date_sautage` | `mating_date` | **Noms différents pour même concept** |
| Date mise bas prévue | `date_mise_bas_prevue` | `expected_delivery_date` | **Noms différents** |
| Date mise bas réelle | `date_mise_bas_reelle` | `actual_delivery_date` | **Noms différents** |
| Nombre porcelets prévu | `nombre_porcelets_prevu` | `piglets_expected` | **Noms différents** |
| Nombre porcelets réel | `nombre_porcelets_reel` | `piglets_born_count` | **Concepts différents** (batch a aussi `piglets_alive_count`, `piglets_dead_count`) |
| Statut | `statut` ('en_cours', 'terminee', 'annulee') | `status` ('pregnant', 'delivered', 'aborted', 'lost') | **Valeurs complètement différentes** |

### 3. **Logique métier divergente**

#### Sélection de la truie
- **Mode individuel**: L'utilisateur **sélectionne explicitement** la truie (`truie_id` requis)
- **Mode batch**: Le système **sélectionne automatiquement** une truie non gestante (`selectNonPregnantSow()`)
- **Problème**: Comportements totalement différents, pas de cohérence

#### Gestion du verrat
- **Mode individuel**: `verrat_id` et `verrat_nom` optionnels, validation complète si fourni
- **Mode batch**: `verrat_id` et `verrat_nom` optionnels, **mais pas de validation** dans le service
- **Problème**: Validation incohérente

#### Calcul de la date de mise bas
- **Mode individuel**: Méthode `calculerDateMiseBasPrevue()` avec constante `DUREE_GESTATION_JOURS = 114`
- **Mode batch**: Méthode `calculateExpectedDeliveryDate()` avec valeur hardcodée `114` jours
- **Problème**: Code dupliqué, pas de source unique de vérité

#### Mise à jour du statut de l'animal
- **Mode individuel**: **AUCUNE** mise à jour du statut de la truie dans `production_animaux`
- **Mode batch**: Mise à jour automatique de `batch_pigs.gestation_status` = 'pregnant' puis 'delivered'
- **Problème**: Incohérence dans le suivi de l'état de gestation

### 4. **Code mort et duplications**

#### Duplication dans `updateGestation` (mode individuel)
```typescript
// Ligne 405-408
if (verratNom !== undefined) {
  fields.push(`verrat_nom = $${paramIndex}`);
  values.push(verratNom || null);
  paramIndex++;
}
// Ligne 410-413 - DUPLICATION !
if (updateGestationDto.verrat_nom !== undefined) {
  fields.push(`verrat_nom = $${paramIndex}`);
  values.push(updateGestationDto.verrat_nom || null);
  paramIndex++;
}
```
**Impact**: `verrat_nom` peut être ajouté deux fois dans la requête SQL, causant une erreur.

#### Méthodes de validation dupliquées
- `checkProjetOwnership()` (mode individuel) vs `checkBatchOwnership()` (mode batch)
- Logique similaire mais implémentations différentes

#### Génération d'ID
- Mode individuel: `gestation_${Date.now()}_${random}`
- Mode batch: `gest_${Date.now()}_${random}`
- **Problème**: Formats différents, pas de cohérence

### 5. **Problèmes de structure de données**

#### Tables séparées
- `gestations` (mode individuel) et `batch_gestations` (mode batch) sont **complètement séparées**
- **Problème**: Impossible de faire des requêtes unifiées, statistiques séparées

#### Champs manquants
- **Mode batch**: Pas de champ `verrat_id` dans la table `batch_gestations` (seulement dans le DTO)
- **Mode individuel**: Pas de distinction entre `piglets_alive_count` et `piglets_dead_count`

### 6. **Frontend - Incohérences d'utilisation**

#### Endpoints utilisés
- **Mode individuel**: `/reproduction/gestations/*` via `GestationFormModal.tsx`
- **Mode batch**: `/batch-gestations/*` via `GestationScreen.tsx` (modal séparé `CreateBatchGestationModal`)
- **Problème**: Deux composants modaux différents, logique dupliquée

#### Détection du mode
- Le frontend détecte le mode via `projetActif?.management_method === 'batch'`
- **Problème**: Si le mode change, le frontend doit gérer deux flux complètement différents

---

## 🔍 Incohérences structurelles

### 1. **Validation des animaux**

#### Mode Individuel
```typescript
// Validation complète de la truie
- Existence dans production_animaux
- Vérification sexe === 'femelle'
- Vérification statut === 'actif'
- Vérification reproducteur === true

// Validation complète du verrat (si fourni)
- Même validations que la truie mais sexe === 'male'
```

#### Mode Batch
```typescript
// Validation minimale
- Vérification que la bande existe
- Vérification que la bande contient des truies
- Sélection automatique d'une truie (pas de validation explicite)
- AUCUNE validation du verrat
```

**Impact**: Risque d'erreurs en mode batch si un verrat invalide est fourni.

### 2. **Gestion des erreurs**

#### Mode Individuel
- Messages d'erreur détaillés et spécifiques
- Validation préalable avant insertion

#### Mode Batch
- Messages d'erreur génériques
- Validation minimale

### 3. **Statistiques**

#### Mode Individuel
- Endpoints dédiés: `/reproduction/stats/gestations`, `/reproduction/stats/sevrages`, `/reproduction/stats/taux-survie`
- Calculs basés sur la table `gestations`

#### Mode Batch
- **AUCUN endpoint de statistiques** ❌
- Impossible de calculer des statistiques batch

---

## 💀 Code mort et méthodes inutilisées

### 1. **Méthodes potentiellement inutilisées**

#### Dans `ReproductionService`
- `getStatistiquesGestations()` - Utilisé uniquement en mode individuel
- `getStatistiquesSevrages()` - Utilisé uniquement en mode individuel
- `getTauxSurvie()` - Utilisé uniquement en mode individuel

**Problème**: Pas d'équivalent batch, statistiques incomplètes.

### 2. **Code dupliqué non factorisé**

#### Calcul de date de mise bas
- `calculerDateMiseBasPrevue()` (individuel)
- `calculateExpectedDeliveryDate()` (batch)
- **Solution**: Créer un service partagé `GestationDateService`

#### Validation de propriété
- `checkProjetOwnership()` (individuel)
- `checkBatchOwnership()` (batch)
- **Solution**: Factoriser dans un service commun

---

## 🔄 Endpoints concurrents

### Problème principal: Deux systèmes parallèles

| Action | Mode Individuel | Mode Batch | Cohérence |
|--------|----------------|------------|-----------|
| Créer | `POST /reproduction/gestations` | `POST /batch-gestations` | ❌ Routes différentes |
| Lister | `GET /reproduction/gestations?projet_id=xxx` | `GET /batch-gestations/batch/:batchId` | ❌ Paramètres différents |
| Détails | `GET /reproduction/gestations/:id` | `GET /batch-gestations/:id` | ❌ Routes différentes |
| Modifier | `PATCH /reproduction/gestations/:id` | `PATCH /batch-gestations/:id` | ❌ Routes différentes |
| Supprimer | `DELETE /reproduction/gestations/:id` | **MANQUANT** | ❌ Fonctionnalité manquante |
| Stats | `GET /reproduction/stats/*` | **MANQUANT** | ❌ Fonctionnalité manquante |

**Impact**: Le frontend doit gérer deux APIs complètement différentes selon le mode.

---

## 📊 Différences de logique métier

### 1. **Sélection de la truie**

#### Mode Individuel
```typescript
// L'utilisateur doit fournir truie_id explicitement
createGestationDto.truie_id // REQUIS
// Validation complète de la truie
```

#### Mode Batch
```typescript
// Sélection automatique
const pigId = await this.selectNonPregnantSow(dto.batch_id);
// Critères: sex='female', gestation_status IS NULL OR 'not_pregnant'
// Tri: gestation_status NULL en premier, puis entry_date ASC
```

**Problème**: Comportements totalement différents, pas de cohérence UX.

### 2. **Gestion du verrat**

#### Mode Individuel
- Validation complète si fourni
- Vérification existence, sexe, statut, reproducteur

#### Mode Batch
- Pas de validation dans le service
- `verrat_id` et `verrat_nom` stockés mais non validés

### 3. **Mise à jour du statut**

#### Mode Individuel
- **AUCUNE** mise à jour de `production_animaux`
- La truie peut avoir plusieurs gestations "en_cours" simultanément (pas de vérification)

#### Mode Batch
- Mise à jour automatique de `batch_pigs.gestation_status`
- Empêche les gestations multiples (via `selectNonPregnantSow`)

**Problème**: Incohérence dans la gestion de l'état.

---

## 🎯 Recommandations

### Priorité 1: Corrections critiques

1. **Ajouter DELETE en mode batch**
   - Créer `DELETE /batch-gestations/:id`
   - Implémenter `deleteGestation()` dans `BatchGestationService`

2. **Corriger la duplication dans `updateGestation`**
   - Supprimer la ligne 410-413 (duplication de `verrat_nom`)

3. **Ajouter GET par projet en mode batch**
   - Créer `GET /batch-gestations/projet/:projetId`
   - Permettre de lister toutes les gestations batch d'un projet

### Priorité 2: Uniformisation

4. **Créer un service partagé pour les dates**
   ```typescript
   // backend/src/common/services/gestation-date.service.ts
   export class GestationDateService {
     static readonly DUREE_GESTATION_JOURS = 114;
     static calculateExpectedDeliveryDate(matingDate: string): string;
   }
   ```

5. **Uniformiser les noms de champs dans les DTOs**
   - Utiliser `date_sautage` partout (pas `mating_date`)
   - Utiliser `date_mise_bas_prevue` partout (pas `expected_delivery_date`)
   - Créer un mapping si nécessaire pour la compatibilité

6. **Uniformiser les statuts**
   - Créer un enum partagé: `GestationStatus`
   - Mapper entre les deux systèmes si nécessaire

### Priorité 3: Améliorations structurelles

7. **Ajouter validation du verrat en mode batch**
   - Valider l'existence et les propriétés du verrat si fourni
   - Utiliser la même logique que le mode individuel

8. **Ajouter statistiques batch**
   - Créer `GET /batch-gestations/stats/projet/:projetId`
   - Calculer les mêmes métriques que le mode individuel

9. **Créer un service de validation partagé**
   ```typescript
   // backend/src/common/services/animal-validation.service.ts
   export class AnimalValidationService {
     static async validateTruie(animalId: string, projetId: string);
     static async validateVerrat(animalId: string, projetId: string);
   }
   ```

10. **Uniformiser la génération d'ID**
    - Utiliser le même format partout: `gestation_${timestamp}_${random}`
    - Ou créer un service `IdGeneratorService`

### Priorité 4: Refactoring long terme

11. **Créer une abstraction commune**
    - Interface `IGestationService` avec méthodes communes
    - Implémentations: `IndividualGestationService` et `BatchGestationService`
    - Factory pattern pour instancier le bon service selon le mode

12. **Unifier les tables (optionnel, breaking change)**
    - Ajouter colonnes `mode` et `batch_id` à `gestations`
    - Migrer `batch_gestations` vers `gestations`
    - **⚠️ Requiert migration majeure**

13. **Créer un controller unifié**
    - `POST /gestations` avec détection automatique du mode
    - Routing interne vers le bon service

---

## 📝 Résumé des problèmes

| Catégorie | Nombre | Priorité |
|-----------|--------|----------|
| Endpoints manquants | 2 | 🔴 Critique |
| Code dupliqué | 3+ | 🟠 Haute |
| Incohérences de nommage | 6+ | 🟠 Haute |
| Logique métier divergente | 4+ | 🟡 Moyenne |
| Code mort | 3+ | 🟡 Moyenne |
| Validation incohérente | 2+ | 🟡 Moyenne |

---

## ✅ Conclusion

Le module de reproduction (gestation) présente des **incohérences majeures** entre les deux modes d'élevage. Les problèmes principaux sont:

1. **Architecture en silos**: Deux systèmes complètement séparés sans abstraction commune
2. **Fonctionnalités manquantes**: DELETE et statistiques absents en mode batch
3. **Code dupliqué**: Logique métier répétée sans factorisation
4. **Incohérences de nommage**: Même concept nommé différemment selon le mode
5. **Validation inégale**: Mode batch moins validé que mode individuel

**Recommandation principale**: Créer une abstraction commune et uniformiser progressivement les deux modes tout en maintenant la compatibilité avec le code existant.
