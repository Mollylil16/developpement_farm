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
import { Response } from 'express';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../decorators/rate-limit.decorator';

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
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response: Response | undefined = context.switchToHttp().getResponse();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const handler = context.getHandler();
    const controller = context.getClass();

    const handlerConfig = this.reflector.get<Partial<RateLimitConfig>>(RATE_LIMIT_KEY, handler);
    const controllerConfig = this.reflector.get<Partial<RateLimitConfig>>(RATE_LIMIT_KEY, controller);

    const mergedConfig: RateLimitConfig = {
      maxRequests:
        handlerConfig?.maxRequests ??
        controllerConfig?.maxRequests ??
        this.defaultConfig.maxRequests,
      windowMs:
        handlerConfig?.windowMs ??
        controllerConfig?.windowMs ??
        this.defaultConfig.windowMs,
    };

    // Clef unique par IP + handler pour ne pas partager les budgets entre endpoints
    const key = `${ip}:${controller?.name || 'global'}:${handler?.name || 'handler'}:${mergedConfig.maxRequests}:${mergedConfig.windowMs}`;

    const now = Date.now();
    let record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      // Nouvelle fenêtre
      record = {
        count: 1,
        resetTime: now + mergedConfig.windowMs,
      };
      requestStore.set(key, record);
    } else {
      // Incrémenter le compteur
      record.count++;
      requestStore.set(key, record);

      if (record.count > mergedConfig.maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        if (response) {
          response.setHeader('Retry-After', retryAfterSeconds.toString());
        }
        throw new HttpException(
          {
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfter: retryAfterSeconds, // secondes
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    if (response) {
      response.setHeader('X-RateLimit-Limit', mergedConfig.maxRequests.toString());
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(mergedConfig.maxRequests - record.count, 0).toString()
      );
      response.setHeader('X-RateLimit-Reset', record.resetTime.toString());
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
