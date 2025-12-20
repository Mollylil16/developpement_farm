# 🛠️ Guide d'Implémentation Professionnelle - Backend

## 🎯 Objectif

Implémenter un backend **production-ready** avec les meilleures pratiques de l'industrie.

---

## 📋 ÉTAPE 1 : Configuration Initiale

### 1.1 Vérifier les Prérequis

```bash
# Vérifier Node.js (>= 18)
node --version

# Vérifier PostgreSQL (>= 14)
psql --version

# Vérifier npm
npm --version
```

### 1.2 Installer les Dépendances

```bash
cd backend
npm install

# Dépendances de sécurité et qualité
npm install --save-dev \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  prettier \
  eslint-config-prettier \
  eslint-plugin-prettier
```

### 1.3 Configuration TypeScript Strict

**Fichier** : `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 🔐 ÉTAPE 2 : Module Auth Professionnel

### 2.1 Structure Complète

Créer la structure suivante :

```
backend/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── public.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   └── public.decorator.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── refresh-token.dto.ts
│   └── change-password.dto.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

### 2.2 Implémentation Complète

**Fichier** : `backend/src/auth/interfaces/jwt-payload.interface.ts`

```typescript
export interface JWTPayload {
  sub: string;           // User ID
  email: string;
  roles: string[];
  iat: number;
  exp: number;
  jti: string;          // JWT ID pour blacklist
}
```

**Fichier** : `backend/src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  password: string;
}
```

**Fichier** : `backend/src/auth/auth.service.ts` (Version Complète)

```typescript
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JWTPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  /**
   * Valide un utilisateur avec email et mot de passe
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('Compte non configuré');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const { password_hash, ...result } = user;
    return result;
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1h
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(
      user.id,
      ipAddress,
      userAgent,
    );

    // Mettre à jour la dernière connexion
    await this.updateLastLogin(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        roles: user.roles || [],
      },
    };
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(registerDto: RegisterDto, ipAddress?: string) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Vérifier si le téléphone existe déjà
    if (registerDto.telephone) {
      const existingPhone = await this.usersService.findByTelephone(
        registerDto.telephone,
      );
      if (existingPhone) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Créer l'utilisateur
    const user = await this.usersService.create({
      ...registerDto,
      password_hash: hashedPassword,
    });

    // Générer les tokens
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(
      user.id,
      ipAddress,
      undefined,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        roles: user.roles || [],
      },
    };
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string) {
    // Vérifier le token en base
    const refreshTokenRecord = await this.findRefreshToken(
      refreshTokenDto.refresh_token,
    );

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }

    if (refreshTokenRecord.revoked) {
      throw new UnauthorizedException('Token de rafraîchissement révoqué');
    }

    if (new Date(refreshTokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedException('Token de rafraîchissement expiré');
    }

    // Récupérer l'utilisateur
    const user = await this.usersService.findOne(refreshTokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Créer un nouveau access token
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);

    // Mettre à jour la dernière utilisation
    await this.updateRefreshTokenUsage(refreshTokenRecord.id, ipAddress);

    return {
      access_token: accessToken,
      expires_in: 3600,
    };
  }

  /**
   * Déconnexion (révoquer le refresh token)
   */
  async logout(refreshToken: string) {
    await this.revokeRefreshToken(refreshToken);
    return { message: 'Déconnexion réussie' };
  }

  /**
   * Créer un refresh token en base
   */
  private async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const token = uuidv4();
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    const result = await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, token_hash, expires_at`,
      [userId, hashedToken, expiresAt, ipAddress, userAgent],
    );

    return {
      id: result.rows[0].id,
      token: token, // Retourner le token en clair (une seule fois)
      expires_at: result.rows[0].expires_at,
    };
  }

  /**
   * Trouver un refresh token
   */
  private async findRefreshToken(token: string) {
    // Récupérer tous les refresh tokens actifs de l'utilisateur
    // et vérifier le hash
    const tokens = await this.db.query(
      `SELECT * FROM refresh_tokens 
       WHERE revoked = false 
       AND expires_at > NOW()`,
    );

    for (const tokenRecord of tokens.rows) {
      const isValid = await bcrypt.compare(token, tokenRecord.token_hash);
      if (isValid) {
        return tokenRecord;
      }
    }

    return null;
  }

  /**
   * Révoquer un refresh token
   */
  private async revokeRefreshToken(token: string) {
    const tokenRecord = await this.findRefreshToken(token);
    if (tokenRecord) {
      await this.db.query(
        `UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
        [tokenRecord.id],
      );
    }
  }

  /**
   * Mettre à jour la dernière utilisation
   */
  private async updateRefreshTokenUsage(
    tokenId: string,
    ipAddress?: string,
  ) {
    await this.db.query(
      `UPDATE refresh_tokens 
       SET last_used_at = NOW(), ip_address = COALESCE($2, ip_address)
       WHERE id = $1`,
      [tokenId, ipAddress],
    );
  }

  /**
   * Mettre à jour la dernière connexion
   */
  private async updateLastLogin(userId: string) {
    await this.db.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [userId],
    );
  }
}
```

---

## 🗄️ ÉTAPE 3 : Migration Base de Données

### 3.1 Table Refresh Tokens

**Fichier** : `backend/database/migrations/001_create_refresh_tokens.sql`

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  CONSTRAINT unique_active_token UNIQUE (user_id, token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);
```

### 3.2 Ajouter last_login à users

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
```

---

## ✅ PROCHAINES ÉTAPES

1. **Créer tous les fichiers du module Auth** selon la structure
2. **Créer la migration** pour refresh_tokens
3. **Tester l'authentification** avec Postman/Insomnia
4. **Ajouter les tests unitaires** pour AuthService
5. **Protéger les routes existantes** avec @UseGuards(JwtAuthGuard)

---

**Souhaitez-vous que je crée tous les fichiers du module Auth maintenant ?**

