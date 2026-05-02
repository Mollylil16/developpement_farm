/**
 * Gestion d'erreurs spécifique pour le module Finance
 * Fournit des messages d'erreur contextuels et utiles pour l'utilisateur
 */

import { APIError } from '../services/api/apiError';

export interface FinanceErrorDetails {
  type: 'validation' | 'network' | 'server' | 'calculation' | 'permission' | 'unknown';
  message: string;
  originalError?: unknown;
  statusCode?: number;
}

/**
 * Obtient un message d'erreur contextuel pour les erreurs Finance
 */
export function getFinanceErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return getFinanceErrorFromAPIError(error);
  }

  if (error instanceof Error) {
    // Messages de validation
    if (error.message.includes('montant')) {
      return `Erreur de montant : ${error.message}`;
    }
    if (error.message.includes('poids')) {
      return `Erreur de poids : ${error.message}`;
    }
    if (error.message.includes('marge')) {
      return `Erreur de calcul de marge : ${error.message}`;
    }
    if (error.message.includes('categorie')) {
      return `Erreur de catégorie : ${error.message}`;
    }
    
    // Erreurs réseau
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Problème de connexion réseau. Vérifiez votre connexion Internet et réessayez.';
    }
    
    // Autres erreurs
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Une erreur inattendue s\'est produite lors de l\'opération financière.';
}

/**
 * Obtient un message d'erreur à partir d'une APIError
 */
function getFinanceErrorFromAPIError(error: APIError): string {
  switch (error.status) {
    case 400:
      // Erreur de validation backend
      if (error.data && typeof error.data === 'object' && 'message' in error.data) {
        return String(error.data.message);
      }
      return 'Les données fournies sont invalides. Vérifiez les montants et autres informations saisies.';
    
    case 401:
      return 'Vous n\'êtes pas autorisé à effectuer cette opération. Veuillez vous reconnecter.';
    
    case 403:
      return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette opération.';
    
    case 404:
      // Ressource non trouvée
      if (error.message.includes('revenu') || error.message.includes('vente')) {
        return 'Cette vente n\'existe pas ou a été supprimée.';
      }
      if (error.message.includes('charge') || error.message.includes('dépense')) {
        return 'Cet élément financier n\'existe pas ou a été supprimé.';
      }
      return 'L\'élément recherché n\'existe pas.';
    
    case 409:
      return 'Un conflit a été détecté. Les données ont peut-être été modifiées par un autre utilisateur.';
    
    case 422:
      return 'Les données fournies ne respectent pas les règles de validation. Vérifiez les montants et autres champs.';
    
    case 429:
      return 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.';
    
    case 500:
    case 502:
    case 503:
      return 'Le serveur rencontre des difficultés. Veuillez réessayer dans quelques instants.';
    
    case 0:
      // Erreur réseau (pas de statut HTTP)
      return 'Problème de connexion réseau. Vérifiez votre connexion Internet et réessayez.';
    
    default:
      if (error.data && typeof error.data === 'object' && 'message' in error.data) {
        return String(error.data.message);
      }
      return `Erreur serveur (${error.status}). Veuillez réessayer plus tard.`;
  }
}

/**
 * Détecte le type d'erreur Finance
 */
export function getFinanceErrorType(error: unknown): FinanceErrorDetails['type'] {
  if (error instanceof APIError) {
    if (error.status === 400 || error.status === 422) {
      return 'validation';
    }
    if (error.status === 401 || error.status === 403) {
      return 'permission';
    }
    if (error.status === 500 || error.status === 502 || error.status === 503) {
      return 'server';
    }
    if (error.status === 0) {
      return 'network';
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('montant') || error.message.includes('poids') || error.message.includes('marge')) {
      return 'validation';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network';
    }
    if (error.message.includes('calcul') || error.message.includes('marge')) {
      return 'calculation';
    }
  }

  return 'unknown';
}

/**
 * Obtient les détails complets d'une erreur Finance
 */
export function getFinanceErrorDetails(error: unknown): FinanceErrorDetails {
  const type = getFinanceErrorType(error);
  const message = getFinanceErrorMessage(error);

  return {
    type,
    message,
    originalError: error,
    statusCode: error instanceof APIError ? error.status : undefined,
  };
}
