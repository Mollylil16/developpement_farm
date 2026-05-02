# 📚 Exemple d'Utilisation du Système de Permissions

## 🎯 Vue d'ensemble

Le système de permissions permet de protéger les endpoints en vérifiant que l'utilisateur a les permissions nécessaires en tant que collaborateur sur un projet.

## 📋 Permissions Disponibles

- `reproduction` : Accès au module de reproduction
- `nutrition` : Accès au module de nutrition
- `finance` : Accès au module de finance
- `rapports` : Accès aux rapports
- `planification` : Accès à la planification
- `mortalites` : Accès au module de mortalités
- `sante` : Accès au module de santé

## 🔧 Utilisation de Base

### 1. Importer les Dépendances

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
```

### 2. Protéger un Endpoint

```typescript
@Post(':projetId/transactions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('finance')
@ApiOperation({ summary: 'Créer une transaction financière' })
async createTransaction(
  @Param('projetId') projetId: string,
  @Body() createTransactionDto: CreateTransactionDto,
  @CurrentUser('id') userId: string
) {
  return this.financeService.createTransaction(createTransactionDto, userId);
}
```

## 📝 Exemples Complets

### Exemple 1 : Controller Finance

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Endpoint protégé par permission 'finance'
  @Post(':projetId/revenus')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance')
  @ApiOperation({ summary: 'Créer un revenu' })
  async createRevenu(
    @Param('projetId') projetId: string,
    @Body() createRevenuDto: CreateRevenuDto,
    @CurrentUser('id') userId: string
  ) {
    return this.financeService.createRevenu(createRevenuDto, userId);
  }

  // Endpoint protégé par permission 'finance'
  @Get(':projetId/revenus')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance')
  @ApiOperation({ summary: 'Récupérer tous les revenus' })
  async findAllRevenus(
    @Param('projetId') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.financeService.findAllRevenus(projetId, userId);
  }
}
```

### Exemple 2 : Controller Reproduction

```typescript
@Post(':projetId/gestations')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('reproduction')
@ApiOperation({ summary: 'Créer une gestation' })
async createGestation(
  @Param('projetId') projetId: string,
  @Body() createGestationDto: CreateGestationDto,
  @CurrentUser('id') userId: string
) {
  return this.reproductionService.createGestation(createGestationDto, userId);
}
```

### Exemple 3 : Controller Santé

```typescript
@Post(':projetId/vaccinations')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('sante')
@ApiOperation({ summary: 'Créer une vaccination' })
async createVaccination(
  @Param('projetId') projetId: string,
  @Body() createVaccinationDto: CreateVaccinationDto,
  @CurrentUser('id') userId: string
) {
  return this.santeService.createVaccination(createVaccinationDto, userId);
}
```

## 🔍 Récupération du projetId

Le guard cherche automatiquement le `projetId` dans :
1. `request.params.projetId` ou `request.params.id`
2. `request.query.projet_id` ou `request.query.projetId`
3. `request.body.projet_id` ou `request.body.projetId`

### Exemple avec Query Parameter

```typescript
@Get('revenus')
@UseGuards(PermissionGuard)
@RequirePermission('finance')
@ApiQuery({ name: 'projet_id', required: true })
async findAllRevenus(
  @Query('projet_id') projetId: string,
  @CurrentUser('id') userId: string
) {
  // Le guard récupère automatiquement projetId depuis query.projet_id
  return this.financeService.findAllRevenus(projetId, userId);
}
```

## ⚠️ Comportement Spécial

### Propriétaires

Les **propriétaires** du projet ont **automatiquement toutes les permissions**. Ils n'ont pas besoin d'être collaborateurs.

### Collaborateurs Actifs

Seuls les collaborateurs avec le statut `'actif'` peuvent accéder aux endpoints protégés.

## 🚫 Gestion des Erreurs

### Erreur 403 (Forbidden)

Si l'utilisateur n'a pas la permission :

```json
{
  "statusCode": 403,
  "message": "Vous n'avez pas accès à cette fonctionnalité. Permission requise: finance (rôle: observateur)",
  "error": "Forbidden"
}
```

### Erreur 400 (Bad Request)

Si le `projetId` est manquant :

```json
{
  "statusCode": 400,
  "message": "ID du projet manquant. Le projetId doit être fourni dans les paramètres, query ou body.",
  "error": "Bad Request"
}
```

## 🔐 Utilisation Programmatique

Vous pouvez aussi utiliser le service directement dans votre code :

```typescript
import { PermissionsService } from '../common/services/permissions.service';

@Injectable()
export class MonService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async maMethode(userId: string, projetId: string) {
    // Vérifier une permission
    const hasPermission = await this.permissionsService.checkCollaborateurPermission(
      userId,
      projetId,
      'finance'
    );

    if (!hasPermission) {
      throw new ForbiddenException('Permission refusée');
    }

    // Ou utiliser enforcePermission qui lance l'exception automatiquement
    await this.permissionsService.enforcePermission(userId, projetId, 'finance');

    // Récupérer le rôle
    const role = await this.permissionsService.getCollaborateurRole(userId, projetId);
    console.log(`Rôle: ${role}`); // 'proprietaire', 'gestionnaire', etc.
  }
}
```

## 📊 Mapping Permissions ↔ Modules

| Permission | Modules Protégés |
|------------|------------------|
| `finance` | Finance (revenus, dépenses, dettes, etc.) |
| `reproduction` | Reproduction (gestations, sevrages, etc.) |
| `nutrition` | Nutrition (rations, stocks, etc.) |
| `sante` | Santé (vaccinations, visites vétérinaires, etc.) |
| `mortalites` | Mortalités |
| `planification` | Planifications |
| `rapports` | Rapports et statistiques |

## ✅ Checklist d'Implémentation

- [ ] Importer `PermissionGuard` et `RequirePermission`
- [ ] Ajouter `@UseGuards(PermissionGuard)` sur l'endpoint
- [ ] Ajouter `@RequirePermission('nom_permission')` sur l'endpoint
- [ ] S'assurer que `projetId` est accessible (param, query, ou body)
- [ ] Tester avec un utilisateur sans permission (doit retourner 403)
- [ ] Tester avec un collaborateur avec permission (doit fonctionner)
- [ ] Tester avec le propriétaire (doit fonctionner)

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
