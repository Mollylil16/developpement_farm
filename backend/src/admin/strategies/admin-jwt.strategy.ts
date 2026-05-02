import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../admin.service';
import { AdminJWTPayload } from '../interfaces/admin-jwt-payload.interface';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private adminService: AdminService,
    private configService: ConfigService,
  ) {
    // Prefer a dedicated admin secret so admin and user tokens cannot be swapped.
    // Falls back to JWT_SECRET for backwards-compat until JWT_SECRET_ADMIN is provisioned.
    const secret =
      configService.get<string>('JWT_SECRET_ADMIN') ||
      process.env.JWT_SECRET_ADMIN ||
      configService.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'Neither JWT_SECRET_ADMIN nor JWT_SECRET is set. Admin authentication cannot start.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AdminJWTPayload) {
    // Vérifier que c'est bien un token admin
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Token invalide pour un administrateur');
    }

    const admin = await this.adminService.findOne(payload.sub);

    if (!admin.is_active) {
      throw new UnauthorizedException('Compte administrateur désactivé');
    }

    return {
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      prenom: admin.prenom,
    };
  }
}

