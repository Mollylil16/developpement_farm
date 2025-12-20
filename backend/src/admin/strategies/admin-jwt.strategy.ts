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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET,
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

