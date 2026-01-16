# Module d'Authentification Complet

## Vue d'ensemble

Ce document contient le code complet du module d'authentification incluant :
- Authentification Google OAuth (Android & iOS)
- Authentification Apple OAuth (iOS)
- Création de compte utilisateur (Email/Téléphone)
- Connexion avec/sans mot de passe
- Gestion des tokens JWT et refresh tokens
- Sécurité et rate limiting

---

## BACKEND

### 1. Auth Service (`backend/src/auth/auth.service.ts`)

```typescript
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OAuthGoogleDto } from './dto/oauth-google.dto';
import { OAuthAppleDto } from './dto/oauth-apple.dto';
import { JWTPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private db: DatabaseService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Inclure password_hash pour la vérification
    const user = await this.usersService.findByEmail(email, true);

    if (!user) {
      return null;
    }

    if (!user.password_hash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Support email ou téléphone
    let user;
    if (loginDto.email) {
      user = await this.validateUser(loginDto.email, loginDto.password);
    } else if (loginDto.telephone) {
      // Valider avec téléphone - inclure password_hash pour la vérification
      const foundUser = await this.usersService.findByTelephone(loginDto.telephone, true);

      if (!foundUser) {
        user = null;
      } else if (!foundUser.password_hash) {
        user = null;
      } else {
        const isPasswordValid = await bcrypt.compare(loginDto.password, foundUser.password_hash);
        if (isPasswordValid) {
          const { password_hash, ...userWithoutPassword } = foundUser;
          user = userWithoutPassword;
        } else {
          user = null;
        }
      }
    } else {
      throw new BadRequestException('Email ou téléphone requis');
    }

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Ne pas inclure 'exp' dans le payload car expiresIn est déjà configuré dans JwtModule
    const payload: Omit<JWTPayload, 'exp'> = {
      sub: user.id,
      email: user.email || '',
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    await this.updateLastLogin(user.id);

    // Retourner la structure User complète
    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      expires_in: 3600,
      user: user, // Structure complète
    };
  }

  /**
   * Connexion simple sans mot de passe (compatibilité avec frontend)
   * Accepte email ou téléphone comme identifiant
   */
  async loginSimple(identifier: string, ipAddress?: string, userAgent?: string) {
    // Trouver l'utilisateur par email ou téléphone
    const user = await this.usersService.findByIdentifier(identifier.trim());

    if (!user) {
      throw new UnauthorizedException(
        'Aucun compte trouvé avec cet email ou ce numéro. Veuillez vous inscrire.'
      );
    }

    // Mettre à jour la dernière connexion
    await this.usersService.updateLastConnection(user.id);

    // Générer les tokens JWT (même sans mot de passe)
    // Ne pas inclure 'exp' dans le payload car expiresIn est déjà configuré dans JwtModule
    const payload: Omit<JWTPayload, 'exp'> = {
      sub: user.id,
      email: user.email || '',
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    // Retourner la structure User complète comme le frontend
    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      expires_in: 3600,
      user: user, // Structure complète
    };
  }

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    // Vérifier qu'au moins email ou téléphone est fourni
    if (!registerDto.email && !registerDto.telephone) {
      throw new ConflictException('Email ou numéro de téléphone requis');
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (registerDto.email) {
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        throw new ConflictException('Un compte existe déjà avec cet email');
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (registerDto.telephone) {
      const existingPhone = await this.usersService.findByTelephone(registerDto.telephone);
      if (existingPhone) {
        throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    // ✅ Vérifier mot de passe pour inscription téléphone (sans OAuth)
    if (registerDto.telephone && !registerDto.provider_id) {
      if (!registerDto.password || registerDto.password.length < 6) {
        throw new ConflictException(
          'Mot de passe requis (minimum 6 caractères) pour inscription par téléphone'
        );
      }
    }

    // Hasher le mot de passe si fourni
    let passwordHash = null;
    if (registerDto.password) {
      passwordHash = await bcrypt.hash(registerDto.password, 12);
    }

    // Créer l'utilisateur
    const user = await this.usersService.create({
      email: registerDto.email,
      telephone: registerDto.telephone,
      nom: registerDto.nom,
      prenom: registerDto.prenom,
      password_hash: passwordHash,
      provider: registerDto.telephone ? 'telephone' : 'email',
    });

    // Générer les tokens JWT (même sans mot de passe pour compatibilité)
    // Ne pas inclure 'exp' dans le payload car expiresIn est déjà configuré dans JwtModule
    const payload: Omit<JWTPayload, 'exp'> = {
      sub: user.id,
      email: user.email || '',
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    // Retourner la structure User complète comme le frontend
    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      expires_in: 3600,
      user: user, // Structure complète
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const refreshTokenRecord = await this.findRefreshToken(refreshTokenDto.refresh_token);

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }

    if (refreshTokenRecord.revoked) {
      throw new UnauthorizedException('Token de rafraîchissement révoqué');
    }

    if (new Date(refreshTokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedException('Token de rafraîchissement expiré');
    }

    const user = await this.usersService.findOne(refreshTokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Ne pas inclure 'exp' dans le payload car expiresIn est déjà configuré dans JwtModule
    const payload: Omit<JWTPayload, 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload);
    
    // SÉCURITÉ : Rotation des refresh tokens (révoquer l'ancien et créer un nouveau)
    // Cela limite la fenêtre d'exposition si un refresh token est compromis
    await this.revokeRefreshToken(refreshTokenDto.refresh_token);
    const newRefreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);
    
    return {
      access_token: accessToken,
      refresh_token: newRefreshToken.token,
      expires_in: 3600,
    };
  }

  async logout(refreshToken: string) {
    await this.revokeRefreshToken(refreshToken);
    return { message: 'Déconnexion réussie' };
  }

  private async createRefreshToken(userId: string, ipAddress?: string, userAgent?: string) {
    const id = uuidv4();
    const token = uuidv4();
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    const result = await this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, expires_at`,
      [id, userId, hashedToken, expiresAt, ipAddress, userAgent]
    );

    return {
      id: result.rows[0].id,
      token: token,
      expires_at: result.rows[0].expires_at,
    };
  }

  private async findRefreshToken(token: string) {
    const tokens = await this.db.query(
      `SELECT * FROM refresh_tokens 
       WHERE revoked = false 
       AND expires_at > NOW()`
    );

    for (const tokenRecord of tokens.rows) {
      const isValid = await bcrypt.compare(token, tokenRecord.token_hash);
      if (isValid) {
        return tokenRecord;
      }
    }

    return null;
  }

  private async revokeRefreshToken(token: string) {
    const tokenRecord = await this.findRefreshToken(token);
    if (tokenRecord) {
      await this.db.query(`UPDATE refresh_tokens SET revoked = true WHERE id = $1`, [
        tokenRecord.id,
      ]);
    }
  }

  private async updateRefreshTokenUsage(tokenId: string, ipAddress?: string) {
    await this.db.query(
      `UPDATE refresh_tokens 
       SET last_used_at = NOW(), ip_address = COALESCE($2, ip_address)
       WHERE id = $1`,
      [tokenId, ipAddress]
    );
  }

  private async updateLastLogin(userId: string) {
    await this.usersService.updateLastConnection(userId);
  }

  /**
   * Authentification Google OAuth
   */
  async loginWithGoogle(oauthDto: OAuthGoogleDto, ipAddress?: string, userAgent?: string) {
    try {
      // Vérifier le token Google avec l'API Google (id_token)
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${oauthDto.id_token}`
      );

      if (!response.ok) {
        throw new UnauthorizedException('Token Google invalide');
      }

      const googleUser = await response.json();

      // SÉCURITÉ CRITIQUE : Vérifier l'audience du token
      // L'audience doit correspondre aux Client IDs de votre application
      const validAudiences = [
        process.env.GOOGLE_CLIENT_ID, // Web Client ID
        process.env.GOOGLE_CLIENT_ID_ANDROID, // Android Client ID (si configuré)
        process.env.GOOGLE_CLIENT_ID_IOS, // iOS Client ID (si configuré)
      ].filter(Boolean); // Enlever les undefined

      if (!validAudiences.includes(googleUser.aud)) {
        throw new UnauthorizedException('Token Google généré pour une autre application');
      }

      // Vérifier que l'email est présent
      if (!googleUser.email) {
        throw new UnauthorizedException('Email manquant dans la réponse Google');
      }

      // Chercher l'utilisateur existant par email
      let user = await this.usersService.findByEmail(googleUser.email);

      if (!user) {
        // Créer un nouvel utilisateur
        // ❌ PAS DE VALEURS PAR DÉFAUT "Utilisateur" ou "Mobile" !
        // Extraire given_name et family_name de Google (Google les fournit généralement)
        // Si absents ou trop courts (< 2 caractères), utiliser des valeurs temporaires vides
        // Le frontend redirigera vers UserInfoScreen pour compléter
        const prenomFromGoogle = googleUser.given_name?.trim() || googleUser.name?.split(' ')[0]?.trim() || '';
        const nomFromGoogle = googleUser.family_name?.trim() || googleUser.name?.split(' ').slice(1).join(' ').trim() || '';

        // Valider : Si trop courts, on les laisse vides (ne pas mettre de valeurs par défaut)
        const prenom = prenomFromGoogle.length >= 2 ? prenomFromGoogle : '';
        const nom = nomFromGoogle.length >= 2 ? nomFromGoogle : '';
        
        const newUser = {
          email: googleUser.email,
          nom, // Peut être vide (sera complété dans UserInfoScreen)
          prenom, // Peut être vide (sera complété dans UserInfoScreen)
          photo: googleUser.picture || null,
          provider: 'google',
          provider_id: googleUser.sub || null, // 'sub' est l'ID Google unique
          password_hash: null, // Pas de mot de passe pour OAuth
        };

        // Utiliser la méthode create de UsersService
        user = await this.usersService.create(newUser);
      } else {
        // Mettre à jour last_login
        await this.updateLastLogin(user.id);
      }

      // Générer les tokens JWT
      const payload: Omit<JWTPayload, 'exp'> = {
        sub: user.id,
        email: user.email,
        roles: user.roles || [],
        iat: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
      };

      const access_token = this.jwtService.sign(payload);
      const refreshTokenData = await this.createRefreshToken(user.id, ipAddress, userAgent);

      return {
        access_token,
        refresh_token: refreshTokenData.token,
        user: {
          id: user.id,
          email: user.email,
          telephone: user.telephone || null,
          nom: user.nom,
          prenom: user.prenom,
          provider: user.provider || 'google',
          photo: user.photo || null,
          saved_farms: user.saved_farms || [],
          date_creation: user.date_creation,
          derniere_connexion: user.derniere_connexion,
          isOnboarded: user.is_onboarded || false,
          onboardingCompletedAt: user.onboarding_completed_at || null,
          roles: user.roles || {},
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Erreur lors de l'authentification Google");
    }
  }

  /**
   * Authentification Apple OAuth
   * TODO: Implémenter la vérification du token Apple avec l'API Apple
   */
  async loginWithApple(oauthDto: OAuthAppleDto, ipAddress?: string, userAgent?: string) {
    try {
      // TODO: Vérifier l'identity token Apple avec l'API Apple
      // Pour l'instant, simulation

      // En production, vérifier l'identity token avec JWT et les clés publiques Apple
      // const appleUser = await verifyAppleToken(oauthDto.identityToken);

      // Pour l'instant, retourner une erreur indiquant que c'est à implémenter
      throw new UnauthorizedException(
        "L'authentification Apple n'est pas encore configurée. Veuillez configurer les credentials Apple OAuth."
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Erreur lors de l'authentification Apple");
    }
  }

  /**
   * Supprime définitivement le compte utilisateur et toutes ses données
   */
  async deleteAccount(userId: string): Promise<void> {
    // Utiliser une transaction pour garantir la cohérence
    await this.db.transaction(async (client) => {
      // Nettoyage explicite (sécurité) : certaines anciennes contraintes FK utilisaient ON DELETE SET NULL
      // sur des colonnes NOT NULL, ce qui pouvait faire échouer la suppression.
      // Même avec les migrations correctives, ce cleanup garantit la suppression des données liées.
      await client.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM migration_history WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM collaborations WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM veterinarians WHERE user_id = $1`, [userId]);

      // Supprimer l'utilisateur (les contraintes ON DELETE CASCADE s'occuperont du reste :
      // - projets + données liées
      // - refresh_tokens, reset_tokens, chat agent, marketplace, subscriptions, etc.)
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    });
  }

  /**
   * Retourne le journal de connexion (auth logs) pour l'utilisateur
   */
  async getLoginLogs(userId: string, limit: number = 100) {
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    const result = await this.db.query(
      `SELECT id, endpoint, method, ip, user_agent, success, error, created_at
       FROM auth_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  }
}
```

### 2. Auth Controller (`backend/src/auth/auth.controller.ts`)

```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginSimpleDto } from './dto/login-simple.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OAuthGoogleDto } from './dto/oauth-google.dto';
import { OAuthAppleDto } from './dto/oauth-apple.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour l'inscription
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour le login (protection brute force)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion d'un utilisateur (avec mot de passe)" })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour le login simple
  @Post('login-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion simple sans mot de passe (email ou téléphone)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Utilisateur introuvable' })
  async loginSimple(@Body() loginSimpleDto: LoginSimpleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginSimple(loginSimpleDto.identifier, ipAddress, userAgent);
  }

  @Public()
  @RateLimit({ maxRequests: 3, windowMs: 10_000 }) // 3 refresh en 10s max
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir le token d'accès" })
  @ApiResponse({ status: 200, description: 'Token rafraîchi avec succès' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.refreshToken(refreshTokenDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Déconnexion d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(@Body('refresh_token') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.authService['usersService'].findOne(user.id);
    const { password_hash, ...result } = fullUser;
    return result;
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion avec Google OAuth' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token Google invalide' })
  async loginWithGoogle(@Body() oauthDto: OAuthGoogleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginWithGoogle(oauthDto, ipAddress, userAgent);
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion avec Apple OAuth' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token Apple invalide' })
  async loginWithApple(@Body() oauthDto: OAuthAppleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginWithApple(oauthDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer définitivement le compte utilisateur' })
  @ApiResponse({ status: 200, description: 'Compte supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async deleteAccount(@CurrentUser() user: any) {
    await this.authService.deleteAccount(user.id);
    return { message: 'Compte supprimé avec succès' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('login-logs')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Journal de connexion (historique auth) de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Liste des logs' })
  async getLoginLogs(@CurrentUser() user: any, @Request() req: any) {
    const limitRaw = req?.query?.limit;
    const limit = limitRaw ? parseInt(String(limitRaw), 10) : 100;
    return this.authService.getLoginLogs(user.id, limit);
  }
}
```

### 3. Auth Module (`backend/src/auth/auth.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { RateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';
import { AuthLoggingInterceptor } from './interceptors/auth-logging.interceptor';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const rawExpiresIn =
          configService.get<string>('JWT_EXPIRES_IN') || process.env.JWT_EXPIRES_IN || '1h';

        function parseExpiresInToSeconds(value: string): number | null {
          const v = String(value || '').trim();
          if (!v) return null;
          if (/^\d+$/.test(v)) return Number(v);
          const m = v.match(/^(\d+)\s*([smhd])$/i);
          if (!m) return null;
          const n = Number(m[1]);
          const unit = m[2].toLowerCase();
          const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
          return n * mult;
        }

        // Safety clamp: extremely short JWTs cause constant 401 + refresh storms.
        const parsedSeconds = parseExpiresInToSeconds(rawExpiresIn);
        const minSeconds = 300; // 5 minutes

        // CRITICAL: The JWT library's `ms` package interprets "3600" as 3600 MILLISECONDS.
        // To get 3600 seconds, we must pass either a NUMBER (jwt treats as seconds) or a string like "3600s"/"1h".
        // If rawExpiresIn is a pure numeric string, convert to number; otherwise keep as-is.
        let expiresIn: string | number;
        if (parsedSeconds !== null && parsedSeconds < minSeconds) {
          expiresIn = '1h'; // clamped fallback
        } else if (/^\d+$/.test(rawExpiresIn)) {
          // Pure numeric string (e.g. "3600") → pass as number (seconds)
          expiresIn = Number(rawExpiresIn);
        } else {
          // Time string like "1h", "7d" → pass as-is
          expiresIn = rawExpiresIn;
        }

        return {
          secret: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || '',
          signOptions: {
            expiresIn: expiresIn as SignOptions['expiresIn'],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthLoggingInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

### 4. DTOs

#### RegisterDto (`backend/src/auth/dto/register.dto.ts`)

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: "Email de l'utilisateur (optionnel si téléphone fourni)",
    example: 'user@example.com',
    required: false,
  })
  @ValidateIf((o) => !o.telephone)
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Mot de passe (obligatoire si téléphone sans OAuth)',
    example: 'SecurePassword123!',
    required: false,
  })
  @ValidateIf((o) => o.telephone && !o.provider_id)
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    {
      message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
    }
  )
  password?: string;

  @ApiProperty({
    description: 'Provider (email, telephone, google, apple)',
    example: 'telephone',
    required: false,
  })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty({
    description: 'Provider ID (pour OAuth)',
    example: 'google_123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  provider_id?: string;

  @ApiProperty({
    description: "Nom de l'utilisateur",
    example: 'Dupont',
  })
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
  })
  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom: string;

  @ApiProperty({
    description: 'Numéro de téléphone (optionnel si email fourni)',
    example: '0123456789',
    required: false,
  })
  @ValidateIf((o) => !o.email)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Format de téléphone invalide (8-15 chiffres)',
  })
  telephone?: string;
}
```

#### OAuthGoogleDto (`backend/src/auth/dto/oauth-google.dto.ts`)

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthGoogleDto {
  @ApiProperty({
    description: 'ID token Google obtenu via OAuth',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString({ message: 'Le ID token Google doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le ID token Google ne peut pas être vide.' })
  id_token: string;
}
```

