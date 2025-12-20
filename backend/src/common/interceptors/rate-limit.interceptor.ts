/**
 * Intercepteur de rate limiting
 * Limite le nombre de requêtes par IP pour prévenir les abus
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Fenêtre de temps en millisecondes
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// Store en mémoire (en production, utiliser Redis)
const requestStore = new Map<string, RequestRecord>();

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private defaultConfig: RateLimitConfig = {
    maxRequests: 100, // 100 requêtes
    windowMs: 15 * 60 * 1000, // par fenêtre de 15 minutes
  };

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    // Config personnalisée (peut être définie via un decorator)
    const config = this.defaultConfig;

    const now = Date.now();
    const record = requestStore.get(ip);

    if (!record || now > record.resetTime) {
      // Nouvelle fenêtre
      requestStore.set(ip, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    } else {
      // Incrémenter le compteur
      record.count++;

      if (record.count > config.maxRequests) {
        throw new HttpException(
          {
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfter: Math.ceil((record.resetTime - now) / 1000), // secondes
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    // Nettoyer les anciennes entrées (garbage collection simple)
    if (requestStore.size > 10000) {
      for (const [key, value] of requestStore.entries()) {
        if (now > value.resetTime) {
          requestStore.delete(key);
        }
      }
    }

    return next.handle();
  }
}
