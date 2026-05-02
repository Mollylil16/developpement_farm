# 🏗️ Spécifications Techniques Backend - Fermier Pro

## 🎯 Standards Professionnels

Cette application backend doit respecter les standards de l'industrie :
- ✅ **Sécurité** : OWASP Top 10, JWT sécurisé, validation stricte
- ✅ **Architecture** : Clean Architecture, SOLID principles
- ✅ **Tests** : Coverage > 80%, Tests unitaires + E2E
- ✅ **Documentation** : Swagger/OpenAPI complet
- ✅ **Performance** : Optimisation requêtes, cache, pagination
- ✅ **Monitoring** : Logging structuré, error tracking
- ✅ **CI/CD** : Pipeline automatisé
- ✅ **Code Quality** : ESLint, Prettier, TypeScript strict

---

## 🔒 SÉCURITÉ (Priorité #1)

### 1.1 Authentification & Autorisation

#### JWT avec Refresh Tokens
- **Access Token** : Expiration courte (15 min - 1h)
- **Refresh Token** : Expiration longue (7 jours), stocké en DB avec blacklist
- **Rotation** : Nouveau refresh token à chaque refresh
- **Revocation** : Blacklist pour logout et compromission

#### Implémentation Requise

```typescript
// Structure JWT Payload
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  roles: string[];
  iat: number;          // Issued at
  exp: number;          // Expiration
  jti: string;          // JWT ID (pour blacklist)
}

// Refresh Token en Base
interface RefreshToken {
  id: string;
  user_id: string;
  token: string;         // Hash du token
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
  last_used_at: Date;
  ip_address?: string;
  user_agent?: string;
}
```

#### Guards & Décorateurs

```typescript
// Guards hiérarchiques
@UseGuards(JwtAuthGuard)           // Vérifie le token
@UseGuards(RolesGuard)             // Vérifie les rôles
@Roles('producer', 'buyer')         // Décorateur de rôles
@Public()                           // Route publique (bypass auth)
```

### 1.2 Validation & Sanitization

- **DTOs** : Validation stricte avec `class-validator`
- **Sanitization** : Nettoyer toutes les entrées (XSS, SQL Injection)
- **Type Safety** : TypeScript strict mode
- **Rate Limiting** : Protection contre brute force

```typescript
// Exemple DTO avec validation
export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  subjectId: string;

  @IsNumber()
  @IsPositive()
  @Min(0.1)
  @Max(1000)
  pricePerKg: number;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsDateString()
  lastWeightDate: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
```

### 1.3 Protection des Routes

- **CORS** : Configuration stricte par environnement
- **Helmet** : Headers de sécurité HTTP
- **Rate Limiting** : Par IP et par utilisateur
- **CSRF Protection** : Pour les formulaires web
- **Input Validation** : Toutes les entrées validées

### 1.4 Gestion des Secrets

- **Variables d'environnement** : Jamais en code
- **Secrets Manager** : Pour production (AWS Secrets Manager, etc.)
- **Rotation** : Plan de rotation des secrets
- **Encryption** : Données sensibles chiffrées en DB

---

## 🏛️ ARCHITECTURE

### 2.1 Structure Modulaire

```
backend/
├── src/
│   ├── common/                      # Code partagé
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── config/                      # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── app.config.ts
│   │   └── swagger.config.ts
│   │
│   ├── database/                    # Base de données
│   │   ├── entities/                # TypeORM entities
│   │   ├── migrations/              # Migrations
│   │   ├── repositories/            # Custom repositories
│   │   └── seeds/                   # Données de test
│   │
│   ├── auth/                        # Authentification
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── dto/
│   │
│   ├── [modules]/                   # Modules métier
│   │   ├── [module].module.ts
│   │   ├── [module].controller.ts
│   │   ├── [module].service.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   └── interfaces/
│   │
│   └── main.ts
│
├── test/                            # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                            # Documentation
│   └── api/
│
└── scripts/                         # Scripts utilitaires
```

### 2.2 Principes SOLID

- **Single Responsibility** : Chaque classe/service une seule responsabilité
- **Open/Closed** : Extensible sans modification
- **Liskov Substitution** : Interfaces cohérentes
- **Interface Segregation** : Interfaces spécifiques
- **Dependency Inversion** : Dépendances via interfaces

### 2.3 Design Patterns

