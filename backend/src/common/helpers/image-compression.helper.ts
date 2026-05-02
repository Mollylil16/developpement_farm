/**
 * Helper pour compresser automatiquement les images dans les DTOs
 * Utilise ImageService pour compresser les images base64 avant stockage
 */

import { ImageService } from '../services/image.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('ImageCompressionHelper');

/**
 * Compresse un tableau d'images base64
 * @param images Array d'images base64 (peut être string[] ou null/undefined)
 * @param imageService Instance de ImageService
 * @param options Options de compression
 * @returns Array d'images compressées en base64
 */
export async function compressImagesArray(
  images: string[] | null | undefined,
  imageService: ImageService,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string[] | null> {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  const { maxWidth = 1920, maxHeight = 1920, quality = 80 } = options;

  try {
    const compressedImages = await Promise.all(
      images.map(async (image) => {
        // Si l'image est déjà compressée ou trop petite, la retourner telle quelle
        if (!image || typeof image !== 'string') {
          return image;
        }

        // Vérifier si c'est une image base64 valide
        if (!image.startsWith('data:image/')) {
          // Si ce n'est pas une image base64, retourner telle quelle (peut être une URL)
          return image;
        }

        try {
          // Compresser l'image
          const result = await imageService.compressImageFromBase64(image, {
            maxWidth,
            maxHeight,
            quality,
            format: 'auto',
          });

          // Convertir en base64 avec préfixe data URI
          return imageService.compressedImageToBase64(result);
        } catch (error: any) {
          logger.warn(`Erreur lors de la compression d'une image: ${error.message}`);
          // En cas d'erreur, retourner l'image originale
          return image;
        }
      })
    );

    return compressedImages;
  } catch (error: any) {
    logger.error(`Erreur lors de la compression du tableau d'images: ${error.message}`);
    // En cas d'erreur globale, retourner les images originales
    return images;
  }
}

/**
 * Compresse une image base64 unique
 * @param image Image base64 (peut être string ou null/undefined)
 * @param imageService Instance de ImageService
 * @param options Options de compression
 * @returns Image compressée en base64
 */
export async function compressImage(
  image: string | null | undefined,
  imageService: ImageService,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string | null> {
  if (!image || typeof image !== 'string') {
    return image || null;
  }

  // Si ce n'est pas une image base64, retourner telle quelle (peut être une URL)
  if (!image.startsWith('data:image/')) {
    return image;
  }

  const { maxWidth = 1920, maxHeight = 1920, quality = 80 } = options;

  try {
    const result = await imageService.compressImageFromBase64(image, {
      maxWidth,
      maxHeight,
      quality,
      format: 'auto',
    });

    return imageService.compressedImageToBase64(result);
  } catch (error: any) {
    logger.warn(`Erreur lors de la compression d'image: ${error.message}`);
    // En cas d'erreur, retourner l'image originale
    return image;
  }
}

