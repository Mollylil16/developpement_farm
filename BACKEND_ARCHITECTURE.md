# 🏢 Architecture Backend Professionnelle - Fermier Pro

## 📋 Vue d'ensemble

Architecture backend enterprise-grade pour Fermier Pro, conçue pour la production avec scalabilité, sécurité, et maintenabilité.

---

## 🎯 Principes Architecturaux

1. **Clean Architecture** : Séparation claire des responsabilités
2. **Domain-Driven Design (DDD)** : Modélisation métier centrée
3. **SOLID Principles** : Code maintenable et extensible
4. **Security First** : Sécurité intégrée à tous les niveaux
5. **Observability** : Monitoring, logging, tracing complets
6. **Testability** : Tests unitaires, intégration, E2E
7. **Scalability** : Architecture horizontale scalable

---

## 🛠️ Stack Technologique Enterprise

### Core Backend

- **Runtime** : Node.js 20 LTS
- **Framework** : NestJS (TypeScript) - Framework enterprise-grade
- **Language** : TypeScript 5.3+ (strict mode)
- **Database** : PostgreSQL 15+ (production) + Redis (cache)
- **ORM** : Prisma 5+ (type-safe, migrations)
- **Validation** : class-validator + class-transformer
- **API Documentation** : Swagger/OpenAPI 3.0

### Infrastructure & DevOps

- **Containerization** : Docker + Docker Compose
- **Orchestration** : Kubernetes (production)
- **CI/CD** : GitHub Actions / GitLab CI
- **Monitoring** : Prometheus + Grafana
- **Logging** : ELK Stack (Elasticsearch, Logstash, Kibana) ou Loki
- **Error Tracking** : Sentry
- **APM** : New Relic ou Datadog
- **Message Queue** : RabbitMQ ou AWS SQS
- **File Storage** : AWS S3 / Google Cloud Storage

### Sécurité

- **Authentication** : JWT + Refresh Tokens
- **Authorization** : RBAC (Role-Based Access Control) + ABAC
- **Encryption** : bcrypt (passwords), AES-256 (sensitive data)
- **Rate Limiting** : Redis-based rate limiter
- **CORS** : Configuré strictement
- **Helmet** : Headers de sécurité
- **Input Validation** : Validation stricte de tous les inputs
- **SQL Injection Prevention** : Prisma (parametrized queries)
- **XSS Protection** : Sanitization automatique

### Testing

- **Unit Tests** : Jest
- **Integration Tests** : Supertest
- **E2E Tests** : Playwright ou Cypress
- **Coverage** : Istanbul/NYC (minimum 80%)
- **Contract Testing** : Pact (API contracts)

---

## 📁 Structure du Projet (Clean Architecture)