- **Repository Pattern** : Abstraction de l'accès aux données
- **Service Layer** : Logique métier isolée
- **DTO Pattern** : Transfert de données typé
- **Factory Pattern** : Création d'objets complexes
- **Strategy Pattern** : Algorithmes interchangeables

---

## 🗄️ BASE DE DONNÉES

### 3.1 PostgreSQL - Configuration

#### Pool de Connexions Optimisé

```typescript
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                          // Connexions max
  idleTimeoutMillis: 30000,         // Timeout idle
  connectionTimeoutMillis: 2000,    // Timeout connexion
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
};
```

### 3.2 Migrations

- **Versioning** : Chaque migration versionnée
- **Rollback** : Toutes les migrations réversibles
- **Tests** : Migrations testées avant déploiement
- **Documentation** : Chaque migration documentée

```sql
-- Exemple migration versionnée
-- migrations/001_20250108_initial_schema.sql
-- migrations/002_20250109_add_marketplace_tables.sql
```

### 3.3 Index & Performance

- **Index primaires** : Sur toutes les clés primaires
- **Index secondaires** : Sur colonnes fréquemment recherchées
- **Index composites** : Pour requêtes complexes
- **Analyse** : EXPLAIN ANALYZE pour optimiser

```sql
-- Index stratégiques
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_listings_producer_id ON marketplace_listings(producer_id);
CREATE INDEX idx_listings_status_location ON marketplace_listings(status, location_lat, location_lon);
CREATE INDEX idx_transactions_buyer_id ON marketplace_transactions(buyer_id);
```

### 3.4 Transactions & Intégrité

- **ACID** : Toutes les opérations critiques en transactions
- **Contraintes** : Foreign keys, unique constraints, checks
- **Cascade** : Gestion des suppressions en cascade
- **Isolation** : Niveaux d'isolation appropriés

---

## 📝 VALIDATION & GESTION D'ERREURS

### 4.1 Validation Stricte

```typescript
// Global Validation Pipe
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Supprime propriétés non définies
    forbidNonWhitelisted: true,   // Rejette propriétés non définies
    transform: true,              // Transforme en instances de classe
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: false,
    validationError: {
      target: false,              // Ne pas exposer la classe cible
      value: false,               // Ne pas exposer la valeur
    },
  }),
);
```

### 4.2 Gestion d'Erreurs Centralisée

```typescript
// Exception Filter Global
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Logging structuré
    logger.error({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: exception,
    });

    // Réponse standardisée
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
      ...(process.env.NODE_ENV === 'development' && { stack: exception }),
    });
  }
}
```

### 4.3 Codes d'Erreur Standardisés

```typescript
// Codes d'erreur métier
export enum ErrorCode {
  // Auth
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_INVALID = 'AUTH_003',
  UNAUTHORIZED = 'AUTH_004',
  
  // Validation
  VALIDATION_ERROR = 'VAL_001',
  MISSING_REQUIRED_FIELD = 'VAL_002',
  
  // Business Logic
  RESOURCE_NOT_FOUND = 'BIZ_001',
  RESOURCE_ALREADY_EXISTS = 'BIZ_002',
  OPERATION_NOT_ALLOWED = 'BIZ_003',
  
  // System
  INTERNAL_ERROR = 'SYS_001',
  DATABASE_ERROR = 'SYS_002',
}
```

---

## 🧪 TESTS

### 5.1 Coverage Minimum

- **Unit Tests** : > 80% coverage
- **Integration Tests** : Tous les endpoints
- **E2E Tests** : Scénarios critiques
- **Performance Tests** : Charge et stress

### 5.2 Structure des Tests

```typescript
// Structure recommandée
describe('AuthService', () => {
  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Test d'erreur
    });
  });
});
```

### 5.3 Tests E2E

```typescript
// Exemple test E2E
describe('Marketplace (e2e)', () => {
  it('/marketplace/listings (POST) - should create listing', () => {
    return request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createListingDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.pricePerKg).toBe(createListingDto.pricePerKg);
      });
  });
});
```

---

## 📊 MONITORING & LOGGING

### 6.1 Logging Structuré

```typescript
// Winston ou Pino
import { Logger } from '@nestjs/common';

// Logging structuré
logger.log({
  level: 'info',
  message: 'User logged in',
  userId: user.id,
  email: user.email,
  ip: request.ip,
  timestamp: new Date().toISOString(),
  context: 'AuthService',
});
```

### 6.2 Error Tracking

- **Sentry** : Pour production
- **Logs centralisés** : CloudWatch, Datadog, etc.
- **Alertes** : Sur erreurs critiques

