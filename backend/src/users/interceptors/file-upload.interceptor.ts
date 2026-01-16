import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

/**
 * Types MIME autorisés pour les photos de profil
 * Constante partagée pour éviter la duplication
 */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Sanitise un identifiant utilisateur pour prévenir path traversal
 * @param userId - Identifiant utilisateur à sanitiser
 * @returns Identifiant sanitisé (alphanumérique, underscore, tiret uniquement)
 */
function sanitizeUserId(userId: string): string {
  // Retirer tous les caractères non autorisés (alphanumérique, underscore, tiret)
  // Prévenir path traversal en retirant ../, ./, etc.
  return userId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100); // Limiter la longueur
}

/**
 * Sanitise une extension de fichier
 * @param ext - Extension à sanitiser (avec ou sans point)
 * @returns Extension sanitisée (alphanumérique uniquement, max 10 caractères)
 */
function sanitizeExtension(ext: string): string {
  // Retirer le point initial si présent
  const cleanExt = ext.replace(/^\./, '');
  // Garder seulement les caractères alphanumériques, limiter à 10 caractères
  const sanitized = cleanExt.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  return sanitized ? `.${sanitized}` : '.jpg'; // Fallback vers .jpg si vide
}

/**
 * Interceptor pour valider et configurer l'upload de photos de profil
 */
export const ProfilePhotoInterceptor = FileInterceptor('photo', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Utiliser un chemin absolu pour éviter les problèmes de résolution de chemin
      const uploadsDir = join(process.cwd(), 'uploads', 'profile-photos');
      
      // S'assurer que le dossier existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // SÉCURITÉ: Sanitiser userId et extension pour prévenir path traversal
      const userId = req.params.id;
      const safeUserId = sanitizeUserId(userId || 'unknown');
      const timestamp = Date.now();
      const originalExt = extname(file.originalname);
      const safeExt = sanitizeExtension(originalExt);
      
      // Générer un nom unique sécurisé : userId_timestamp.ext
      const filename = `${safeUserId}_${timestamp}${safeExt}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Vérifier le type MIME
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Format de fichier non supporté. Formats acceptés: JPG, JPEG, PNG, WEBP'
        ),
        false
      );
    }
  },
});

/**
 * Interceptor personnalisé pour valider le fichier après l'upload
 */
@Injectable()
export class ProfilePhotoValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier la taille (déjà fait par multer, mais double vérification)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Le fichier est trop volumineux (max 5MB)');
    }

    // Vérifier le type MIME (utiliser la constante partagée)
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format de fichier non supporté. Formats acceptés: JPG, JPEG, PNG, WEBP'
      );
    }

    return next.handle();
  }
}