```
fermier-pro-backend/
├── src/
│   ├── domain/                    # Couche Domain (Business Logic)
│   │   ├── entities/              # Entités métier
│   │   │   ├── user.entity.ts
│   │   │   ├── projet.entity.ts
│   │   │   ├── gestation.entity.ts
│   │   │   └── ...
│   │   ├── value-objects/         # Value Objects (DDD)
│   │   │   ├── email.vo.ts
│   │   │   ├── money.vo.ts
│   │   │   └── ...
│   │   ├── repositories/          # Interfaces de repositories
│   │   │   ├── user.repository.interface.ts
│   │   │   └── ...
│   │   └── services/              # Domain Services
│   │       ├── gestation-calculation.service.ts
│   │       └── ...
│   │
│   ├── application/               # Couche Application (Use Cases)
│   │   ├── use-cases/             # Cas d'usage métier
│   │   │   ├── auth/
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   ├── login-user.use-case.ts
│   │   │   │   └── refresh-token.use-case.ts
│   │   │   ├── projet/
│   │   │   │   ├── create-projet.use-case.ts
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── dto/                   # Data Transfer Objects
│   │   │   ├── auth/
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   └── ...
│   │   └── interfaces/            # Interfaces application
│   │
│   ├── infrastructure/             # Couche Infrastructure
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   └── schema.prisma
│   │   │   ├── repositories/      # Implémentation repositories
│   │   │   │   ├── user.repository.ts
│   │   │   │   └── ...
│   │   │   └── migrations/
│   │   ├── external-services/     # Services externes
│   │   │   ├── storage/
│   │   │   │   ├── s3.service.ts
│   │   │   │   └── storage.interface.ts
│   │   │   ├── notifications/
│   │   │   │   ├── fcm.service.ts
│   │   │   │   └── notification.interface.ts
│   │   │   └── email/
│   │   │       └── email.service.ts
│   │   ├── cache/
│   │   │   └── redis.service.ts
│   │   └── message-queue/
│   │       └── queue.service.ts
│   │
│   ├── presentation/               # Couche Presentation (API)
│   │   ├── controllers/           # Controllers REST
│   │   │   ├── auth.controller.ts
│   │   │   ├── projet.controller.ts
│   │   │   └── ...
│   │   ├── guards/                # Guards (auth, roles)
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   ├── interceptors/          # Interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── timeout.interceptor.ts
│   │   ├── filters/               # Exception filters
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   ├── decorators/             # Custom decorators
│   │   │   ├── roles.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   └── pipes/                 # Validation pipes
│   │       └── validation.pipe.ts
│   │
│   ├── shared/                     # Code partagé
│   │   ├── constants/
│   │   ├── enums/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── decorators/
│   │   └── exceptions/
│   │
│   ├── config/                     # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   │
│   └── main.ts                     # Bootstrap application
│
├── test/                           # Tests
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── prisma/                         # Prisma migrations
│   └── migrations/
│
├── docker/                         # Docker configs
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── docker-compose.yml
│
├── k8s/                            # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
│
├── .github/                        # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   ├── architecture/               # Architecture docs
│   └── deployment/                 # Deployment guides
│
├── scripts/                        # Utility scripts
│   ├── migrate.sh
│   ├── seed.sh
│   └── deploy.sh
│
├── .env.example
├── .env.development
├── .env.production
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
├── docker-compose.yml
└── README.md
```

---

## 🗄️ Modèle de Données (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  emailVerified     Boolean   @default(false)
  passwordHash      String?   // Nullable pour OAuth
  nom               String
  prenom            String
  photoUrl          String?
  provider          AuthProvider @default(EMAIL)
  providerId        String?
  phoneNumber       String?
  timezone          String    @default("UTC")
  language          String    @default("fr")
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  ownedProjects     Project[] @relation("ProjectOwner")
  collaborations    Collaboration[]
  createdGestations Gestation[] @relation("GestationCreator")
  createdDepenses   DepensePonctuelle[] @relation("DepenseCreator")
  syncLogs          SyncLog[]

  @@index([email])
  @@index([provider, providerId])
  @@map("users")
}

