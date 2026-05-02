/**
 * Service de gestion de la connectivité réseau
 * Détecte si l'appareil est en ligne/hors ligne
 */

// Platform non utilisé directement mais peut être utile pour des vérifications futures

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type?: string;
}

let networkState: NetworkState = {
  isConnected: true, // Par défaut, supposé connecté
  isInternetReachable: true,
};

/**
 * Vérifie si l'appareil est connecté à Internet
 * Version simplifiée sans dépendance externe
 */
export async function checkNetworkConnectivity(): Promise<NetworkState> {
  try {
    // Tentative de ping vers un serveur fiable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Utiliser response pour vérifier le statut (même si no-cors ne permet pas de lire le statut)
    // La simple réussite de la requête indique la connectivité
    const isConnected = response !== null && response !== undefined;

    networkState = {
      isConnected,
      isInternetReachable: isConnected,
    };

    return networkState;
  } catch (error) {
    // Utiliser error pour logger et déterminer le type d'erreur
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const isAbortError = errorMessage.includes('abort') || errorMessage.includes('Abort');
    
    networkState = {
      isConnected: false,
      isInternetReachable: false,
      type: isAbortError ? 'timeout' : 'error',
    };

    return networkState;
  }
}

/**
 * Vérifie si l'appareil est connecté (version synchrone)
 */
export function isNetworkConnected(): boolean {
  return networkState.isConnected;
}

/**
 * Met à jour l'état du réseau
 */
export function updateNetworkState(state: NetworkState): void {
  networkState = state;
}

/**
 * Récupère l'état actuel du réseau
 */
export function getNetworkState(): NetworkState {
  return { ...networkState };
}
