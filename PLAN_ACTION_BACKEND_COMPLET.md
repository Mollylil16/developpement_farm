# 🚀 Plan d'Action Backend Complet - Fermier Pro

## 🎯 Objectif

Créer un backend NestJS complet, connecté au frontend React Native et à PostgreSQL, avec toutes les fonctionnalités nécessaires.

---

## 📋 Vue d'Ensemble du Plan

### Phase 1 : Infrastructure & Base de Données (Semaine 1)

### Phase 2 : Authentification & Sécurité (Semaine 1-2)

### Phase 3 : Modules Core - Synchronisation (Semaine 2-3)

### Phase 4 : Marketplace (Semaine 3-4)

### Phase 5 : Chat Temps Réel (Semaine 4-5)

### Phase 6 : Fonctionnalités Avancées (Semaine 5-6)

### Phase 7 : Tests & Optimisation (Semaine 6+)

---

## 🔧 PHASE 1 : Infrastructure & Base de Données

### 1.1 Vérifier/Configurer PostgreSQL

```bash
# Vérifier que PostgreSQL est installé et accessible
psql --version

# Créer la base de données si nécessaire
createdb farmtrack_db

# Ou via SQL
psql -U postgres
CREATE DATABASE farmtrack_db;
CREATE USER farmtrack_user WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE farmtrack_db TO farmtrack_user;
```

### 1.2 Variables d'Environnement

⚠️ **Le fichier `.env` existe déjà dans `backend/`** - Vérifier et compléter avec les variables manquantes.

**Variables déjà configurées** (d'après le code) :

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`

**Variables à ajouter** :

```env
# JWT (CRITIQUE - à ajouter)
JWT_SECRET=votre_secret_jwt_super_securise
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=votre_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Server (à ajouter)
PORT=3000
NODE_ENV=development

# CORS (à ajouter)
CORS_ORIGIN=http://localhost:19006,http://localhost:3001

# File Upload (optionnel pour l'instant)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# OpenAI (pour l'agent conversationnel - optionnel)
OPENAI_API_KEY=

# FCM (pour notifications push - optionnel)
FCM_SERVER_KEY=
```

**Voir** : `backend/CONFIGURATION_ENV.md` pour le template complet

### 1.3 Migration des Schémas SQLite → PostgreSQL

**Action** : Créer un script de migration

```typescript
// backend/scripts/migrate-sqlite-to-postgres.ts
// Convertir les schémas SQLite en PostgreSQL
// - INTEGER PRIMARY KEY → SERIAL PRIMARY KEY
// - TEXT → VARCHAR ou TEXT
// - REAL → DECIMAL ou NUMERIC
// - BLOB → BYTEA
// - Ajouter les contraintes FOREIGN KEY
// - Créer les index
```

**Fichiers à créer** :

- `backend/database/migrations/001_initial_schema.sql`
- `backend/database/migrations/002_add_indexes.sql`
- `backend/database/migrations/003_add_constraints.sql`

### 1.4 Structure du Projet Backend

```
backend/
├── src/
│   ├── main.ts                    # Point d'entrée
│   ├── app.module.ts              # Module racine
│   │
│   ├── auth/                      # ⚠️ À CRÉER
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── register.dto.ts
│   │       └── refresh-token.dto.ts
│   │
│   ├── database/                   # ✅ EXISTE
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   │
│   ├── users/                      # ✅ EXISTE (à vérifier)
│   ├── projets/                    # ✅ EXISTE
│   ├── production/                 # ✅ EXISTE
│   ├── finance/                    # ✅ EXISTE
│   ├── sante/                      # ✅ EXISTE
│   ├── nutrition/                  # ✅ EXISTE
│   ├── reproduction/               # ✅ EXISTE
│   ├── collaborations/             # ✅ EXISTE
│   ├── planifications/             # ✅ EXISTE
│   ├── mortalites/                 # ✅ EXISTE
│   │
│   ├── marketplace/                # ⚠️ À CRÉER
│   │   ├── marketplace.module.ts
│   │   ├── listings/
│   │   │   ├── listings.controller.ts
│   │   │   ├── listings.service.ts
│   │   │   └── dto/
│   │   ├── offers/
│   │   ├── transactions/
│   │   ├── purchase-requests/
│   │   └── notifications/
│   │
│   ├── chat/                       # ⚠️ À CRÉER
│   │   ├── chat.module.ts
│   │   ├── chat.gateway.ts         # WebSocket
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── dto/
│   │
│   ├── sync/                       # ⚠️ À CRÉER
│   │   ├── sync.module.ts
│   │   ├── sync.controller.ts
│   │   └── sync.service.ts
│   │
│   ├── notifications/              # ⚠️ À CRÉER
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   └── notifications.service.ts
│   │
│   ├── common/                     # ⚠️ À CRÉER
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   └── decorators/
│   │
│   └── config/                      # ⚠️ À CRÉER
│       ├── database.config.ts
│       ├── jwt.config.ts
│       └── app.config.ts
│
├── database/
│   ├── migrations/                  # Scripts de migration
│   └── seeds/                      # Données de test
│
├── test/                           # Tests
│
├── .env                            # Variables d'environnement
├── .env.example                    # Exemple
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 🔐 PHASE 2 : Authentification & Sécurité

### 2.1 Installer les Dépendances

```bash
cd backend
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install bcrypt class-validator class-transformer
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
```

### 2.2 Créer le Module Auth

**Fichier** : `backend/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { JwtConfig } from '../config/jwt.config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: JwtConfig.secret,
      signOptions: { expiresIn: JwtConfig.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Fichier** : `backend/src/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = { email: user.email, sub: user.id, roles: user.roles };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        roles: user.roles,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password_hash: hashedPassword,
    });

    const payload = { email: user.email, sub: user.id, roles: user.roles };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        roles: user.roles,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findOne(payload.sub);

      const newPayload = { email: user.email, sub: user.id, roles: user.roles };

      return {
        access_token: this.jwtService.sign(newPayload),
      };
    } catch (error) {
      throw new UnauthorizedException('Token invalide');
    }
  }
}
```

**Fichier** : `backend/src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

