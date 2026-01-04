/**
 * Configuration Gemini pour l'agent conversationnel
 * 
 * Cette configuration peut être fournie via :
 * 1. Variables d'environnement (EXPO_PUBLIC_GEMINI_API_KEY)
 * 2. AsyncStorage (pour stockage sécurisé côté client)
 * 
 * Note: L'agent fonctionne sans Gemini en utilisant Jaccard comme fallback
 */

/**
 * Configuration Gemini par défaut
 * 
 * Pour utiliser Gemini :
 * 1. Obtenez une clé API sur https://makersuite.google.com/app/apikey
 * 2. Définissez EXPO_PUBLIC_GEMINI_API_KEY dans votre .env
 * 3. Ou utilisez saveGeminiConfig() pour stocker la clé dans AsyncStorage
 */
export const GEMINI_CONFIG = {
  /**
   * Clé API Gemini
   * Peut être définie via :
   * - Variable d'environnement: EXPO_PUBLIC_GEMINI_API_KEY
   * - AsyncStorage: 'GEMINI_API_KEY'
   * 
   * Si null/undefined, l'agent utilisera Jaccard comme fallback
   */
  apiKey: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) || null,
  
  /**
   * Modèle Gemini à utiliser
   * Utilisé pour la classification d'intention et l'extraction de paramètres
   */
  model: 'gemini-2.5-flash' as const,
} as const;

/**
 * Récupère la configuration Gemini depuis AsyncStorage (asynchrone)
 * Utilisez cette fonction si vous stockez la clé dans AsyncStorage
 * 
 * @returns Configuration avec apiKey depuis AsyncStorage
 */
export async function getGeminiConfig(): Promise<{ apiKey: string | null; model: string }> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const apiKey = await AsyncStorage.getItem('GEMINI_API_KEY');
    return {
      apiKey,
      model: GEMINI_CONFIG.model,
    };
  } catch (error) {
    console.error('Erreur récupération clé Gemini depuis AsyncStorage:', error);
    return {
      apiKey: GEMINI_CONFIG.apiKey,
      model: GEMINI_CONFIG.model,
    };
  }
}

/**
 * Sauvegarde la clé API Gemini dans AsyncStorage
 * 
 * @param apiKey - Clé API Gemini à sauvegarder
 */
export async function saveGeminiConfig(apiKey: string): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('GEMINI_API_KEY', apiKey);
  } catch (error) {
    console.error('Erreur sauvegarde clé Gemini:', error);
    throw error;
  }
}

/**
 * Supprime la clé API Gemini d'AsyncStorage
 */
export async function clearGeminiConfig(): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('GEMINI_API_KEY');
  } catch (error) {
    console.error('Erreur suppression clé Gemini:', error);
  }
}

