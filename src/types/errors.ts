/**
 * Types pour la gestion d'erreurs dans l'application
 */

/**
 * Erreur standardisée de l'application
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

/**
 * Codes d'erreur standardisés
 */
export enum ErrorCode {
  // Erreurs générales
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Erreurs d'authentification
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

  // Erreurs de base de données
  DB_ERROR = 'DB_ERROR',
  DB_NOT_FOUND = 'DB_NOT_FOUND',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',

  // Erreurs marketplace
  MARKETPLACE_LISTING_NOT_FOUND = 'MARKETPLACE_LISTING_NOT_FOUND',
  MARKETPLACE_OFFER_PENDING = 'MARKETPLACE_OFFER_PENDING',
  MARKETPLACE_UNAUTHORIZED = 'MARKETPLACE_UNAUTHORIZED',

  // Erreurs de production
  PRODUCTION_ANIMAL_NOT_FOUND = 'PRODUCTION_ANIMAL_NOT_FOUND',
  PRODUCTION_INVALID_DATA = 'PRODUCTION_INVALID_DATA',
}

/**
 * Helper pour créer une AppError depuis une erreur inconnue
 */
export function createAppError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
): AppError {
  if (error instanceof Error) {
    return {
      code: defaultCode,
      message: error.message,
      details: error,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      code: defaultCode,
      message: error,
    };
  }

  return {
    code: defaultCode,
    message: 'Une erreur inconnue est survenue',
    details: error,
  };
}

/**
 * Helper pour extraire le message d'erreur d'une AppError ou d'une erreur inconnue
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Une erreur inconnue est survenue';
}