### 6.3 Métriques

- **Performance** : Temps de réponse, throughput
- **Business** : Nombre de transactions, utilisateurs actifs
- **Système** : CPU, mémoire, connexions DB

---

## 🚀 PERFORMANCE

### 7.1 Optimisations Requises

- **Pagination** : Toutes les listes paginées (max 100 items/page)
- **Cache** : Redis pour données fréquemment accédées
- **Lazy Loading** : Relations chargées à la demande
- **Query Optimization** : EXPLAIN ANALYZE, index appropriés
- **Compression** : Gzip pour les réponses

### 7.2 Cache Strategy

```typescript
// Cache Redis
@Injectable()
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## 📚 DOCUMENTATION

### 8.1 Swagger/OpenAPI

```typescript
// Configuration Swagger complète
const config = new DocumentBuilder()
  .setTitle('Fermier Pro API')
  .setDescription('API complète pour la gestion de ferme porcine')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentification')
  .addTag('marketplace', 'Marketplace')
  .addTag('production', 'Production')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### 8.2 Documentation Code

- **JSDoc** : Toutes les fonctions publiques
- **README** : Par module
- **CHANGELOG** : Historique des versions
- **API Examples** : Exemples de requêtes/réponses

---

## 🔄 CI/CD

### 9.1 Pipeline GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      - run: npm run test:cov

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        # Déploiement
```

---

## 📦 DÉPENDANCES REQUISES

### 10.1 Core

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.0",
    "pg": "^8.11.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.0.0",
    "winston": "^3.11.0",
    "socket.io": "^4.6.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/passport-jwt": "^3.0.9",
    "@types/passport-local": "^1.0.36",
    "@types/bcrypt": "^5.0.1",
    "@types/pg": "^8.10.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "prettier": "^3.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.16"
  }
}
```

---

## ✅ CHECKLIST QUALITÉ

### Code Quality
- [ ] TypeScript strict mode activé
- [ ] ESLint configuré et respecté
- [ ] Prettier configuré et respecté
- [ ] Pas de `any` non typé
- [ ] Tous les imports organisés

### Sécurité
- [ ] Toutes les routes protégées (sauf publiques)
- [ ] Validation stricte sur toutes les entrées
- [ ] Secrets dans variables d'environnement
- [ ] Rate limiting configuré
- [ ] CORS configuré correctement
- [ ] Helmet activé
- [ ] SQL Injection protégé (paramètres)
- [ ] XSS protégé (sanitization)

### Tests
- [ ] Coverage > 80%
- [ ] Tests unitaires pour tous les services
- [ ] Tests d'intégration pour tous les endpoints
- [ ] Tests E2E pour scénarios critiques
- [ ] Tests de performance

### Documentation
- [ ] Swagger complet et à jour
- [ ] README avec instructions
- [ ] JSDoc sur fonctions publiques
- [ ] CHANGELOG maintenu

### Performance
- [ ] Pagination sur toutes les listes
- [ ] Index sur colonnes recherchées
- [ ] Cache pour données fréquentes
- [ ] Compression activée
- [ ] Requêtes optimisées

### Monitoring
- [ ] Logging structuré
- [ ] Error tracking configuré
- [ ] Métriques collectées
- [ ] Alertes configurées

---

## 🎯 PRIORITÉS D'IMPLÉMENTATION

### Phase 1 : Fondations (Semaine 1)
1. ✅ Configuration complète (env, DB, etc.)
2. ✅ Module Auth avec sécurité renforcée
3. ✅ Validation globale
4. ✅ Gestion d'erreurs centralisée
5. ✅ Logging structuré

### Phase 2 : Modules Core (Semaine 2)
1. ✅ Protection de toutes les routes existantes
2. ✅ Tests pour modules existants
3. ✅ Optimisation des requêtes
4. ✅ Documentation Swagger

### Phase 3 : Nouveaux Modules (Semaine 3-4)
1. ✅ Marketplace (avec tests)
2. ✅ Chat WebSocket (avec tests)
3. ✅ Synchronisation (avec tests)

### Phase 4 : Production Ready (Semaine 5+)
1. ✅ CI/CD Pipeline
2. ✅ Monitoring complet
3. ✅ Performance tuning
4. ✅ Security audit
5. ✅ Documentation finale

---

**Date de création** : 2025-01-08  
**Standards** : OWASP, SOLID, Clean Architecture  
**Version** : 1.0.0