### 2.3 Créer les Guards

**Fichier** : `backend/src/auth/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Fichier** : `backend/src/auth/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 2.4 Créer les Stratégies

**Fichier** : `backend/src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtConfig } from '../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JwtConfig.secret,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, roles: user.roles };
  }
}
```

### 2.5 Protéger les Routes Existantes

Ajouter `@UseGuards(JwtAuthGuard)` sur tous les controllers existants.

---

## 🔄 PHASE 3 : Synchronisation & Base de Données

### 3.1 Créer le Module Sync

**Fichier** : `backend/src/sync/sync.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
```

**Fichier** : `backend/src/sync/sync.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SyncService {
  constructor(private db: DatabaseService) {}

  async pushChanges(userId: string, changes: any[]) {
    // Enregistrer les modifications dans la base
    // Gérer les conflits
    // Retourner les résultats
  }

  async pullChanges(userId: string, lastSyncTimestamp: string) {
    // Récupérer les modifications depuis la dernière sync
    // Retourner les changements
  }

  async resolveConflict(conflictId: string, resolution: any) {
    // Résoudre un conflit
  }
}
```

### 3.2 Migration des Données SQLite → PostgreSQL

Créer un script de migration :

```typescript
// backend/scripts/migrate-data.ts
// 1. Lire les données SQLite
// 2. Convertir les formats
// 3. Insérer dans PostgreSQL
// 4. Vérifier l'intégrité
```

---

## 🏪 PHASE 4 : Marketplace

### 4.1 Créer le Module Marketplace

**Structure** :

```
marketplace/
├── marketplace.module.ts
├── listings/
│   ├── listings.controller.ts
│   ├── listings.service.ts
│   └── dto/
├── offers/
├── transactions/
├── purchase-requests/
└── notifications/
```

### 4.2 Implémenter les Endpoints

**Listings** :

- `GET /marketplace/listings` - Rechercher
- `POST /marketplace/listings` - Créer
- `GET /marketplace/listings/:id` - Détails
- `PUT /marketplace/listings/:id` - Modifier
- `DELETE /marketplace/listings/:id` - Supprimer

**Offers** :

- `POST /marketplace/offers` - Créer
- `GET /marketplace/offers/received` - Reçues
- `GET /marketplace/offers/sent` - Envoyées
- `PUT /marketplace/offers/:id/accept` - Accepter
- `PUT /marketplace/offers/:id/reject` - Rejeter

**Transactions** :

- `GET /marketplace/transactions` - Liste
- `POST /marketplace/transactions/:id/confirm-delivery` - Confirmer

**Purchase Requests** :

- `POST /marketplace/purchase-requests` - Créer
- `GET /marketplace/purchase-requests` - Liste
- `POST /marketplace/purchase-requests/:id/match` - Trouver matchs

---

## 💬 PHASE 5 : Chat Temps Réel

### 5.1 Installer Socket.io

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 5.2 Créer le Gateway

