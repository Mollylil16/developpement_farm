/**
 * Utilitaires pour la gestion des photos des animaux
 * Version simplifiée et fonctionnelle
 */

// Utiliser l'API legacy pour éviter les avertissements de dépréciation
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from './logger';

// Dossier de stockage des photos d'animaux
const PHOTOS_DIRECTORY = `${FileSystem.documentDirectory}animal_photos/`;

/**
 * Générer un UUID simple
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Initialiser le dossier de stockage des photos
 */
const initPhotosDirectory = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
      logger.debug('Dossier photos créé:', PHOTOS_DIRECTORY);
    }
  } catch (error) {
    logger.error('Erreur création dossier photos:', error);
    // Ne pas lancer d'erreur, juste logger
  }
};

/**
 * Sauvegarder une photo dans le stockage permanent
 * VERSION SIMPLE - Comme dans CORRECTION_PERSISTANCE_PHOTOS.md
 * @param sourceUri URI de la photo source (temporaire)
 * @returns URI permanente de la photo
 */
export const savePhotoToAppStorage = async (sourceUri: string): Promise<string> => {
  try {
    // Initialiser le dossier si nécessaire
    await initPhotosDirectory();

    // Si c'est déjà une photo permanente, la retourner telle quelle
    if (sourceUri.startsWith(PHOTOS_DIRECTORY)) {
      return sourceUri;
    }

    // Créer un nom unique avec UUID
    const uuid = generateUUID();
    const filename = `animal_${uuid}.jpg`;
    const destUri = PHOTOS_DIRECTORY + filename;

    // Copier la photo
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    logger.debug('Photo sauvegardée:', destUri);
    return destUri;
  } catch (error) {
    logger.error('Erreur sauvegarde photo:', error);
    throw error;
  }
};

/**
 * Supprimer une photo du stockage
 * @param photoUri URI de la photo à supprimer
 */
export const deletePhotoFromStorage = async (photoUri: string): Promise<void> => {
  try {
    // Ne supprimer que si c'est une photo dans notre dossier
    if (!photoUri.startsWith(PHOTOS_DIRECTORY)) {
      return;
    }

    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(photoUri);
      logger.debug('Photo supprimée:', photoUri);
    }
  } catch (error) {
    logger.error('Erreur suppression photo:', error);
  }
};

/**
 * Vérifier si une photo existe
 * @param photoUri URI de la photo
 * @returns true si la photo existe
 */
export const photoExists = async (photoUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    return fileInfo.exists;
  } catch {
    return false;
  }
};

/**
 * Nettoyer les photos orphelines (photos d'animaux supprimés)
 * @param activePhotoUris Liste des URIs de photos actuellement utilisées
 */
export const cleanupOrphanedPhotos = async (activePhotoUris: string[]): Promise<void> => {
  try {
    // Vérifier si le dossier existe
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
    if (!dirInfo.exists) {
      logger.debug("Dossier photos n'existe pas encore");
      return;
    }

    // Lister toutes les photos dans le dossier
    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIRECTORY);
    logger.debug(`${files.length} photos trouvées dans le dossier`);

    // Filtrer les photos orphelines
    const orphanedFiles = files.filter((filename) => {
      const fullPath = PHOTOS_DIRECTORY + filename;
      return !activePhotoUris.includes(fullPath);
    });

    logger.debug(`${orphanedFiles.length} photos orphelines à supprimer`);

    // Supprimer les photos orphelines
    for (const filename of orphanedFiles) {
      try {
        await FileSystem.deleteAsync(PHOTOS_DIRECTORY + filename, { idempotent: true });
        logger.debug('Photo orpheline supprimée:', filename);
      } catch (error) {
        logger.warn('Erreur suppression photo orpheline:', filename, error);
      }
    }

    logger.debug('Nettoyage des photos orphelines terminé');
  } catch (error) {
    logger.error('Erreur nettoyage photos orphelines:', error);
  }
};

/**
 * Obtenir la taille totale du dossier photos (en octets)
 */
export const getPhotoStorageSize = async (): Promise<number> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIRECTORY);
    let totalSize = 0;

    for (const filename of files) {
      const fileInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY + filename);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size || 0;
      }
    }

    return totalSize;
  } catch (error) {
    logger.error('Erreur calcul taille stockage:', error);
    return 0;
  }
};

/**
 * Formater la taille en Mo
 */
export const formatStorageSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} Mo`;
};