#### OAuthAppleDto (`backend/src/auth/dto/oauth-apple.dto.ts`)

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthAppleDto {
  @ApiProperty({
    description: 'Identity token Apple',
    example: 'eyJraWQiOiJlWGF1bm1...',
  })
  @IsString({ message: "L'identity token Apple doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "L'identity token Apple ne peut pas être vide." })
  identityToken: string;

  @ApiProperty({
    description: 'Authorization code Apple (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiProperty({
    description: "Email de l'utilisateur (optionnel, peut être masqué par Apple)",
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: "Nom complet de l'utilisateur (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;
}
```

### 5. Strategies

#### JWT Strategy (`backend/src/auth/strategies/jwt.strategy.ts`)

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JWTPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET,
    });
  }

  async validate(payload: JWTPayload) {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const result = {
      id: user.id,
      email: user.email,
      roles: user.roles || [],
    };
    return result;
  }
}
```

#### Local Strategy (`backend/src/auth/strategies/local.strategy.ts`)

```typescript
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    return user;
  }
}
```

### 6. Guards

#### JWT Auth Guard (`backend/src/auth/guards/jwt-auth.guard.ts`)

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### 7. Decorators

#### Public Decorator (`backend/src/auth/decorators/public.decorator.ts`)

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

#### Current User Decorator (`backend/src/auth/decorators/current-user.decorator.ts`)

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## FRONTEND

### 1. OAuth Service (`src/services/auth/oauthService.ts`)

Voir le fichier complet dans la section précédente (lignes 1-320).

### 2. Auth Screen (`src/screens/AuthScreen.tsx`)

Voir le fichier complet dans la section précédente (lignes 1-398).

### 3. Auth Slice (`src/store/slices/authSlice.ts`)

Voir le fichier complet dans la section précédente (lignes 1-640).

---

## Configuration requise

### Variables d'environnement Backend

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
GOOGLE_CLIENT_ID_IOS=your-ios-client-id
```

### Variables d'environnement Frontend

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
```

---

## Endpoints API

| Méthode | Endpoint | Description | Auth Requise |
|---------|----------|-------------|--------------|
| POST | `/auth/register` | Inscription | Non |
| POST | `/auth/login` | Connexion avec mot de passe | Non |
| POST | `/auth/login-simple` | Connexion sans mot de passe | Non |
| POST | `/auth/google` | Connexion Google OAuth | Non |
| POST | `/auth/apple` | Connexion Apple OAuth | Non |
| POST | `/auth/refresh` | Rafraîchir le token | Non |
| POST | `/auth/logout` | Déconnexion | Oui |
| GET | `/auth/me` | Profil utilisateur | Oui |
| DELETE | `/auth/delete-account` | Supprimer le compte | Oui |
| GET | `/auth/login-logs` | Journal de connexion | Oui |

---

## Sécurité

- ✅ Rate limiting sur toutes les routes d'authentification
- ✅ Hashage bcrypt pour les mots de passe (12 rounds)
- ✅ Rotation des refresh tokens
- ✅ Validation des tokens OAuth (Google)
- ✅ Vérification de l'audience des tokens Google
- ✅ Protection contre les attaques par force brute
- ✅ Journalisation des tentatives d'authentification

---

## Notes importantes

1. **Apple OAuth** : Actuellement non implémenté côté backend (retourne une erreur). La structure est en place pour une implémentation future.

2. **Google OAuth** : Nécessite la configuration de 3 Client IDs (Web, Android, iOS) dans Google Cloud Console.

3. **Refresh Tokens** : Rotation automatique à chaque utilisation pour limiter la fenêtre d'exposition en cas de compromission.

4. **Rate Limiting** : Configuré différemment selon l'endpoint pour équilibrer sécurité et expérience utilisateur.
