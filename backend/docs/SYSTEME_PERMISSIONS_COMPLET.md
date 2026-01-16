# 🔐 Système de Permissions Complet - Documentation

## 📋 Vue d'ensemble

Le système de permissions permet de protéger les endpoints en vérifiant que l'utilisateur a les permissions nécessaires en tant que collaborateur sur un projet.

## 🏗️ Architecture

### Fichiers Créés

1. **Service** : `src/common/services/permissions.service.ts`
2. **Décorateur** : `src/common/decorators/require-permission.decorator.ts`
3. **Guard** : `src/common/guards/permission.guard.ts`
4. **Module** : `src/common/common.module.ts` (modifié)

---

## 📄 Code Complet

### 1. PermissionsService

**Fichier** : `backend/src/common/services/permissions.service.ts`

```typescript
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CollaborationsService } from '../../collaborations/collaborations.service';

export type PermissionKey =
  | 'reproduction'
  | 'nutrition'
  | 'finance'
  | 'rapports'
  | 'planification'
  | 'mortalites'
  | 'sante';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly collaborationsService: CollaborationsService
  ) {}

  async checkCollaborateurPermission(
    userId: string,
    projetId: string,
    permissionKey: PermissionKey
  ): Promise<boolean> {
    // Vérifie si l'utilisateur est propriétaire (toutes permissions)
    // Sinon vérifie les permissions du collaborateur actif
  }

  async getCollaborateurRole(userId: string, projetId: string): Promise<string | null> {
    // Retourne le rôle du collaborateur ou 'proprietaire' si propriétaire
  }

  async enforcePermission(
    userId: string,
    projetId: string,
    permissionKey: PermissionKey
  ): Promise<void> {
    // Vérifie la permission et lance ForbiddenException si refusée
  }

  async hasProjectAccess(userId: string, projetId: string): Promise<boolean> {
    // Vérifie si l'utilisateur a accès au projet (propriétaire ou collaborateur actif)
  }
}
```

### 2. Décorateur @RequirePermission

**Fichier** : `backend/src/common/decorators/require-permission.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../services/permissions.service';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
```

### 3. PermissionGuard

**Fichier** : `backend/src/common/guards/permission.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService, PermissionKey } from '../services/permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Récupère la permission requise depuis le décorateur
    // Récupère userId depuis request.user
    // Récupère projetId depuis params/query/body
    // Appelle enforcePermission()
  }
}
```

### 4. CommonModule (Modifié)

**Fichier** : `backend/src/common/common.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { CacheService } from './services/cache.service';
import { ImageService } from './services/image.service';
import { PermissionsService } from './services/permissions.service';
import { PermissionGuard } from './guards/permission.guard';
import { CollaborationsModule } from '../collaborations/collaborations.module';

@Global()
@Module({
  imports: [CollaborationsModule],
  providers: [
    EmailService,
    CacheService,
    ImageService,
    PermissionsService,
    PermissionGuard,
  ],
  exports: [
    EmailService,
    CacheService,
    ImageService,
    PermissionsService,
    PermissionGuard,
  ],
})
export class CommonModule {}
```

---

## 🎯 Utilisation

### Exemple Basique

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Post(':projetId/transactions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('finance')
async createTransaction(
  @Param('projetId') projetId: string,
  @Body() createDto: CreateTransactionDto,
  @CurrentUser('id') userId: string
) {
  return this.service.createTransaction(createDto, userId);
}
```

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
  return this.service.findAllRevenus(projetId, userId);
}
```

### Exemple avec Body

```typescript
@Post('revenus')
@UseGuards(PermissionGuard)
@RequirePermission('finance')
async createRevenu(
  @Body() createRevenuDto: CreateRevenuDto, // Contient projet_id
  @CurrentUser('id') userId: string
) {
  return this.service.createRevenu(createRevenuDto, userId);
}
```

---

## 🔍 Fonctionnement

### 1. Flux d'Exécution

```
Requête HTTP
    ↓
JwtAuthGuard (vérifie l'authentification)
    ↓
PermissionGuard (vérifie les permissions)
    ↓
    ├─ Récupère la permission requise depuis @RequirePermission()
    ├─ Récupère userId depuis request.user
    ├─ Récupère projetId depuis params/query/body
    └─ Appelle PermissionsService.enforcePermission()
        ↓
    PermissionsService
        ├─ Vérifie si propriétaire → ✅ Toutes permissions
        ├─ Sinon récupère le collaborateur actif
        ├─ Vérifie le statut 'actif'
        └─ Vérifie la permission spécifique
            ↓
    ✅ Permission accordée → Endpoint exécuté
    ❌ Permission refusée → ForbiddenException (403)
```

### 2. Récupération du projetId

Le guard cherche automatiquement dans cet ordre :
1. `request.params.projetId` ou `request.params.id`
2. `request.query.projet_id` ou `request.query.projetId`
3. `request.body.projet_id` ou `request.body.projetId`

### 3. Comportement Spécial

- **Propriétaires** : Ont automatiquement toutes les permissions
- **Collaborateurs actifs** : Permissions selon leur rôle
- **Collaborateurs inactifs/en_attente** : Aucune permission

---

## 📊 Permissions par Rôle

| Rôle | reproduction | nutrition | finance | rapports | planification | mortalites | sante |
|------|--------------|-----------|---------|----------|---------------|------------|-------|
| **proprietaire** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **gestionnaire** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **veterinaire** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **ouvrier** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **observateur** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## ⚠️ Gestion des Erreurs

### Erreur 403 (Forbidden)

```json
{
  "statusCode": 403,
  "message": "Vous n'avez pas accès à cette fonctionnalité. Permission requise: finance (rôle: observateur)",
  "error": "Forbidden"
}
```

### Erreur 400 (Bad Request)

```json
{
  "statusCode": 400,
  "message": "ID du projet manquant. Le projetId doit être fourni dans les paramètres, query ou body.",
  "error": "Bad Request"
}
```

---

## 🧪 Tests

### Test Manuel

1. **Créer un collaborateur** avec permission `finance: false`
2. **Tenter d'accéder** à un endpoint protégé
3. **Vérifier** que l'erreur 403 est retournée

### Test avec Propriétaire

1. **Utiliser le propriétaire** du projet
2. **Accéder** à n'importe quel endpoint protégé
3. **Vérifier** que l'accès est accordé (toutes permissions)

---

## 📝 Checklist d'Implémentation

Pour protéger un endpoint :

- [ ] Importer `PermissionGuard` et `RequirePermission`
- [ ] Ajouter `@UseGuards(PermissionGuard)` (après `JwtAuthGuard`)
- [ ] Ajouter `@RequirePermission('nom_permission')`
- [ ] S'assurer que `projetId` est accessible (param, query, ou body)
- [ ] Tester avec un utilisateur sans permission
- [ ] Tester avec un collaborateur avec permission
- [ ] Tester avec le propriétaire

---

## 🚀 Prochaines Étapes

1. **Protéger tous les endpoints** des modules sensibles :
   - Finance
   - Reproduction
   - Nutrition
   - Santé
   - Mortalités
   - Planifications

2. **Ajouter des tests unitaires** pour le système de permissions

3. **Documenter** les permissions requises pour chaque endpoint dans Swagger

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
