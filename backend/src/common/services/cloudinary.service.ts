import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary configuré avec succès');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Cloudinary non configuré - les photos seront stockées localement. ' +
        'Variables manquantes: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
      );
    }
  }

  /**
   * Vérifie si Cloudinary est configuré
   */
  isCloudinaryConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload une image de profil vers Cloudinary
   */
  async uploadProfilePhoto(
    fileBuffer: Buffer,
    userId: string,
    options?: { folder?: string; width?: number; height?: number }
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Cloudinary non configuré. Veuillez configurer les variables d\'environnement.'
      );
    }

    const folder = options?.folder || 'farmtrack-pro/profile-photos';
    const width = options?.width || 500;
    const height = options?.height || 500;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `user_${userId}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            {
              width,
              height,
              crop: 'fill',
              gravity: 'face', // Centre sur le visage si détecté
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Erreur upload Cloudinary: ${error.message}`, error);
            reject(new BadRequestException(`Erreur lors de l'upload: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Résultat d\'upload vide'));
            return;
          }

          this.logger.log(`Photo uploadée sur Cloudinary: ${result.public_id}`);

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      // Envoyer le buffer au stream
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Upload une image de marketplace vers Cloudinary
   */
  async uploadMarketplacePhoto(
    fileBuffer: Buffer,
    listingId: string,
    photoIndex: number,
    options?: { folder?: string }
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Cloudinary non configuré. Veuillez configurer les variables d\'environnement.'
      );
    }

    const folder = options?.folder || 'farmtrack-pro/marketplace';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `listing_${listingId}_photo_${photoIndex}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            {
              width: 1200,
              height: 900,
              crop: 'limit', // Garde l'aspect ratio, limite à max dimensions
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
          eager: [
            // Générer aussi une miniature
            {
              width: 300,
              height: 225,
              crop: 'fill',
              quality: 'auto:eco',
            },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Erreur upload Cloudinary marketplace: ${error.message}`, error);
            reject(new BadRequestException(`Erreur lors de l'upload: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Résultat d\'upload vide'));
            return;
          }

          this.logger.log(`Photo marketplace uploadée sur Cloudinary: ${result.public_id}`);

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Supprime une image de Cloudinary par son public_id
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Cloudinary non configuré - suppression ignorée');
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        this.logger.log(`Image supprimée de Cloudinary: ${publicId}`);
        return true;
      } else {
        this.logger.warn(`Suppression Cloudinary échouée pour ${publicId}: ${result.result}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur suppression Cloudinary: ${publicId}`, error);
      return false;
    }
  }

  /**
   * Extrait le public_id depuis une URL Cloudinary
   */
  extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;

      // Enlever la version (vXXXXXX/) si présente
      let pathPart = parts[1];
      if (pathPart.startsWith('v')) {
        const versionEnd = pathPart.indexOf('/');
        if (versionEnd > 0) {
          pathPart = pathPart.substring(versionEnd + 1);
        }
      }

      // Enlever l'extension
      const lastDot = pathPart.lastIndexOf('.');
      if (lastDot > 0) {
        pathPart = pathPart.substring(0, lastDot);
      }

      return pathPart;
    } catch (error) {
      this.logger.error(`Erreur extraction public_id depuis URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Génère une URL optimisée pour une image Cloudinary
   */
  getOptimizedUrl(
    publicId: string,
    options?: { width?: number; height?: number; crop?: string }
  ): string {
    if (!this.isConfigured) {
      return '';
    }

    return cloudinary.url(publicId, {
      secure: true,
      width: options?.width || 500,
      height: options?.height || 500,
      crop: options?.crop || 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }
}
