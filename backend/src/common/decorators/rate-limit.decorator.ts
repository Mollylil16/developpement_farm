import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Fenêtre de temps en millisecondes
}

export const RATE_LIMIT_KEY = 'rate_limit_config';

/**
 * Permet de surcharger le rate limiting pour un handler/controller.
 * Exemple: @RateLimit({ maxRequests: 5, windowMs: 10 * 60 * 1000 })
 */
export const RateLimit = (config: Partial<RateLimitConfig>) => SetMetadata(RATE_LIMIT_KEY, config);


