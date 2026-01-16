import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { verifyIdToken } from 'apple-signin-auth';
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
        throw new UnauthorizedException('Token Google invalide ou expiré');
      }

      const googleUser = await response.json();

      // SÉCURITÉ CRITIQUE : Vérifier l'audience du token
      // L'audience doit correspondre aux Client IDs de votre application
      const validAudiences = [
        process.env.GOOGLE_CLIENT_ID, // Web Client ID
        process.env.GOOGLE_CLIENT_ID_ANDROID, // Android Client ID (si configuré)
        process.env.GOOGLE_CLIENT_ID_IOS, // iOS Client ID (si configuré)
      ].filter(Boolean); // Enlever les undefined

      // Vérifier qu'au moins un Client ID est configuré
      if (validAudiences.length === 0) {
        throw new UnauthorizedException(
          'Aucun Google Client ID configuré. Veuillez configurer GOOGLE_CLIENT_ID dans les variables d\'environnement.'
        );
      }

      // Vérifier que l'audience du token correspond à un de nos Client IDs
      if (!validAudiences.includes(googleUser.aud)) {
        throw new UnauthorizedException(
          `Token Google généré pour une autre application. Audience attendue: ${validAudiences.join(', ')}, reçue: ${googleUser.aud}`
        );
      }

      // Vérifier que l'email est présent
      if (!googleUser.email) {
        throw new UnauthorizedException('Email manquant dans la réponse Google');
      }

      // Vérifier que l'email est vérifié (si disponible)
      if (googleUser.email_verified === false) {
        throw new UnauthorizedException('Email Google non vérifié');
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
   * Vérifie l'identity token Apple et crée/connecte l'utilisateur
   */
  async loginWithApple(oauthDto: OAuthAppleDto, ipAddress?: string, userAgent?: string) {
    try {
      // Bundle ID iOS (doit correspondre au Client ID Apple configuré)
      // Utiliser APPLE_CLIENT_ID, APPLE_BUNDLE_ID, ou Service ID selon la configuration
      const appleClientId = 
        process.env.APPLE_CLIENT_ID || 
        process.env.APPLE_BUNDLE_ID || 
        process.env.APPLE_SERVICE_ID || 
        'com.misterh225.fermierpro';
      
      // Vérifier que la configuration Apple est présente
      if (!process.env.APPLE_TEAM_ID) {
        console.warn('[Apple OAuth] APPLE_TEAM_ID non configuré dans les variables d\'environnement');
      }

      // Vérifier l'identity token Apple avec la bibliothèque apple-signin-auth
      let appleUser;
      try {
        appleUser = await verifyIdToken(oauthDto.identityToken, {
          audience: appleClientId, // Bundle ID iOS
          ignoreExpiration: false, // Vérifier l'expiration
        });
      } catch (verifyError: any) {
        throw new UnauthorizedException(
          `Token Apple invalide ou expiré: ${verifyError.message || 'Erreur de vérification'}`
        );
      }

      // SÉCURITÉ CRITIQUE : Vérifier l'audience du token
      // L'audience peut être soit le Bundle ID, soit le Service ID selon le contexte
      const validAudiences = [
        process.env.APPLE_CLIENT_ID,
        process.env.APPLE_BUNDLE_ID,
        process.env.APPLE_SERVICE_ID,
        'com.misterh225.fermierpro',
        'com.misterh225.fermierpro.signin',
      ].filter(Boolean);

      if (!validAudiences.includes(appleUser.aud)) {
        throw new UnauthorizedException(
          `Token Apple généré pour une autre application. Audience attendue: ${validAudiences.join(', ')}, reçue: ${appleUser.aud}`
        );
      }

      // Vérifier que l'issuer est Apple
      if (appleUser.iss !== 'https://appleid.apple.com') {
        throw new UnauthorizedException('Token Apple invalide: issuer incorrect');
      }

      // Extraire l'email depuis le token ou depuis le DTO
      // Note: Apple peut masquer l'email, donc on utilise celui du DTO si disponible
      const email = appleUser.email || oauthDto.email;

      // Vérifier qu'on a au moins un identifiant (email ou sub)
      if (!email && !appleUser.sub) {
        throw new UnauthorizedException('Email ou identifiant Apple manquant dans la réponse');
      }

      // Utiliser le sub (subject) comme identifiant unique Apple
      // Le sub est stable et unique pour chaque utilisateur Apple
      const appleUserId = appleUser.sub;

      // Chercher l'utilisateur existant par email ou par provider_id (Apple sub)
      let user;
      if (email) {
        user = await this.usersService.findByEmail(email);
      }

      // Si pas trouvé par email, chercher par provider_id (Apple sub)
      if (!user && appleUserId) {
        // Note: Vous devrez peut-être ajouter une méthode findByProviderId dans UsersService
        // Pour l'instant, on cherche par email uniquement
        // Si l'email est masqué par Apple, on utilisera le sub comme identifiant
      }

      if (!user) {
        // Créer un nouvel utilisateur
        // ❌ PAS DE VALEURS PAR DÉFAUT "Utilisateur" ou "Mobile" !
        // Extraire le nom depuis le DTO (Apple peut fournir fullName lors de la première connexion)
        let prenom = '';
        let nom = '';

        if (oauthDto.fullName) {
          // Si fullName est fourni dans le DTO (format JSON string ou objet)
          try {
            const fullNameData = typeof oauthDto.fullName === 'string' 
              ? JSON.parse(oauthDto.fullName) 
              : oauthDto.fullName;
            
            prenom = fullNameData.givenName?.trim() || fullNameData.firstName?.trim() || '';
            nom = fullNameData.familyName?.trim() || fullNameData.lastName?.trim() || '';
          } catch {
            // Si ce n'est pas du JSON, traiter comme une chaîne simple
            const nameParts = String(oauthDto.fullName).trim().split(' ');
            prenom = nameParts[0] || '';
            nom = nameParts.slice(1).join(' ') || '';
          }
        }

        // Valider : Si trop courts, on les laisse vides (ne pas mettre de valeurs par défaut)
        prenom = prenom.length >= 2 ? prenom : '';
        nom = nom.length >= 2 ? nom : '';

        // Si pas d'email dans le token (masqué par Apple), utiliser un email temporaire basé sur le sub
        // Le frontend devra demander l'email à l'utilisateur
        const userEmail = email || `apple_${appleUserId.substring(0, 8)}@apple.privaterelay.app`;

        const newUser = {
          email: userEmail,
          nom, // Peut être vide (sera complété dans UserInfoScreen)
          prenom, // Peut être vide (sera complété dans UserInfoScreen)
          photo: null, // Apple ne fournit pas de photo
          provider: 'apple',
          provider_id: appleUserId, // 'sub' est l'ID Apple unique et stable
          password_hash: null, // Pas de mot de passe pour OAuth
        };

        // Utiliser la méthode create de UsersService
        user = await this.usersService.create(newUser);
      } else {
        // Utilisateur existant trouvé
        // Vérifier que le provider_id correspond (si l'utilisateur s'est connecté avec Apple avant)
        if (user.provider === 'apple' && user.provider_id !== appleUserId) {
          // Mettre à jour le provider_id si différent (peut arriver si l'utilisateur a changé de compte Apple)
          // Note: Vous devrez peut-être ajouter une méthode updateProviderId dans UsersService
        }

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
          provider: user.provider || 'apple',
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
      
      // Logger l'erreur pour le débogage
      console.error('[Apple OAuth] Erreur:', error);
      
      throw new UnauthorizedException(
        `Erreur lors de l'authentification Apple: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Demander réinitialisation mot de passe
   */
  async requestPasswordReset(telephone: string): Promise<void> {
    // Vérifier que l'utilisateur existe
    const user = await this.usersService.findByTelephone(telephone);

    // ⚠️ Sécurité : Ne pas révéler si compte existe
    // Toujours retourner succès
    if (!user) {
      return;
    }

    // Générer code OTP (6 chiffres)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Stocker OTP en base avec expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.query(
      `INSERT INTO reset_tokens (id, user_id, telephone, otp, type, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        user.id,
        telephone,
        otp,
        'password_reset',
        expiresAt.toISOString(),
        new Date().toISOString(),
      ]
    );

    // TODO: Envoyer SMS via service SMS
    // await this.smsService.sendOTP(telephone, otp, 'réinitialisation de mot de passe');
  }

  /**
   * Vérifier code OTP de réinitialisation
   */
  async verifyResetOtp(telephone: string, otp: string): Promise<string> {
    // Récupérer OTP stocké (non expiré)
    const result = await this.db.query(
      `SELECT * FROM reset_tokens
       WHERE telephone = $1 AND type = 'password_reset' AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [telephone]
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const storedToken = result.rows[0];

    if (storedToken.otp !== otp) {
      throw new BadRequestException('Code incorrect');
    }

    // Générer token de réinitialisation (JWT temporaire 15 min)
    const resetToken = this.jwtService.sign(
      {
        telephone,
        type: 'password_reset',
        userId: storedToken.user_id,
      },
      { expiresIn: '15m' }
    );

    // Supprimer OTP utilisé
    await this.db.query(`DELETE FROM reset_tokens WHERE id = $1`, [storedToken.id]);

    return resetToken;
  }

  /**
   * Réinitialiser mot de passe
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      // Vérifier et décoder token
      const payload = this.jwtService.verify(resetToken);
      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Token invalide');
      }

      const userId = payload.userId;

      // Vérifier que l'utilisateur existe
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Valider nouveau mot de passe
      if (newPassword.length < 6) {
        throw new BadRequestException('Mot de passe trop court (minimum 6 caractères)');
      }

      // Hash nouveau mot de passe
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Mettre à jour
      await this.usersService.update(userId, {
        password_hash: newPasswordHash,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Le code de réinitialisation a expiré ou est invalide');
      }
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new UnauthorizedException('Erreur lors de la réinitialisation du mot de passe');
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
