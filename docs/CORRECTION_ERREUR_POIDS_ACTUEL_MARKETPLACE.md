# Correction de l'erreur `column "poids_actuel" does not exist`

## Problème identifié

L'erreur `column "poids_actuel" does not exist` se produisait lors de la création d'un listing individuel sur le marketplace. L'erreur provenait de la requête SQL qui tentait de sélectionner une colonne `poids_actuel` qui n'existe pas dans la table `production_animaux`.

## Analyse

**Fichiers concernés :**
- `backend/src/marketplace/marketplace-unified.service.ts` (ligne 89)
- `backend/src/marketplace/marketplace.service.ts` (ligne 46)

**Problème :**
Les requêtes SQL sélectionnaient `poids_actuel` depuis `production_animaux`, mais cette colonne n'existe pas dans la base de données. Le poids est fourni directement dans le DTO (`CreateListingDto.weight`), donc cette colonne n'est pas nécessaire pour la vérification de l'animal.

## Solution appliquée

### 1. Correction dans `marketplace-unified.service.ts`

**Avant :**
```typescript
const animal = await this.databaseService.query(
  'SELECT id, poids_actuel FROM production_animaux WHERE id = $1 AND projet_id = $2 AND statut = $3',
  [dto.subjectId, dto.farmId, 'actif']
);
```

**Après :**
```typescript
const animal = await this.databaseService.query(
  'SELECT id FROM production_animaux WHERE id = $1 AND projet_id = $2 AND statut = $3',
  [dto.subjectId, dto.farmId, 'actif']
);
```

### 2. Correction dans `marketplace.service.ts`

**Avant :**
```typescript
const animal = await this.databaseService.query(
  'SELECT id, poids_actuel FROM production_animaux WHERE id = $1 AND projet_id = $2',
  [createListingDto.subjectId, createListingDto.farmId]
);
```

**Après :**
```typescript
const animal = await this.databaseService.query(
  'SELECT id FROM production_animaux WHERE id = $1 AND projet_id = $2',
  [createListingDto.subjectId, createListingDto.farmId]
);
```

## Impact

- **Avant** : L'erreur `column "poids_actuel" does not exist` empêchait la création de listings individuels
- **Après** : La création de listings individuels fonctionne correctement, le poids étant fourni via le DTO

## Fichiers modifiés

- `backend/src/marketplace/marketplace-unified.service.ts` (ligne 89)
- `backend/src/marketplace/marketplace.service.ts` (ligne 46)

## Notes

- Le poids de l'animal est fourni directement dans le DTO (`CreateListingDto.weight`), donc il n'est pas nécessaire de le récupérer depuis la base de données
- La requête vérifie uniquement que l'animal existe, appartient au projet, et est actif
- Si besoin du poids actuel de l'animal, il faudrait le récupérer depuis la table `production_pesees` (dernière pesée) plutôt que depuis `production_animaux`

