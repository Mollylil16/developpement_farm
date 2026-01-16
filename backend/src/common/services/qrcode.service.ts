import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from './cache.service';

const scryptAsync = promisify(scrypt);

interface QRData {
  type: 'collab';
  uid: string; // user_id chiffré
  exp: number; // timestamp d'expiration
  nonce: string; // nonce unique pour anti-replay
}

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private encryptionKey: Buffer | null = null;
  private readonly defaultExpiryMinutes: number;

  constructor(private readonly cacheService: CacheService) {
    this.defaultExpiryMinutes = parseInt(
      process.env.QR_DEFAULT_EXPIRY_MINUTES || '5',
      10
    );
    this.initializeEncryptionKey();
  }

  /**
   * Initialise la clé de chiffrement depuis les variables d'environnement
   */
  private async initializeEncryptionKey(): Promise<void> {
    const secretKey = process.env.QR_ENCRYPTION_KEY;
    if (!secretKey) {
      this.logger.warn(
        'QR_ENCRYPTION_KEY non défini. Génération d\'une clé temporaire (non persistante).'
      );
      // Générer une clé temporaire (sera perdue au redémarrage)
      this.encryptionKey = randomBytes(this.keyLength);
      return;
    }

    if (secretKey.length < 32) {
      throw new Error(
        'QR_ENCRYPTION_KEY doit faire au moins 32 caractères pour AES-256'
      );
    }

    // Dériver la clé depuis le secret avec scrypt
    this.encryptionKey = (await scryptAsync(
      secretKey,
      'qr-salt',
      this.keyLength
    )) as Buffer;
  }

  /**
   * Chiffre un user_id
   */
  private async encryptUserId(userId: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.initializeEncryptionKey();
    }

    const iv = randomBytes(16); // Initialization Vector
    const cipher = createCipheriv(this.algorithm, this.encryptionKey!, iv);

    let encrypted = cipher.update(userId, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Retourner: iv:authTag:encrypted (en base64 pour faciliter le transport)
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);
    return combined.toString('base64');
  }

  /**
   * Déchiffre un user_id
   */
  private async decryptUserId(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.initializeEncryptionKey();
    }

    try {
      const combined = Buffer.from(encryptedData, 'base64');
      const iv = combined.slice(0, 16);
      const authTag = combined.slice(16, 32);
      const encrypted = combined.slice(32);

      const decipher = createDecipheriv(
        this.algorithm,
        this.encryptionKey!,
        iv
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Erreur lors du déchiffrement:', error);
      throw new UnauthorizedException('QR code invalide ou corrompu');
    }
  }

  /**
   * Génère un QR code pour un utilisateur
   * @param userId ID de l'utilisateur
   * @param expiryMinutes Durée de validité en minutes (défaut: 5)
   * @returns QR code en base64 (format PNG)
   */
  async generateUserQRCode(
    userId: string,
    expiryMinutes: number = this.defaultExpiryMinutes
  ): Promise<string> {
    try {
      // Générer un nonce unique
      const nonce = uuidv4();

      // Calculer l'expiration
      const exp = Date.now() + expiryMinutes * 60 * 1000;

      // Chiffrer le user_id
      const encryptedUserId = await this.encryptUserId(userId);

      // Créer l'objet de données
      const qrData: QRData = {
        type: 'collab',
        uid: encryptedUserId,
        exp,
        nonce,
      };

      // Encoder en JSON puis en base64
      const jsonData = JSON.stringify(qrData);
      const base64Data = Buffer.from(jsonData).toString('base64');

      // Générer le QR code en base64 (PNG)
      const qrCodeBase64 = await QRCode.toDataURL(base64Data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      });

      // Stocker le nonce en cache pour vérification anti-replay
      // TTL = expiration + 1 heure de marge pour nettoyage
      const ttlSeconds = expiryMinutes * 60 + 3600;
      this.cacheService.set(`qr:nonce:${nonce}`, false, ttlSeconds);

      this.logger.debug(
        `QR code généré pour user ${userId}, expire dans ${expiryMinutes} minutes`
      );

      return qrCodeBase64;
    } catch (error) {
      this.logger.error('Erreur lors de la génération du QR code:', error);
      throw error;
    }
  }

  /**
   * Décode et valide un QR code
   * @param qrData Données du QR code (peut être base64 pur ou data URL)
   * @returns Informations décodées (userId, exp)
   */
  async decodeQRData(qrData: string): Promise<{ userId: string; exp: number }> {
    try {
      // Si c'est un data URL, extraire la partie base64
      let base64Data = qrData;
      if (qrData.startsWith('data:image')) {
        const base64Match = qrData.match(/base64,(.+)/);
        if (base64Match) {
          base64Data = base64Match[1];
        }
      }

      // Décoder le base64 pour obtenir les données JSON
      const jsonData = Buffer.from(base64Data, 'base64').toString('utf8');
      const qrDataObj: QRData = JSON.parse(jsonData);

      // Vérifier le type
      if (qrDataObj.type !== 'collab') {
        throw new UnauthorizedException('Type de QR code invalide');
      }

      // Vérifier l'expiration
      const now = Date.now();
      if (qrDataObj.exp < now) {
        throw new UnauthorizedException('QR code expiré');
      }

      // Vérifier que le nonce n'a pas déjà été utilisé (anti-replay)
      const nonceKey = `qr:nonce:${qrDataObj.nonce}`;
      if (this.cacheService.has(nonceKey)) {
        const isUsed = this.cacheService.get<boolean>(nonceKey);
        if (isUsed === true) {
          throw new UnauthorizedException(
            'Ce QR code a déjà été utilisé (anti-replay)'
          );
        }
      } else {
        // Nonce non trouvé (expiré ou invalide)
        throw new UnauthorizedException('QR code invalide ou expiré');
      }

      // Déchiffrer le user_id
      const userId = await this.decryptUserId(qrDataObj.uid);

      return {
        userId,
        exp: qrDataObj.exp,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Erreur lors du décodage du QR code:', error);
      throw new UnauthorizedException('QR code invalide ou corrompu');
    }
  }

  /**
   * Marque un QR code comme utilisé (anti-replay)
   * @param qrData Données du QR code (peut être base64 pur ou data URL)
   */
  async markQRAsUsed(qrData: string): Promise<void> {
    try {
      // Si c'est un data URL, extraire la partie base64
      let base64Data = qrData;
      if (qrData.startsWith('data:image')) {
        const base64Match = qrData.match(/base64,(.+)/);
        if (base64Match) {
          base64Data = base64Match[1];
        }
      }

      // Décoder pour obtenir le nonce
      const jsonData = Buffer.from(base64Data, 'base64').toString('utf8');
      const qrDataObj: QRData = JSON.parse(jsonData);

      const nonceKey = `qr:nonce:${qrDataObj.nonce}`;
      
      // Marquer comme utilisé (TTL = expiration + 1 heure)
      const remainingTime = qrDataObj.exp - Date.now();
      const ttlSeconds = Math.max(3600, Math.floor(remainingTime / 1000) + 3600);
      
      this.cacheService.set(nonceKey, true, ttlSeconds);
      
      this.logger.debug(`QR code marqué comme utilisé: ${qrDataObj.nonce}`);
    } catch (error) {
      this.logger.error('Erreur lors du marquage du QR code:', error);
      // Ne pas faire échouer l'opération principale si le marquage échoue
    }
  }
}
