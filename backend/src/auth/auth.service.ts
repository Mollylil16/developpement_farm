import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
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
    const user = await this.usersService.findByEmail(email);

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
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
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
      console.log('[AuthService] register: vérification email', registerDto.email);
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      console.log('[AuthService] register: utilisateur existant?', existingUser ? 'OUI' : 'NON');
      if (existingUser) {
        console.log('[AuthService] register: email déjà utilisé, utilisateur:', existingUser.id);
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

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string) {
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
    await this.updateRefreshTokenUsage(refreshTokenRecord.id, ipAddress);

    return {
      access_token: accessToken,
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
    console.log('🔐 [AuthService] loginWithGoogle: début');
    
    try {
      // Vérifier le token Google avec l'API Google
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${oauthDto.access_token}`
      );

      if (!response.ok) {
        console.error('❌ [Google API] Erreur:', response.status, response.statusText);
        throw new UnauthorizedException('Token Google invalide');
      }

      const googleUser = await response.json();
      console.log('✅ [Google API] Utilisateur récupéré:', googleUser.email);

      // Vérifier que l'email est présent
      if (!googleUser.email) {
        throw new UnauthorizedException('Email manquant dans la réponse Google');
      }

      // Chercher l'utilisateur existant par email
      let user = await this.usersService.findByEmail(googleUser.email);

      if (!user) {
        // Créer un nouvel utilisateur
        console.log('🆕 [AuthService] Création nouvel utilisateur Google:', googleUser.email);
        
        // Séparer le nom complet en nom et prénom (approximatif)
        const nameParts = (googleUser.name || 'Utilisateur').split(' ');
        const prenom = nameParts[0] || 'Utilisateur';
        const nom = nameParts.slice(1).join(' ') || '';
        
        const newUser = {
          email: googleUser.email,
          nom,
          prenom,
          photo: googleUser.picture || null,
          provider: 'google',
          provider_id: googleUser.id || null,
          password_hash: null, // Pas de mot de passe pour OAuth
        };

        // Utiliser la méthode create de UsersService
        user = await this.usersService.create(newUser);
      } else {
        console.log('✅ [AuthService] Utilisateur existant trouvé:', user.id);
        
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

      console.log('✅ [AuthService] Google login réussi pour:', user.email);

      return {
        access_token,
        refresh_token: refreshTokenData.token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          roles: user.roles || {},
          is_email_verified: user.is_email_verified,
          is_phone_verified: user.is_phone_verified,
          created_at: user.created_at,
        },
      };
    } catch (error) {
      console.error('❌ [AuthService] Erreur Google login:', error);
      
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
}