enum AuthProvider {
  EMAIL
  GOOGLE
  APPLE
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  deviceId  String?
  deviceInfo Json?   // { os, model, etc }
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

model Project {
  id                  String    @id @default(uuid())
  nom                 String
  localisation        String
  nombreTruies        Int       @default(0)
  nombreVerrats       Int       @default(0)
  nombrePorcelets     Int       @default(0)
  poidsMoyenActuel    Float?
  ageMoyenActuel      Int?
  notes               String?   @db.Text
  statut              ProjectStatus @default(ACTIF)
  proprietaireId      String
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  proprietaire        User            @relation("ProjectOwner", fields: [proprietaireId], references: [id])
  collaborations      Collaboration[]
  gestations          Gestation[]
  sevrages            Sevrage[]
  chargesFixes        ChargeFixe[]
  depensesPonctuelles DepensePonctuelle[]
  rations             Ration[]
  planifications      Planification[]
  mortalites          Mortalite[]
  rapports            RapportCroissance[]
  syncLogs            SyncLog[]

  @@index([proprietaireId])
  @@index([statut])
  @@map("projects")
}

enum ProjectStatus {
  ACTIF
  ARCHIVE
  SUSPENDU
}

model Collaboration {
  id              String              @id @default(uuid())
  projetId        String
  utilisateurId   String
  role            RoleCollaborateur
  statut          StatutCollaborateur @default(EN_ATTENTE)
  permissions     Json                // Permissions granulaires
  dateInvitation  DateTime            @default(now())
  dateAcceptation DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  projet          Project             @relation(fields: [projetId], references: [id], onDelete: Cascade)
  utilisateur     User                @relation(fields: [utilisateurId], references: [id], onDelete: Cascade)

  @@unique([projetId, utilisateurId])
  @@index([projetId])
  @@index([utilisateurId])
  @@index([statut])
  @@map("collaborations")
}

enum RoleCollaborateur {
  PROPRIETAIRE
  GERANT
  EMPLOYE
  CONSULTANT
}

enum StatutCollaborateur {
  ACTIF
  INACTIF
  EN_ATTENTE
}

// ============================================
// REPRODUCTION
// ============================================

model Gestation {
  id                    String          @id @default(uuid())
  projetId              String
  truieId               String
  truieNom              String?
  dateSautage           DateTime        @db.Date
  dateMiseBasPrevue     DateTime        @db.Date
  dateMiseBasReelle      DateTime?      @db.Date
  nombrePorceletsPrevu   Int
  nombrePorceletsReel    Int?
  statut                StatutGestation @default(EN_COURS)
  notes                 String?         @db.Text
  createdById           String
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  projet                Project        @relation(fields: [projetId], references: [id], onDelete: Cascade)
  createdBy             User           @relation("GestationCreator", fields: [createdById], references: [id])
  sevrages              Sevrage[]
  planifications        Planification[]

  @@index([projetId])
  @@index([statut])
  @@index([dateMiseBasPrevue])
  @@map("gestations")
}

enum StatutGestation {
  EN_COURS
  TERMINEE
  ANNULEE
}

model Sevrage {
  id                    String   @id @default(uuid())
  projetId              String
  gestationId           String
  dateSevrage           DateTime @db.Date
  nombrePorceletsSevres Int
  poidsMoyenSevrage     Float?
  notes                 String?  @db.Text
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  projet                Project  @relation(fields: [projetId], references: [id], onDelete: Cascade)
  gestation             Gestation @relation(fields: [gestationId], references: [id], onDelete: Cascade)

  @@index([projetId])
  @@index([gestationId])
  @@index([dateSevrage])
  @@map("sevrages")
}

// ============================================
// FINANCE
// ============================================

model ChargeFixe {
  id                String            @id @default(uuid())
  projetId          String
  categorie         String
  libelle           String
  montant           Decimal           @db.Decimal(10, 2)
  dateDebut         DateTime          @db.Date
  frequence         FrequencePaiement
  jourPaiement      Int?
  notes             String?           @db.Text
  statut            StatutChargeFixe  @default(ACTIF)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  projet            Project           @relation(fields: [projetId], references: [id], onDelete: Cascade)

  @@index([projetId])
  @@index([statut])
  @@map("charges_fixes")
}

enum FrequencePaiement {
  MENSUEL
  TRIMESTRIEL
  ANNUEL
}

enum StatutChargeFixe {
  ACTIF
  SUSPENDU
  TERMINE
}

model DepensePonctuelle {
  id                String   @id @default(uuid())
  projetId          String
  montant           Decimal  @db.Decimal(10, 2)
  categorie         String
  libelleCategorie  String?
  date              DateTime @db.Date
  commentaire       String?  @db.Text
  photos            String[] // URLs S3
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  projet            Project  @relation(fields: [projetId], references: [id], onDelete: Cascade)
  createdBy         User     @relation("DepenseCreator", fields: [createdById], references: [id])

  @@index([projetId])
  @@index([date])
  @@index([categorie])
  @@map("depenses_ponctuelles")
}

// ============================================
// NUTRITION
// ============================================

model Ingredient {
  id          String   @id @default(uuid())
  nom         String   @unique
  unite       String   // kg, g, L, etc
  prixUnitaire Decimal? @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ingredientsRation IngredientRation[]

  @@map("ingredients")
}

model Ration {
  id          String   @id @default(uuid())
  projetId    String
  nom        String
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projet      Project  @relation(fields: [projetId], references: [id], onDelete: Cascade)
  ingredients IngredientRation[]

  @@index([projetId])
  @@map("rations")
}

model IngredientRation {
  id          String   @id @default(uuid())
  rationId    String
  ingredientId String
  quantite    Decimal  @db.Decimal(10, 2)
  unite       String

  ration      Ration    @relation(fields: [rationId], references: [id], onDelete: Cascade)
  ingredient  Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([rationId, ingredientId])
  @@index([rationId])
  @@map("ingredients_ration")
}

// ============================================
// PLANIFICATION
// ============================================

model Planification {
  id              String          @id @default(uuid())
  projetId        String
  titre           String
  description     String?         @db.Text
  typeTache       TypeTache
  dateDebut       DateTime        @db.Date
  dateFin         DateTime?       @db.Date
  rappel          DateTime?       @db.Date
  recurrence      String?         // RRULE format
  statut          StatutTache     @default(A_FAIRE)
  lienGestationId String?
  createdById     String
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  projet          Project         @relation(fields: [projetId], references: [id], onDelete: Cascade)
  lienGestation   Gestation?      @relation(fields: [lienGestationId], references: [id], onDelete: SetNull)

  @@index([projetId])
  @@index([statut])
  @@index([dateDebut])
  @@index([lienGestationId])
  @@map("planifications")
}

enum TypeTache {
  SAUTAGE
  MISE_BAS
  SEVRAGE
  VACCINATION
  AUTRE
}

enum StatutTache {
  A_FAIRE
  EN_COURS
  TERMINEE
  ANNULEE
}

// ============================================
// MORTALITES
// ============================================

model Mortalite {
  id          String          @id @default(uuid())
  projetId    String
  nombrePorcs Int
  date        DateTime        @db.Date
  cause       String
  categorie   CategorieMortalite
  notes       String?         @db.Text
  createdById String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  projet      Project         @relation(fields: [projetId], references: [id], onDelete: Cascade)

  @@index([projetId])
  @@index([date])
  @@index([categorie])
  @@map("mortalites")
}

enum CategorieMortalite {
  PORCELET
  TRUIE
  VERRAT
  AUTRE
}

// ============================================
// RAPPORTS
// ============================================

model RapportCroissance {
  id              String   @id @default(uuid())
  projetId        String
  date            DateTime  @db.Date
  nombrePorcs     Int
  poidsMoyen       Decimal   @db.Decimal(10, 2)
  poidsTotal      Decimal   @db.Decimal(10, 2)
  gainMoyenJour   Decimal?  @db.Decimal(10, 2)
  notes           String?   @db.Text
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  projet          Project  @relation(fields: [projetId], references: [id], onDelete: Cascade)

  @@index([projetId])
  @@index([date])
  @@map("rapports_croissance")
}

// ============================================
// SYNCHRONISATION
// ============================================

model SyncLog {
  id          String   @id @default(uuid())
  tableName   String
  recordId    String
  operation   OperationType
  userId      String
  projetId    String?
  deviceId    String?
  dataBefore  Json?    // État avant modification
  dataAfter   Json     // État après modification
  timestamp   DateTime @default(now())
  synced      Boolean  @default(false)

  user        User     @relation(fields: [userId], references: [id])
  projet      Project? @relation(fields: [projetId], references: [id])

  @@index([userId])
  @@index([projetId])
  @@index([tableName, recordId])
  @@index([synced])
  @@index([timestamp])
  @@map("sync_logs")
}

enum OperationType {
  CREATE
  UPDATE
  DELETE
}
```

---

## 🔐 Sécurité Enterprise

### Authentication & Authorization

```typescript
// JWT Strategy avec Refresh Tokens
- Access Token: 15 minutes (court)
- Refresh Token: 7 jours (long)
- Rotation automatique des refresh tokens
- Blacklist des tokens révoqués (Redis)

// RBAC + ABAC
- Roles: Propriétaire, Gérant, Employé, Consultant
- Permissions granulaires par ressource
- Vérification au niveau controller et service
```

### Security Headers

```typescript
// Helmet configuration
-Content -
  Security -
  Policy -
  X -
  Frame -
  Options -
  X -
  Content -
  Type -
  Options -
  Strict -
  Transport -
  Security -
  Referrer -
  Policy;
```

### Rate Limiting

```typescript
// Redis-based rate limiting
- Global: 100 req/min
- Auth endpoints: 5 req/min
- Per IP: 1000 req/hour
- Per user: 5000 req/hour
```

### Input Validation

```typescript
// class-validator + DTOs
- Validation stricte de tous les inputs
- Sanitization automatique
- Type checking avec TypeScript
```

---

## 📊 Monitoring & Observability

### Logging

```typescript
// Structured logging (Winston/Pino)
- Log levels: error, warn, info, debug
- Context: userId, requestId, deviceId
- Centralized logging (ELK/Loki)
- Log rotation et retention
```

### Metrics

```typescript
// Prometheus metrics
- Request duration
- Error rates
- Database query time
- Cache hit rates
- Active users
- API endpoint usage
```

### Tracing

```typescript
// Distributed tracing
- Request ID propagation
- Span tracking
- Performance bottlenecks identification
```

### Error Tracking

```typescript
// Sentry integration
- Error capture avec contexte
- Stack traces
- User context
- Release tracking
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /E2E\       10% - End-to-end tests
      /-----\
     /Integration\  20% - Integration tests
    /-----------\
   /   Unit      \  70% - Unit tests
  /---------------\
```

### Coverage Requirements

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths
- **E2E Tests**: User journeys principaux

### Test Types

```typescript
// Unit Tests
- Domain logic
- Use cases
- Services
- Utils

// Integration Tests
- API endpoints
- Database operations
- External services (mocked)

// E2E Tests
- Complete user flows
- Critical business scenarios
```

---

## 🚀 CI/CD Pipeline

### Continuous Integration

```yaml
# .github/workflows/ci.yml
1. Lint (ESLint)
2. Type check (TypeScript)
3. Unit tests
4. Integration tests
5. Build
6. Security scan (Snyk/SonarQube)
7. Docker build
```

### Continuous Deployment

```yaml
# .github/workflows/cd.yml
1. Deploy to staging
2. Run E2E tests
3. Deploy to production (manual approval)
4. Health checks
5. Rollback capability
```

---

## 📈 Scalability & Performance

### Caching Strategy

```typescript
// Redis caching
- User sessions
- Frequently accessed data
- Query results
- Rate limiting counters
```

### Database Optimization

```sql
-- Indexes stratégiques
- Foreign keys
- Frequently queried columns
- Date ranges
- Status fields

-- Query optimization
- Eager loading (Prisma)
- Pagination
- Batch operations
```

### Horizontal Scaling

```typescript
// Stateless architecture
- No server-side sessions
- Shared Redis cache
- Load balancer ready
- Database connection pooling
```

---

## 🔄 Synchronisation Offline-First

### Strategy

```typescript
// Conflict Resolution
1. Last-Write-Wins (simple)
2. Operational Transformation (complex)
3. CRDTs (advanced)

// Sync Flow
1. Track local changes (SQLite)
2. Push changes to server
3. Pull server changes
4. Resolve conflicts
5. Apply changes locally
```

### Implementation

```typescript
// Sync Service
- Queue-based sync
- Batch operations
- Conflict detection
- Merge strategies
- Sync status tracking
```

---

## 📦 Dépendances Principales

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-google-oauth20": "^2.0.0",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "ioredis": "^5.3.0",
    "bull": "^4.11.0",
    "aws-sdk": "^2.1500.0",
    "winston": "^3.10.0",
    "@sentry/node": "^7.0.0",
    "prometheus-client": "^15.0.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

---

## 🏗️ Prochaines Étapes

1. **Initialiser le projet NestJS**
2. **Configurer Prisma avec le schéma complet**
3. **Implémenter l'authentification JWT**
4. **Créer les modules de base (Projet, Reproduction, Finance)**
5. **Setup CI/CD**
6. **Configurer le monitoring**
7. **Implémenter les tests**

---

Souhaitez-vous que je commence par créer la structure complète du projet avec NestJS ?
