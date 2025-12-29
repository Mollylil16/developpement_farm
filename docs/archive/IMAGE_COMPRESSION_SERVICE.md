# Service de Compression d'Images

**Date:** 2025-01-XX  
**Service:** `ImageService` dans `backend/src/common/services/image.service.ts`  
**Bibliothèque:** Sharp (optimisée pour Node.js)

---

## 📋 Vue d'Ensemble

Le service `ImageService` fournit des fonctionnalités de compression et d'optimisation d'images pour réduire la taille des fichiers, améliorer les performances de chargement et économiser le stockage.

### Fonctionnalités

- ✅ Compression d'images (JPEG, PNG, WebP)
- ✅ Redimensionnement automatique (conserve le ratio)
- ✅ Génération de thumbnails carrés
- ✅ Conversion base64 ↔ Buffer
- ✅ Détection automatique du format
- ✅ Validation d'images
- ✅ Métadonnées d'images

---

## 🚀 Utilisation

### Installation

Le service est déjà disponible globalement grâce au `CommonModule`. Aucune installation supplémentaire nécessaire si `sharp` est installé.

### Injection du Service

```typescript
import { Injectable } from '@nestjs/common';
import { ImageService } from '../common/services/image.service';

@Injectable()
export class MonService {
  constructor(private imageService: ImageService) {}
  
  // Utiliser le service...
}
```

---

## 📖 Exemples d'Utilisation

### 1. Compresser une Image depuis un Buffer

```typescript
import { ImageService } from '../common/services/image.service';

@Injectable()
export class MonService {
  constructor(private imageService: ImageService) {}

  async compresserImage(fichierBuffer: Buffer) {
    const result = await this.imageService.compressImage(fichierBuffer, {
      quality: 80,        // Qualité 1-100 (défaut: 80)
      maxWidth: 1920,     // Largeur maximale (optionnel)
      maxHeight: 1080,    // Hauteur maximale (optionnel)
      format: 'webp',     // 'jpeg', 'webp', 'png', ou 'auto' (défaut: 'auto')
    });

    // result.buffer contient l'image compressée
    // result.metadata contient width, height, size
    // result.format contient le format final
    
    return result.buffer;
  }
}
```

### 2. Compresser une Image depuis Base64

```typescript
async compresserImageBase64(base64Image: string) {
  const result = await this.imageService.compressImageFromBase64(base64Image, {
    quality: 85,
    maxWidth: 1600,
    format: 'webp', // Convertir en WebP pour meilleure compression
  });

  // Convertir le résultat en base64 pour le retourner
  const compressedBase64 = this.imageService.compressedImageToBase64(result);
  return compressedBase64;
}
```

### 3. Générer un Thumbnail

```typescript
async genererThumbnail(imageBuffer: Buffer) {
  const thumbnail = await this.imageService.generateThumbnail(
    imageBuffer,
    200,  // Taille (200x200 pixels)
    75    // Qualité (75%)
  );

  // thumbnail.buffer contient le thumbnail WebP 200x200
  return thumbnail.buffer;
}
```

### 4. Utilisation avec Upload Multer (Exemple Futur)

```typescript
import { Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from '../common/services/image.service';

@Controller('photos')
export class PhotosController {
  constructor(private imageService: ImageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    // Valider que c'est une image
    const isValid = await this.imageService.validateImage(file.buffer);
    if (!isValid) {
      throw new BadRequestException('Fichier invalide: image attendue');
    }

    // Compresser l'image originale
    const compressed = await this.imageService.compressImage(file.buffer, {
      quality: 85,
      maxWidth: 1920,
      format: 'webp',
    });

    // Générer un thumbnail
    const thumbnail = await this.imageService.generateThumbnail(file.buffer, 200, 75);

    // Stocker compressed.buffer et thumbnail.buffer
    // (ex: dans S3, Cloudinary, ou système de fichiers)

    return {
      originalSize: file.size,
      compressedSize: compressed.metadata.size,
      thumbnailSize: thumbnail.metadata.size,
      compressionRatio: ((file.size - compressed.metadata.size) / file.size * 100).toFixed(1) + '%',
    };
  }
}
```

### 5. Utilisation avec le Module AI-Weight (Base64)

