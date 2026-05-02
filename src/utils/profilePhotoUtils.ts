/**
 * Utilitaires pour la gestion des URIs de photos de profil
 * Gère la différenciation entre URIs locales et URLs serveur
 * Fournit des fonctions pour normaliser et ajouter du cache busting
 */

/**
 * Vérifie si une URI est locale (file://, content://, ph://, etc.)
 * @param uri - URI à vérifier
 * @returns true si l'URI est locale, false sinon
 */
export function isLocalUri(uri: string | null): boolean {
  if (!uri) return false;
  
  // Liste des schémas d'URI locaux courants
  const localSchemes = [
    'file://',
    'content://',
    'ph://',
    'assets-library://',
    'ph-asset://',
  ];
  
  return localSchemes.some(scheme => uri.toLowerCase().startsWith(scheme));
}

/**
 * Vérifie si une URI est une URL serveur (http://, https://)
 * @param uri - URI à vérifier
 * @returns true si l'URI est une URL serveur, false sinon
 */
export function isServerUrl(uri: string | null): boolean {
  if (!uri) return false;
  
  const normalized = uri.toLowerCase().trim();
  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

/**
 * Normalise une URI de photo en retirant les paramètres de cache busting
 * Retourne null si l'URI est locale (car les URIs locales ne doivent pas être comparées)
 * 
 * @param uri - URI à normaliser
 * @returns URL serveur normalisée (sans paramètres de cache) ou null si URI locale
 * 
 * @example
 * normalizePhotoUri('http://example.com/photo.jpg?_t=123456') // 'http://example.com/photo.jpg'
 * normalizePhotoUri('file:///path/to/photo.jpg') // null
 * normalizePhotoUri(null) // null
 */
export function normalizePhotoUri(uri: string | null): string | null {
  if (!uri) return null;
  
  // Si c'est une URI locale, retourner null (ne pas comparer les URIs locales)
  if (isLocalUri(uri)) {
    return null;
  }
  
  // Si c'est une URL serveur, retirer les paramètres de cache busting
  if (isServerUrl(uri)) {
    // Retirer tous les paramètres de requête (tout ce qui suit le ?)
    return uri.split('?')[0];
  }
  
  // URI inconnue ou invalide, retourner null
  return null;
}

/**
 * Ajoute un paramètre de cache busting à une URL serveur
 * Ne fait rien si l'URI est locale (les URIs locales n'ont pas besoin de cache busting)
 * 
 * @param uri - URI à modifier
 * @returns URI avec cache busting (si URL serveur) ou URI originale (si locale)
 * 
 * @example
 * addCacheBusting('http://example.com/photo.jpg') // 'http://example.com/photo.jpg?_t=1234567890'
 * addCacheBusting('file:///path/to/photo.jpg') // 'file:///path/to/photo.jpg' (inchangé)
 */
export function addCacheBusting(uri: string | null): string | null {
  if (!uri) return null;
  
  // Ne pas ajouter de cache busting aux URIs locales
  if (isLocalUri(uri)) {
    return uri;
  }
  
  // Ajouter cache busting uniquement aux URLs serveur
  if (isServerUrl(uri)) {
    const timestamp = Date.now();
    
    // Extraire l'URL de base sans les paramètres existants
    const baseUrl = uri.split('?')[0];
    const existingParams = uri.includes('?') ? uri.substring(uri.indexOf('?') + 1) : '';
    const params = new URLSearchParams(existingParams);
    
    // Mettre à jour ou ajouter le paramètre _t (timestamp) pour forcer le rechargement
    params.set('_t', timestamp.toString());
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  // URI inconnue, retourner telle quelle
  return uri;
}

/**
 * Compare deux URIs de photo en ignorant les paramètres de cache busting
 * Retourne true si les URLs serveur sont identiques (sans paramètres)
 * Retourne false si l'une ou les deux sont des URIs locales (ne pas comparer)
 * 
 * @param uri1 - Première URI à comparer
 * @param uri2 - Deuxième URI à comparer
 * @returns true si les URLs serveur sont identiques, false sinon
 * 
 * @example
 * comparePhotoUris('http://example.com/photo.jpg?_t=123', 'http://example.com/photo.jpg?_t=456') // true
 * comparePhotoUris('file:///path/to/photo.jpg', 'http://example.com/photo.jpg') // false
 * comparePhotoUris(null, null) // true
 */
export function comparePhotoUris(uri1: string | null, uri2: string | null): boolean {
  // Si les deux sont null, elles sont considérées comme identiques
  if (!uri1 && !uri2) return true;
  
  // Si l'une est null et l'autre non, elles sont différentes
  if (!uri1 || !uri2) return false;
  
  // Normaliser les deux URIs (retourne null pour les URIs locales)
  const normalized1 = normalizePhotoUri(uri1);
  const normalized2 = normalizePhotoUri(uri2);
  
  // Si l'une ou les deux sont des URIs locales, ne pas comparer
  if (normalized1 === null || normalized2 === null) {
    return false;
  }
  
  // Comparer les URLs serveur normalisées
  return normalized1 === normalized2;
}
