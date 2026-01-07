import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class KouakouRateLimitGuard implements CanActivate {
  private static readonly requests = new Map<string, RateLimitEntry>();

  private readonly windowMs =
    Number(process.env.KOUAKOU_RATE_LIMIT_WINDOW_MS) || 60_000;
  private readonly maxPerWindow =
    Number(process.env.KOUAKOU_RATE_LIMIT_MAX) || 30;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const key = userId || request.ip || 'anonymous';

    const now = Date.now();
    const entry = KouakouRateLimitGuard.requests.get(key) ?? {
      count: 0,
      resetAt: now + this.windowMs,
    };

    if (entry.resetAt <= now) {
      entry.count = 0;
      entry.resetAt = now + this.windowMs;
    }

    entry.count += 1;
    KouakouRateLimitGuard.requests.set(key, entry);

    if (entry.count > this.maxPerWindow) {
      throw new HttpException(
        "Tu as atteint la limite de requêtes pour Kouakou. Réessaie dans quelques instants.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

