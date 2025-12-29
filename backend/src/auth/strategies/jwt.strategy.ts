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
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'jwt.strategy.ts:21',message:'JWT validate entry',data:{payloadSub:payload.sub,payloadSubType:typeof payload.sub,payloadSubLength:payload.sub?.length,payloadSubJSON:JSON.stringify(payload.sub)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})+'\n'); } catch(e) {}
    // #endregion
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
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'jwt.strategy.ts:36',message:'JWT validate return',data:{userId:result.id,userIdType:typeof result.id,userIdLength:result.id?.length,userIdJSON:JSON.stringify(result.id),userDbId:user.id,userDbIdType:typeof user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})+'\n'); } catch(e) {}
    // #endregion
    return result;
  }
}
