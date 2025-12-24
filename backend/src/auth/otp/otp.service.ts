import { Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { randomBytes, randomInt, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type OtpChannel = 'email' | 'sms';

interface NormalizedIdentifier {
  normalized: string;
  channel: OtpChannel;
}

@Injectable()
export class OtpService implements OnModuleInit {
  private readonly logger = new Logger(OtpService.name);
  // 5 minutes par défaut
  private readonly otpTtlMs = 5 * 60 * 1000;
  private readonly maxAttempts = 5;
  private readonly purpose = 'auth';

  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.ensureSchema();
  }

  private async ensureSchema() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS auth_otps (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        channel TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        code_salt TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ NULL,
        attempt_count INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        ip_address TEXT NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.db.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_otps_identifier_created_at
       ON auth_otps(identifier, created_at DESC);`
    );
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_otps_expires_at
       ON auth_otps(expires_at);`
    );
  }

  private normalize(identifier: string): NormalizedIdentifier {
    const raw = (identifier || '').trim();
    const isEmail = raw.includes('@');

    if (isEmail) {
      return { normalized: raw.toLowerCase(), channel: 'email' };
    }

    // Téléphone: supprimer espaces, garder + et chiffres
    const normalizedPhone = raw.replace(/\s+/g, '');
    return { normalized: normalizedPhone, channel: 'sms' };
  }

  private hashCode(code: string, salt: string): string {
    const secret = process.env.OTP_SECRET || 'dev_otp_secret_change_me';
    return createHmac('sha256', secret).update(`${salt}:${code}`).digest('hex');
  }

  async requestOtp(identifier: string, ipAddress?: string, userAgent?: string) {
    const { normalized, channel } = this.normalize(identifier);
    if (!normalized) {
      // Réponse neutre (évite de donner des infos)
      return { ok: true };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = randomBytes(16).toString('hex');
    const codeHash = this.hashCode(code, salt);
    const expiresAt = new Date(Date.now() + this.otpTtlMs).toISOString();
    const id = uuidv4();

    await this.db.query(
      `INSERT INTO auth_otps
       (id, identifier, channel, purpose, code_hash, code_salt, expires_at, max_attempts, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, normalized, channel, this.purpose, codeHash, salt, expiresAt, this.maxAttempts, ipAddress, userAgent]
    );

    // Livraison (placeholder): en prod brancher SMS/Email provider
    if (process.env.OTP_DELIVERY_MODE === 'disabled') {
      // Ne rien envoyer
      return { ok: true };
    }

    // Par défaut: log (dev uniquement)
    this.logger.debug(`OTP généré: channel=${channel} identifier=${normalized} code=${code} expiresAt=${expiresAt}`);

    return { ok: true };
  }

  async verifyOtp(identifier: string, code: string): Promise<{ normalizedIdentifier: string; channel: OtpChannel }> {
    const { normalized, channel } = this.normalize(identifier);
    const codeTrimmed = (code || '').trim();

    const result = await this.db.query(
      `SELECT *
       FROM auth_otps
       WHERE identifier = $1
         AND purpose = $2
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalized, this.purpose]
    );

    const row = result.rows[0];
    if (!row) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    const attemptCount = Number(row.attempt_count || 0);
    const maxAttempts = Number(row.max_attempts || this.maxAttempts);
    if (attemptCount >= maxAttempts) {
      throw new UnauthorizedException('Trop de tentatives. Veuillez redemander un code.');
    }

    const expectedHash = String(row.code_hash);
    const salt = String(row.code_salt);
    const providedHash = this.hashCode(codeTrimmed, salt);

    if (providedHash !== expectedHash) {
      await this.db.query(`UPDATE auth_otps SET attempt_count = attempt_count + 1 WHERE id = $1`, [row.id]);
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    await this.db.query(`UPDATE auth_otps SET consumed_at = NOW() WHERE id = $1`, [row.id]);

    // channel retourné = celui déduit de l'identifiant (côté client c'est ce qu'on veut)
    return { normalizedIdentifier: normalized, channel };
  }
}


