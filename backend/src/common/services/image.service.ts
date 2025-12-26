import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageCompressionOptions {
  /** Qualité JPEG/WebP (1-100, défaut: 80) */
  quality?: number;
  /** Largeur maximale en pixels (conserve le ratio) */
  maxWidth?: number;
  /** Hauteur maximale en pixels (conserve le ratio) */
  maxHeight?: number;
  /** Format de sortie ('jpeg', 'webp', 'png', ou 'auto' pour détecter automatiquement) */
  format?: 'jpeg' | 'webp' | 'png' | 'auto';
  /** Créer un thumbnail carré de cette taille (en pixels) */
  thumbnailSize?: number;
}

export interface CompressedImageResult {
  /** Image compressée comme Buffer */
  buffer: Buffer;
  /** Format de l'image résultante */
  format: string;
  /** Métadonnées de l'image (width, height, size) */
  metadata: {
    width: number;
    height: number;
    size: number; // taille en bytes
  };
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  /**
   * Compresse une image depuis un Buffer
   * @param inputBuffer Buffer de l'image source
   * @param options Options de compression
   * @returns Image compressée avec métadonnées
   */
  async compressImage(
    inputBuffer: Buffer,
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImageResult> {
    try {
      const {
        quality = 80,
        maxWidth,
        maxHeight,
        format = 'auto',
      } = options;

      // Détecter le format de l'image source
      const inputMetadata = await sharp(inputBuffer).metadata();
      const inputFormat = inputMetadata.format;

      if (!inputFormat || !['jpeg', 'png', 'webp'].includes(inputFormat)) {
        throw new BadRequestException(
          `Format d'image non supporté: ${inputFormat}. Formats supportés: JPEG, PNG, WebP`
        );
      }

      // Déterminer le format de sortie
      const outputFormat = format === 'auto' ? inputFormat : format;

      // Créer un pipeline Sharp avec resize si nécessaire
      let pipeline = sharp(inputBuffer);

      // Redimensionner si maxWidth ou maxHeight est spécifié
      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside', // Conserve le ratio, s'assure que l'image rentre dans les dimensions
          withoutEnlargement: true, // Ne pas agrandir si l'image est plus petite
        });
      }

      // Appliquer la compression selon le format
      switch (outputFormat) {
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true }); // mozjpeg pour meilleure compression
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 }); // compressionLevel 9 pour meilleure compression
          break;
      }

      // Générer l'image compressée
      const compressedBuffer = await pipeline.toBuffer();
      const outputMetadata = await sharp(compressedBuffer).metadata();

      const result: CompressedImageResult = {
        buffer: compressedBuffer,
        format: outputFormat,
        metadata: {
          width: outputMetadata.width || inputMetadata.width || 0,
          height: outputMetadata.height || inputMetadata.height || 0,
          size: compressedBuffer.length,
        },
      };

      const compressionRatio =
        ((inputBuffer.length - compressedBuffer.length) / inputBuffer.length) * 100;
      this.logger.debug(
        `Image compressée: ${inputBuffer.length} bytes → ${compressedBuffer.length} bytes (${compressionRatio.toFixed(1)}% réduction)`
      );

      return result;
    } catch (error: any) {
      this.logger.error('Erreur lors de la compression d\'image', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la compression d'image: ${error.message}`);
    }
  }

  /**
   * Compresse une image depuis une chaîne base64
   * @param base64Image Image en base64 (avec ou sans préfixe data:image/...)
   * @param options Options de compression
   * @returns Image compressée avec métadonnées
   */
  async compressImageFromBase64(
    base64Image: string,
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImageResult> {
    try {
      // Extraire le base64 pur (enlever le préfixe data:image/... si présent)
      const base64Data = base64Image.includes(',')
        ? base64Image.split(',')[1]
        : base64Image;

      // Convertir base64 en Buffer
      const inputBuffer = Buffer.from(base64Data, 'base64');

      return await this.compressImage(inputBuffer, options);
    } catch (error: any) {
      this.logger.error('Erreur lors de la conversion base64 → Buffer', error);
      throw new BadRequestException(`Image base64 invalide: ${error.message}`);
    }
  }

  /**
   * Génère un thumbnail carré d'une image
   * @param inputBuffer Buffer de l'image source
   * @param size Taille du thumbnail (largeur et hauteur en pixels, défaut: 200)
   * @param quality Qualité (1-100, défaut: 75)
   * @returns Thumbnail compressé
   */
  async generateThumbnail(
    inputBuffer: Buffer,
    size: number = 200,
    quality: number = 75
  ): Promise<CompressedImageResult> {
    try {
      const thumbnailBuffer = await sharp(inputBuffer)
        .resize(size, size, {
          fit: 'cover', // Remplir le carré en coupant si nécessaire
          position: 'center', // Centrer l'image
        })
        .webp({ quality }) // Utiliser WebP pour les thumbnails (meilleure compression)
        .toBuffer();

      const metadata = await sharp(thumbnailBuffer).metadata();

      return {
        buffer: thumbnailBuffer,
        format: 'webp',
        metadata: {
          width: metadata.width || size,
          height: metadata.height || size,
          size: thumbnailBuffer.length,
        },
      };
    } catch (error: any) {
      this.logger.error('Erreur lors de la génération du thumbnail', error);
      throw new BadRequestException(`Erreur lors de la génération du thumbnail: ${error.message}`);
    }
  }

  /**
   * Génère un thumbnail depuis une image base64
   * @param base64Image Image en base64
   * @param size Taille du thumbnail (défaut: 200)
   * @param quality Qualité (défaut: 75)
   * @returns Thumbnail compressé
   */
  async generateThumbnailFromBase64(
    base64Image: string,
    size: number = 200,
    quality: number = 75
  ): Promise<CompressedImageResult> {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const inputBuffer = Buffer.from(base64Data, 'base64');
    return await this.generateThumbnail(inputBuffer, size, quality);
  }

  /**
   * Convertit une image compressée en base64 avec préfixe data URI
   * @param result Résultat de compression
   * @returns Chaîne base64 avec préfixe data:image/...
   */
  compressedImageToBase64(result: CompressedImageResult): string {
    const mimeType = result.format === 'webp' ? 'image/webp' : `image/${result.format}`;
    const base64 = result.buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Valide qu'un Buffer est une image valide
   * @param buffer Buffer à valider
   * @returns true si l'image est valide
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!metadata.format && !!metadata.width && !!metadata.height;
    } catch {
      return false;
    }
  }

  /**
   * Obtient les métadonnées d'une image sans la décoder
   * @param buffer Buffer de l'image
   * @returns Métadonnées (format, width, height, size)
   */
  async getImageMetadata(buffer: Buffer): Promise<{
    format: string;
    width: number;
    height: number;
    size: number;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        format: metadata.format || 'unknown',
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
      };
    } catch (error: any) {
      this.logger.error('Erreur lors de la lecture des métadonnées', error);
      throw new BadRequestException(`Image invalide: ${error.message}`);
    }
  }
}

