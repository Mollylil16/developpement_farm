/**
 * Utilitaire pour nettoyer le mode local et s'assurer que l'application fonctionne en ligne
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_MODE_KEY = '@fermier_pro:sync_mode';
const SYNC_QUEUE_KEY = '@fermier_pro:sync_queue';

/**
 * Nettoie toutes les clés liées au mode local/synchronisation
 */
export async function clearLocalMode(): Promise<void> {
  try {
    // Supprimer les clés de synchronisation si elles existent
    await AsyncStorage.multiRemove([SYNC_MODE_KEY, SYNC_QUEUE_KEY]);
    console.log('✅ Mode local désactivé - clés AsyncStorage nettoyées');
  } catch (error) {
    console.error('Erreur lors du nettoyage du mode local:', error);
  }
}

/**
 * Vérifie si le mode local est activé
 */
export async function isLocalModeActive(): Promise<boolean> {
  try {
    const syncMode = await AsyncStorage.getItem(SYNC_MODE_KEY);
    return syncMode === 'local';
  } catch {
    return false;
  }
}

