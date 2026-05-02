# 🔒 Protection des Routes - Guide

## ✅ Protection Globale Activée

Toutes les routes sont **automatiquement protégées** par le guard global JWT, sauf celles marquées avec `@Public()`.

## 📋 Routes Publiques (Déjà Configurées)

Les routes suivantes sont publiques (pas besoin d'authentification) :

- `GET /` - Informations API
- `GET /health` - Health check
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Rafraîchir token
- `POST /users` - Création utilisateur (via register)

## 🔐 Routes Protégées (Par Défaut)

Toutes les autres routes nécessitent un token JWT dans le header :

```
Authorization: Bearer <access_token>
```

### Exemples de Routes Protégées

- `GET /users` - Liste des utilisateurs
- `GET /users/:id` - Détails d'un utilisateur
- `GET /projets` - Liste des projets
- `POST /projets` - Créer un projet
- `GET /animaux` - Liste des animaux
- `POST /animaux` - Créer un animal
- ... (toutes les autres routes)

## 🛠️ Comment Rendre une Route Publique

Si vous avez besoin de rendre une route publique, utilisez le décorateur `@Public()` :

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller('example')
export class ExampleController {
  @Public()
  @Get('public')
  publicRoute() {
    return { message: 'Cette route est publique' };
  }

  @Get('protected')
  protectedRoute() {
    return { message: 'Cette route nécessite un token' };
  }
}
```

## 🎯 Utiliser les Rôles

Pour restreindre l'accès par rôle, utilisez `@Roles()` :

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Roles('admin')
  @Get('dashboard')
  adminDashboard() {
    return { message: 'Accès admin uniquement' };
  }
}
```

## 📝 Récupérer l'Utilisateur Connecté

Utilisez le décorateur `@CurrentUser()` :

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get('me')
getMyData(@CurrentUser() user: any) {
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
  };
}
```

## ✅ Vérification

Pour tester qu'une route est protégée :

```bash
# Sans token (doit échouer avec 401)
curl http://localhost:3000/projets

# Avec token (doit fonctionner)
curl -H "Authorization: Bearer <token>" http://localhost:3000/projets
```