```typescript
import { ImageService } from '../common/services/image.service';

@Injectable()
export class AiWeightService {
  constructor(private imageService: ImageService) {}

  async processImageForAI(base64Image: string) {
    // Compresser l'image avant d'envoyer au modèle IA
    // (réduit la bande passante et le temps de traitement)
    const compressed = await this.imageService.compressImageFromBase64(base64Image, {
      quality: 90,        // Haute qualité pour l'IA
      maxWidth: 1280,     // Limiter la résolution
      format: 'jpeg',     // JPEG pour compatibilité
    });

    // Convertir en base64 pour l'API IA
    const compressedBase64 = compressed.buffer.toString('base64');
    
    // Envoyer au modèle IA...
    return await this.sendToAIModel(compressedBase64);
  }
}
```

---

## ⚙️ Options de Compression

### `ImageCompressionOptions`

```typescript
interface ImageCompressionOptions {
  /** Qualité JPEG/WebP (1-100, défaut: 80) */
  quality?: number;
  
  /** Largeur maximale en pixels (conserve le ratio) */
  maxWidth?: number;
  
  /** Hauteur maximale en pixels (conserve le ratio) */
  maxHeight?: number;
  
  /** Format de sortie ('jpeg', 'webp', 'png', ou 'auto' pour détecter automatiquement) */
  format?: 'jpeg' | 'webp' | 'png' | 'auto';
  
  /** Créer un thumbnail carré de cette taille (en pixels) */
  thumbnailSize?: number; // Non utilisé actuellement, utiliser generateThumbnail()
}
```

### Recommandations de Qualité

- **Thumbnails** : 70-75 (petites images, chargement rapide)
- **Images web normales** : 80-85 (bon équilibre qualité/taille)
- **Images haute qualité** : 90-95 (pour impression ou images importantes)
- **Images IA/analyse** : 85-90 (haute qualité pour traitement)

---

## 📊 Formats Supportés

### Formats d'Entrée
- ✅ JPEG
- ✅ PNG
- ✅ WebP

### Formats de Sortie
- ✅ JPEG (avec mozjpeg pour meilleure compression)
- ✅ PNG (avec compressionLevel 9)
- ✅ WebP (meilleure compression, recommandé pour le web)

### Recommandation

**Utiliser WebP pour la sortie** quand possible :
- 25-35% plus petit que JPEG à qualité égale
- Supporté par tous les navigateurs modernes
- Excellent pour les thumbnails

---

## 🔍 Méthodes Disponibles

### `compressImage(buffer, options)`
Compresse une image depuis un Buffer.

### `compressImageFromBase64(base64Image, options)`
Compresse une image depuis une chaîne base64.

### `generateThumbnail(buffer, size, quality)`
Génère un thumbnail carré (WebP par défaut).

### `generateThumbnailFromBase64(base64Image, size, quality)`
Génère un thumbnail depuis base64.

### `compressedImageToBase64(result)`
Convertit un résultat de compression en base64 avec préfixe data URI.

### `validateImage(buffer)`
Valide qu'un Buffer est une image valide.

### `getImageMetadata(buffer)`
Obtient les métadonnées d'une image sans la décoder.

---

## 📈 Performance

### Benchmarks Typiques

- **Image 4MP (JPEG, 2.5MB)** → WebP 85% : ~500KB (80% réduction)
- **Image 2MP (PNG, 3MB)** → WebP 85% : ~200KB (93% réduction)
- **Thumbnail 200x200** : ~10-20KB (WebP)

### Temps de Traitement

- Compression simple : < 100ms (images < 5MB)
- Compression + redimensionnement : 100-300ms
- Thumbnail : 50-150ms

---

## 🔒 Sécurité

- ✅ Validation des formats d'image
- ✅ Gestion d'erreurs robuste
- ✅ Limites de taille implicites (mémoire Node.js)
- ⚠️ **Recommandation** : Ajouter une limite de taille explicite dans le controller (ex: 10MB max)

---

## 💡 Cas d'Usage Recommandés

### 1. Photos d'Animaux (photo_uri)
- Compresser lors de l'upload
- Générer un thumbnail 200x200 pour les listes
- Stocker l'original compressé (max 1920px, WebP 85%)

### 2. Images IA (Module ai-weight)
- Compresser les images base64 avant envoi au modèle
- Réduire à max 1280px pour accélérer le traitement
- JPEG 90% pour préserver les détails

### 3. Photos de Profil (users.photo)
- Thumbnail 100x100 pour les avatars
- Image normale 400x400 pour les profils
- WebP pour tous

---

## 📝 Notes

- Le service est **global** (injectable partout via `CommonModule`)
- Sharp est **asynchrone** (utilise async/await)
- Les images sont traitées en **mémoire** (Buffer)
- Pour les très gros fichiers, considérer un traitement en streaming (futur)

---

## 🔗 Références

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [WebP vs JPEG Comparison](https://developers.google.com/speed/webp)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

