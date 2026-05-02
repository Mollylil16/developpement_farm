# Analyse du Module Production - Problèmes Identifiés

**Date**: 2026-01-12
**Contexte**: Analyse pour résoudre le problème de Kouakou qui ne peut pas mettre des sujets en vente

## 🚨 Problème Principal Identifié

### L'endpoint `/production/animaux` ne supporte pas la recherche par code

**Code problématique dans `MarketplaceActions.ts` (ligne 142-145)**:
```typescript
const animals = await apiClient.get<any[]>('/production/animaux', {
  params: { code: params.animalCode, projet_id: context.projetId }
});
```

**Comportement actuel du backend** (`production.controller.ts`):
- L'endpoint `GET /production/animaux` accepte seulement:
  - `projet_id` (obligatoire)
  - `inclure_inactifs` (optionnel)
  - `limit` (optionnel)
  - `offset` (optionnel)
- **Le paramètre `code` est complètement ignoré !**
- Résultat: Le backend retourne TOUS les animaux du projet au lieu d'un seul

## 📋 Endpoints Production Disponibles

| Endpoint | Méthode | Paramètres | Usage |
|----------|---------|------------|-------|
| `/production/animaux` | GET | `projet_id`, `inclure_inactifs`, `limit`, `offset` | Liste tous les animaux |
| `/production/animaux/:id` | GET | - | Récupérer un animal par ID |
| `/production/animaux/by-loges` | GET | `projet_id`, `loges` | Animaux par loge(s) |
| `/production/animaux/:id/pesees` | GET | - | Pesées d'un animal |

## ❌ Endpoints Manquants pour Kouakou

1. **`GET /production/animaux/by-code`** - Recherche par code (P123, etc.)
2. **`GET /production/animaux/by-weight-range`** - Recherche par plage de poids

## 🔧 Corrections Requises

### 1. Ajouter le paramètre `code` à l'endpoint existant

**Backend** - `production.controller.ts`:
```typescript
@Get('animaux')
@ApiQuery({ name: 'code', required: false, description: 'Code de l\'animal à rechercher' })
findAllAnimals(
  @Query('projet_id') projetId: string,
  @Query('code') code?: string,  // NOUVEAU
  ...
)
```

**Backend** - `production.service.ts`:
```typescript
async findAllAnimals(projetId, userId, inclureInactifs, limit, offset, code?) {
  let query = `SELECT ... WHERE projet_id = $1`;
  if (code) {
    query += ` AND code ILIKE $X`; // Recherche insensible à la casse
  }
}
```

### 2. Alternative: Créer un endpoint dédié

```typescript
@Get('animaux/search')
@ApiQuery({ name: 'projet_id', required: true })
@ApiQuery({ name: 'code', required: false })
@ApiQuery({ name: 'weight_min', required: false })
@ApiQuery({ name: 'weight_max', required: false })
searchAnimals(...) { }
```

## 🔄 Mode Batch vs Individuel

Le projet supporte deux modes:
- **Suivi individuel**: Chaque animal a un code unique (P001, P002...)
- **Élevage en bande**: Les animaux sont regroupés par loges

### Problèmes de concurrence identifiés:

1. **Table `production_animaux`** - Utilisée pour le mode individuel
2. **Table `batches`** - Utilisée pour le mode batch
3. **Endpoints différents**:
   - Individuel: `/production/animaux`
   - Batch: `/batch-pigs/projet/:projetId`

### Impact sur Kouakou:

Kouakou doit vérifier le mode du projet avant de chercher les animaux:
- Si mode **individuel** → `/production/animaux`
- Si mode **batch** → `/batch-pigs/projet/:projetId`

## 📝 Plan d'Action

1. ✅ **Identifier le problème** - L'endpoint ne filtre pas par code
2. ⏳ **Modifier le backend** - Ajouter le support du paramètre `code`
3. ⏳ **Modifier Kouakou** - Gérer les deux modes (individuel/batch)
4. ⏳ **Tester** - Vérifier que la mise en vente fonctionne

## 🔍 Logs de Débogage

Quand Kouakou dit "Je n'ai pas trouvé l'animal", c'est parce que:
1. L'API retourne TOUS les animaux (sans filtrer par code)
2. Le frontend reçoit un tableau qui n'est pas vide
3. Mais `animals[0]` n'est pas l'animal recherché
4. L'ID récupéré est incorrect ou le code ne correspond pas

## Fichiers à Modifier

### Backend
- `backend/src/production/production.controller.ts`
- `backend/src/production/production.service.ts`

### Frontend
- `src/services/chatAgent/actions/marketplace/MarketplaceActions.ts`
