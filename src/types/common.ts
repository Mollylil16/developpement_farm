/**
 * Types communs et utilitaires pour remplacer les `any`
 * 
 * Ce fichier centralise les types réutilisables pour éviter l'utilisation de `any`
 */

/**
 * Type pour les erreurs JavaScript/TypeScript
 * Utilisé dans les catch blocks au lieu de `any`
 */
export type ErrorLike = Error | { message?: string; [key: string]: unknown };

/**
 * Type pour les objets avec propriétés inconnues
 * Utilisé pour les données JSON parsées ou les objets dynamiques
 */
export type UnknownObject = Record<string, unknown>;

/**
 * Type pour les valeurs JSON valides
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Type pour les paramètres de fonction inconnus
 * Utilisé pour les callbacks avec paramètres variés
 */
export type UnknownFunction = (...args: unknown[]) => unknown;

/**
 * Type pour les résultats de requête SQLite génériques
 */
export type SQLiteRow = Record<string, unknown>;

/**
 * Type pour les résultats de requête avec colonnes connues
 */
export type SQLiteResult<T = SQLiteRow> = T;

/**
 * Type pour les erreurs de base de données
 */
export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
}

/**
 * Type pour les erreurs de validation
 */
export interface ValidationError extends Error {
  field?: string;
  value?: unknown;
}

/**
 * Type pour les erreurs réseau/API
 */
export interface NetworkError extends Error {
  status?: number;
  statusText?: string;
  url?: string;
}

/**
 * Helper pour extraire le message d'erreur de manière type-safe
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Une erreur inconnue est survenue';
}

/**
 * Helper pour vérifier si une valeur est une Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Helper pour créer une Error à partir d'une valeur inconnue
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error(getErrorMessage(value));
}