**Fichier** : `backend/src/chat/chat.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    // Authentifier le client
    // Rejoindre les conversations
  }

  async handleDisconnect(client: Socket) {
    // Nettoyer les connexions
  }

  @SubscribeMessage('message:send')
  async handleMessage(client: Socket, payload: any) {
    // Enregistrer le message
    // Émettre aux autres participants
    this.server.to(payload.conversationId).emit('message:new', payload);
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(client: Socket, payload: any) {
    this.server.to(payload.conversationId).emit('typing:start', {
      userId: payload.userId,
    });
  }
}
```

---

## 📱 PHASE 6 : Fonctionnalités Avancées

### 6.1 Notifications Push

- Installer FCM
- Créer le module notifications
- Enregistrer les tokens
- Envoyer les notifications

### 6.2 Prix Régional

- Créer le module prices
- Endpoint pour récupérer le prix
- Cache avec Redis (optionnel)

### 6.3 Services Vétérinaires

- Créer le module veterinarians
- Recherche par géolocalisation
- Propositions de services

---

## 🔗 PHASE 7 : Connexion Frontend ↔ Backend

### 7.1 Configuration API Frontend

**Fichier** : `fermier-pro/src/config/api.config.ts`

```typescript
export const API_CONFIG = {
  baseURL: __DEV__ ? 'http://localhost:3000/api' : 'https://api.fermier-pro.com/api',
  timeout: 10000,
};
```

### 7.2 Service API Client

**Fichier** : `fermier-pro/src/services/api/apiClient.ts`

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré, essayer de refresh
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        // Appeler /auth/refresh
        // Mettre à jour le token
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 7.3 Adapter les Redux Thunks

**Exemple** : `fermier-pro/src/store/slices/productionSlice.ts`

```typescript
// AVANT (SQLite local)
export const loadProductionAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async ({ projetId }: { projetId: string }, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const animalRepo = new AnimalRepository(db);
      return await animalRepo.findByProjet(projetId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// APRÈS (API Backend)
export const loadProductionAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async ({ projetId }: { projetId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/animaux', {
        params: { projet_id: projetId },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
```

---

## 📊 Checklist Complète

### Infrastructure

- [ ] PostgreSQL installé et configuré
- [ ] Variables d'environnement configurées
- [ ] Schémas migrés SQLite → PostgreSQL
- [ ] Structure du projet créée

### Authentification

- [ ] Module auth créé
- [ ] JWT configuré
- [ ] Guards implémentés
- [ ] Routes protégées
- [ ] Tests d'authentification

### Base de Données

- [ ] Migrations créées
- [ ] Seeds pour données de test
- [ ] Index créés
- [ ] Contraintes ajoutées

### Modules Core

- [ ] Module sync créé
- [ ] Endpoints sync implémentés
- [ ] Résolution de conflits

### Marketplace

- [ ] Module marketplace créé
- [ ] Listings implémentés
- [ ] Offers implémentés
- [ ] Transactions implémentés
- [ ] Purchase requests implémentés

### Chat

- [ ] Socket.io installé
- [ ] Gateway créé
- [ ] Événements implémentés
- [ ] Tests WebSocket

### Frontend

- [ ] API client configuré
- [ ] Redux thunks adaptés
- [ ] Gestion des tokens
- [ ] Gestion des erreurs
- [ ] Tests de connexion

### Tests & Documentation

- [ ] Tests unitaires
- [ ] Tests E2E
- [ ] Swagger configuré
- [ ] Documentation API

---

## 🚀 Commandes de Démarrage

### Backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer la base de données
createdb farmtrack_db

# Lancer les migrations
npm run migration:run

# Démarrer en développement
npm run start:dev

# Démarrer en production
npm run build
npm run start:prod
```

### Frontend

```bash
cd fermier-pro

# Installer les dépendances
npm install

# Démarrer Expo
npm start
```

---

## 📝 Notes Importantes

1. **Migration Progressive** : Ne pas tout migrer d'un coup. Commencer par l'auth, puis un module à la fois.

2. **Compatibilité** : Garder le mode SQLite local pendant la transition. Utiliser des feature flags.

3. **Tests** : Tester chaque endpoint avant de l'activer en production.

4. **Sécurité** :
   - Ne jamais commiter les secrets
   - Utiliser des variables d'environnement
   - Valider toutes les entrées
   - Protéger toutes les routes

5. **Performance** :
   - Ajouter des index sur les colonnes fréquemment utilisées
   - Utiliser la pagination
   - Mettre en cache quand nécessaire

---

## 🎯 Priorités d'Implémentation

1. **CRITIQUE** : Auth (bloquant pour tout le reste)
2. **HAUTE** : Marketplace (valeur métier)
3. **HAUTE** : Chat (valeur métier)
4. **MOYENNE** : Sync (multi-appareils)
5. **MOYENNE** : Notifications
6. **BASSE** : Prix régional, Vétérinaires

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08
