/**
 * Classe d'erreur personnalisée pour les erreurs API
 * Définie dans un fichier séparé pour éviter les cycles de dépendances
 */

export class APIError extends Error {
  // Propriétés publiques utilisées par les consommateurs de l'erreur
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;

    // Maintenir la chaîne de prototype correcte pour les vérifications instanceof
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

