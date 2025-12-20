import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

/**
 * Guard global JWT
 * Protège toutes les routes par défaut sauf celles marquées @Public()
 */
@Injectable()
export class JwtAuthGlobalGuard extends AuthGuard('jwt') {
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

    // Ignorer les routes admin (elles ont leur propre guard AdminAuthGuard)
    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path;
    if (path && path.startsWith('/admin')) {
      return true; // Laisser passer, le AdminAuthGuard s'en occupera
    }

    return super.canActivate(context);
  }
}
