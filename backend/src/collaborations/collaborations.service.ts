import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCollaborateurDto } from './dto/create-collaborateur.dto';
import { UpdateCollaborateurDto } from './dto/update-collaborateur.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../marketplace/dto/notification.dto';

// Limite maximale de collaborateurs par projet
const MAX_COLLABORATEURS = 50;

// Durée d'expiration des invitations (en jours)
const INVITATION_EXPIRY_DAYS = 7;

// Interface pour les permissions (format logique)
interface Permissions {
  reproduction: boolean;
  nutrition: boolean;
  finance: boolean;
  rapports: boolean;
  planification: boolean;
  mortalites: boolean;
  sante: boolean;
}

// Interface pour les colonnes de permissions (format base de données)
interface PermissionColumns {
  permission_reproduction: boolean;
  permission_nutrition: boolean;
  permission_finance: boolean;
  permission_rapports: boolean;
  permission_planification: boolean;
  permission_mortalites: boolean;
  permission_sante: boolean;
  permission_cheptel: boolean; // ✅ Permission pour gérer le cheptel (animaux, bandes)
}

// Interface pour un collaborateur retourné (exportée pour le contrôleur)
export interface Collaborateur {
  id: string;
  projet_id: string;
  user_id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: string;
  statut: string;
  permissions: Permissions;
  date_invitation?: string;
  date_acceptation?: string;
  expiration_date?: string;
  notes?: string;
  date_creation: string;
  derniere_modification?: string;
  invitation_type?: string;
  invited_by?: string;
  qr_scan_data?: string;
  rejection_reason?: string;
  suspension_reason?: string;
  last_activity?: string;
}

// Interface pour une ligne de base de données
interface CollaborationRow {
  id: string;
  projet_id: string;
  user_id?: string | null;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  role: string;
  statut: string;
  permission_reproduction: boolean;
  permission_nutrition: boolean;
  permission_finance: boolean;
  permission_rapports: boolean;
  permission_planification: boolean;
  permission_mortalites: boolean;
  permission_sante: boolean;
  permission_cheptel?: boolean; // ✅ Permission pour gérer le cheptel (animaux, bandes)
  date_invitation?: string | null;
  date_acceptation?: string | null;
  expiration_date?: string | null;
  invitation_type?: string | null;
  invited_by?: string | null;
  qr_scan_data?: string | null;
  rejection_reason?: string | null;
  suspension_reason?: string | null;
  last_activity?: string | null;
  notes?: string | null;
  date_creation: string;
  derniere_modification?: string | null;
}

// Interface pour les options de findAll (exportée pour le contrôleur)
export interface FindAllOptions {
  search?: string;
  role?: string;
  statut?: string;
  invitation_type?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// Permissions par défaut selon le rôle
const DEFAULT_PERMISSIONS: Record<string, Permissions> = {
  proprietaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  gestionnaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  veterinaire: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  ouvrier: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: false,
    planification: true,
    mortalites: true,
    sante: false,
  },
  observateur: {
    reproduction: false,
    nutrition: false,
    finance: false,
    rapports: true,
    planification: false,
    mortalites: false,
    sante: false,
  },
};

@Injectable()
export class CollaborationsService {
  private readonly logger = new Logger(CollaborationsService.name);

  constructor(
    private databaseService: DatabaseService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) {}

  /**
   * Génère un ID comme le frontend : collaborateur_${Date.now()}_${random}
   */
  private generateCollaborateurId(): string {
    return `collaborateur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
if (proprietaireId !== normalizedUserId) {
throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Vérifie qu'un utilisateur existe et est actif
   */
  private async validateUserId(userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT id, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Utilisateur introuvable ou inactif');
    }

    const user = result.rows[0];
    if (user.is_active === false) {
      throw new NotFoundException('Utilisateur introuvable ou inactif');
    }
  }

  /**
   * Vérifie s'il existe déjà un collaborateur avec les mêmes identifiants sur ce projet
   */
  private async checkDuplicateCollaborateur(
    projetId: string,
    email?: string,
    telephone?: string,
    userId?: string
  ): Promise<void> {
    // Construire les conditions pour vérifier les doublons
    const duplicateConditions: string[] = [];
    const params: unknown[] = [projetId];
    let paramIndex = 2;

    // Vérifier par email (si fourni)
    if (email && email.trim().length > 0) {
      duplicateConditions.push(`(projet_id = $1 AND LOWER(email) = LOWER($${paramIndex}))`);
      params.push(email.trim());
      paramIndex++;
    }

    // Vérifier par téléphone (si fourni)
    if (telephone && telephone.trim().length > 0) {
      duplicateConditions.push(`(projet_id = $1 AND telephone = $${paramIndex})`);
      params.push(telephone.trim());
      paramIndex++;
    }

    // Vérifier par user_id (si fourni)
    if (userId && userId.trim().length > 0) {
      duplicateConditions.push(`(projet_id = $1 AND user_id = $${paramIndex})`);
      params.push(userId.trim());
      paramIndex++;
    }

    // Si aucune condition n'a été ajoutée, pas de vérification
    if (duplicateConditions.length === 0) {
      return;
    }

    const query = `
      SELECT id, email, telephone, user_id, statut 
      FROM collaborations 
      WHERE ${duplicateConditions.join(' OR ')}
      LIMIT 1
    `;

    const result = await this.databaseService.query(query, params);

    if (result.rows.length > 0) {
      const duplicate = result.rows[0];
      let reason = 'Ce collaborateur est déjà invité sur ce projet';
      
      // Message d'erreur spécifique selon le type de doublon
      if (duplicate.email && email && duplicate.email.toLowerCase() === email.trim().toLowerCase()) {
        reason = `Un collaborateur avec l'email ${email} existe déjà sur ce projet`;
      } else if (duplicate.telephone && telephone && duplicate.telephone === telephone.trim()) {
        reason = `Un collaborateur avec le téléphone ${telephone} existe déjà sur ce projet`;
      } else if (duplicate.user_id && userId && duplicate.user_id === userId.trim()) {
        reason = `Cet utilisateur est déjà collaborateur sur ce projet`;
      }

      throw new ConflictException(reason);
    }
  }

  /**
   * Vérifie que le nombre de collaborateurs actifs ne dépasse pas la limite
   */
  private async checkCollaborateurLimit(projetId: string): Promise<void> {
    const result = await this.databaseService.query(
      `SELECT COUNT(*) as count 
       FROM collaborations 
       WHERE projet_id = $1 AND statut = 'actif'`,
      [projetId]
    );

    const count = parseInt(result.rows[0].count, 10);

    if (count >= MAX_COLLABORATEURS) {
      throw new BadRequestException(
        `Limite de collaborateurs atteinte (${MAX_COLLABORATEURS} max). Veuillez désactiver ou supprimer des collaborateurs existants.`
      );
    }
  }

  /**
   * Convertit l'objet permissions en colonnes séparées pour la base de données
   */
  private permissionsToColumns(permissions: Partial<Permissions>): PermissionColumns {
    const defaultPerms = permissions || {};
    // ✅ permission_cheptel est mappée depuis reproduction (le cheptel fait partie de la reproduction/gestion des animaux)
    return {
      permission_reproduction: defaultPerms.reproduction ?? false,
      permission_nutrition: defaultPerms.nutrition ?? false,
      permission_finance: defaultPerms.finance ?? false,
      permission_rapports: defaultPerms.rapports ?? false,
      permission_planification: defaultPerms.planification ?? false,
      permission_mortalites: defaultPerms.mortalites ?? false,
      permission_sante: defaultPerms.sante ?? false,
      permission_cheptel: defaultPerms.reproduction ?? false, // ✅ Cheptel = reproduction (gestion des animaux)
    };
  }

  /**
   * Convertit les colonnes de permissions en objet
   */
  private columnsToPermissions(row: Partial<CollaborationRow>): Permissions {
    return {
      reproduction: row.permission_reproduction || false,
      nutrition: row.permission_nutrition || false,
      finance: row.permission_finance || false,
      rapports: row.permission_rapports || false,
      planification: row.permission_planification || false,
      mortalites: row.permission_mortalites || false,
      sante: row.permission_sante || false,
    };
  }

  /**
   * Mappe une ligne de base de données vers un objet Collaborateur
   */
  private mapRowToCollaborateur(row: CollaborationRow): Collaborateur {
    try {
      return {
        id: row.id,
        projet_id: row.projet_id,
        user_id: row.user_id || undefined,
        nom: row.nom || '',
        prenom: row.prenom || '',
        email: row.email || '',
        telephone: row.telephone || undefined,
        role: row.role || 'observateur',
        statut: row.statut || 'en_attente',
        permissions: this.columnsToPermissions(row),
        date_invitation: row.date_invitation || row.date_creation,
        date_acceptation: row.date_acceptation || undefined,
        expiration_date: row.expiration_date || undefined,
        notes: row.notes || undefined,
        date_creation: row.date_creation,
        derniere_modification: row.derniere_modification || row.date_creation,
        // Nouvelles colonnes optionnelles
        invitation_type: row.invitation_type || 'manual',
        invited_by: row.invited_by || undefined,
        qr_scan_data: row.qr_scan_data || undefined,
        rejection_reason: row.rejection_reason || undefined,
        suspension_reason: row.suspension_reason || undefined,
        last_activity: row.last_activity || undefined,
      };
    } catch (error) {
      this.logger.error('Erreur lors du mapping d\'un collaborateur:', error);
      this.logger.error('Données de la ligne:', JSON.stringify(row, null, 2));
      throw error;
    }
  }

  /**
   * Log une action dans l'historique des collaborations
   */
  private async logCollaborationAction(
    collaborationId: string,
    action: 'invited' | 'accepted' | 'rejected' | 'permission_changed' | 'removed' | 'linked' | 'updated' | 'expired' | 'qr_scanned' | 'permissions_defined' | 'invitation_sent' | 'invitation_viewed',
    performedBy: string | null,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: Record<string, unknown>,
    actionMetadata?: Record<string, unknown>,
    profileId?: string
  ): Promise<void> {
    try {
      // Essayer d'insérer avec les nouveaux champs (device_info, action_metadata, profile_id)
      // Si les colonnes n'existent pas encore (avant migration), on les ignore
      try {
        await this.databaseService.query(
          `INSERT INTO collaboration_history (
            collaboration_id, action, performed_by, old_value, new_value, ip_address, user_agent, device_info, action_metadata, profile_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            collaborationId,
            action,
            performedBy || null,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            ipAddress || null,
            userAgent || null,
            deviceInfo ? JSON.stringify(deviceInfo) : null,
            actionMetadata ? JSON.stringify(actionMetadata) : null,
            profileId || null,
          ]
        );
      } catch (error: any) {
        // Si les colonnes n'existent pas encore, utiliser l'ancien format
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          this.logger.warn(`Colonnes d'audit enrichies non disponibles, utilisation de l'ancien format`);
          await this.databaseService.query(
            `INSERT INTO collaboration_history (
              collaboration_id, action, performed_by, old_value, new_value, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              collaborationId,
              action,
              performedBy || null,
              oldValue ? JSON.stringify(oldValue) : null,
              newValue ? JSON.stringify(newValue) : null,
              ipAddress || null,
              userAgent || null,
            ]
          );
        } else {
          throw error;
        }
      }
    } catch (error) {
      // Log l'erreur mais ne pas faire échouer l'opération principale
      this.logger.error(`Erreur lors du logging de l'action ${action}:`, error);
    }
  }

  /**
   * Crée une collaboration depuis un scan de QR code
   * Toutes les validations de sécurité sont appliquées
   */
  async createFromQRScan(
    scannedUserId: string,
    projetId: string,
    role: string,
    permissions: Partial<Permissions>,
    scannedBy: string,
    ipAddress?: string,
    userAgent?: string,
    profileId?: string,
    profileType?: string
  ) {
    // ✅ VALIDATION 1: Vérifier ownership du projet (scannedBy doit être propriétaire)
    await this.checkProjetOwnership(projetId, scannedBy);

    // ✅ VALIDATION 2: Valider que scannedUserId existe et est actif
    await this.validateUserId(scannedUserId);

    // ✅ VALIDATION 3: Vérifier que scannedUserId !== scannedBy (pas de self-scan)
    if (scannedUserId === scannedBy) {
      throw new BadRequestException('Vous ne pouvez pas vous inviter vous-même');
    }

    // ✅ VALIDATION 4: Si profileId est fourni, vérifier que le profil est compatible
    if (profileId && profileType) {
      if (profileType !== 'veterinarian' && profileType !== 'technician') {
        throw new BadRequestException('Seuls les profils vétérinaire et technicien peuvent être ajoutés via QR code');
      }
      const profileIdMatch = profileId.match(/^profile_(.+)_(veterinarian|technician)$/);
      if (!profileIdMatch || profileIdMatch[1] !== scannedUserId) {
        throw new BadRequestException('Le profileId ne correspond pas à l\'utilisateur scanné');
      }
      if (profileType === 'veterinarian' && role !== 'veterinaire') {
        this.logger.warn(`Role mismatch: profileType=veterinarian but role=${role}, using 'veterinaire'`);
        role = 'veterinaire';
      } else if (profileType === 'technician' && role !== 'ouvrier') {
        this.logger.warn(`Role mismatch: profileType=technician but role=${role}, using 'ouvrier'`);
        role = 'ouvrier';
      }
    }

    // ✅ VALIDATION 5: Vérifier limite de collaborateurs
    await this.checkCollaborateurLimit(projetId);

    // ✅ VALIDATION 6: Vérifier doublons (avec scannedUserId ou profileId)
    if (profileId) {
      const existingByProfile = await this.databaseService.query(
        `SELECT id, statut FROM collaborations 
         WHERE projet_id = $1 AND profile_id = $2 AND statut IN ('actif', 'en_attente')`,
        [projetId, profileId]
      );
      if (existingByProfile.rows.length > 0) {
        throw new ConflictException('Ce profil a déjà une invitation en cours ou est déjà collaborateur sur ce projet');
      }
    }
    await this.checkDuplicateCollaborateur(projetId, undefined, undefined, scannedUserId);

    // Récupérer les infos complètes de l'utilisateur scanné
    const userResult = await this.databaseService.query(
      `SELECT id, nom, prenom, email, telephone, photo FROM users WHERE id = $1`,
      [scannedUserId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundException('Utilisateur scanné introuvable');
    }

    const scannedUser = userResult.rows[0];

    // ✅ VALIDATION 7: Vérifier que les permissions sont fournies (OBLIGATOIRES pour QR)
    if (!permissions || Object.keys(permissions).length === 0) {
      throw new BadRequestException(
        'Les permissions sont obligatoires lors de l\'invitation par QR code. Veuillez spécifier les permissions accordées au collaborateur.'
      );
    }

    // ✅ VALIDATION 8: Valider que toutes les permissions sont des booléens valides
    const validPermissionKeys = ['reproduction', 'nutrition', 'finance', 'rapports', 'planification', 'mortalites', 'sante'];
    for (const key of Object.keys(permissions)) {
      if (!validPermissionKeys.includes(key)) {
        throw new BadRequestException(`Permission invalide: ${key}`);
      }
      if (typeof permissions[key as keyof Permissions] !== 'boolean') {
        throw new BadRequestException(`La permission ${key} doit être un booléen`);
      }
    }

    // Utiliser les permissions fournies directement (pas de fusion avec les permissions par défaut)
    const permColumns = this.permissionsToColumns(permissions);

    // Créer l'invitation (statut en_attente)
    const id = this.generateCollaborateurId();
    const now = new Date();
    const nowISO = now.toISOString();

    // Calculer la date d'expiration (+7 jours)
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + INVITATION_EXPIRY_DAYS);
    const expirationDateISO = expirationDate.toISOString();

    // Récupérer les informations du producteur qui scanne
    const scannerResult = await this.databaseService.query(
      `SELECT id, nom, prenom, email, active_role FROM users WHERE id = $1`,
      [scannedBy]
    );
    const scannerUser = scannerResult.rows[0] || null;

    // Récupérer les informations du projet
    const projetResult = await this.databaseService.query(
      `SELECT id, nom FROM projets WHERE id = $1`,
      [projetId]
    );
    const projet = projetResult.rows[0] || null;

    // Extraire les informations de device depuis userAgent si disponible
    let deviceInfo: { platform?: string; os_version?: string; app_version?: string } = {};
    if (userAgent) {
      // Détecter la plateforme depuis user-agent
      if (userAgent.includes('Android')) {
        deviceInfo.platform = 'android';
        const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/);
        if (androidVersion) {
          deviceInfo.os_version = androidVersion[1];
        }
      } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
        deviceInfo.platform = 'ios';
        const iosVersion = userAgent.match(/OS (\d+)_(\d+)/);
        if (iosVersion) {
          deviceInfo.os_version = `${iosVersion[1]}.${iosVersion[2]}`;
        }
      } else if (userAgent.includes('Mobile')) {
        deviceInfo.platform = 'web';
      }

      // Extraire la version de l'app depuis user-agent si disponible
      const appVersion = userAgent.match(/FermierPro\/([^\s]+)/);
      if (appVersion) {
        deviceInfo.app_version = appVersion[1];
      }
    }

    // Données du scan QR (pour traçabilité enrichie)
    const qrScanData = {
      scanned_at: nowISO,
      scanner_user_id: scannedBy,
      scanner_profile_id: scannerUser?.active_role ? `profile_${scannedBy}_${scannerUser.active_role}` : null,
      scanner_ip: ipAddress || null,
      scanner_user_agent: userAgent || null,
      scanner_device_info: Object.keys(deviceInfo).length > 0 ? deviceInfo : null,
      scanned_profile_id: profileId || null,
      scanned_user_id: scannedUserId,
      scanned_profile_type: profileType || null,
      qr_code_version: profileId ? 'v2_profileId' : 'v1_userId',
      permissions_defined_at: nowISO, // Timestamp de quand les permissions ont été définies
      invitation_sent_at: nowISO, // Timestamp de quand l'invitation a été envoyée
    };

    const result = await this.databaseService.query(
      `INSERT INTO collaborations (
        id, projet_id, user_id, profile_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        permission_sante, permission_cheptel, date_invitation, date_acceptation, expiration_date,
        invitation_type, invited_by, qr_scan_data, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      RETURNING *`,
      [
        id,
        projetId,
        scannedUserId,
        profileId || null, // ✅ NOUVEAU: profile_id
        scannedUser.nom,
        scannedUser.prenom,
        scannedUser.email || null,
        scannedUser.telephone || null,
        role,
        'en_attente', // ✅ CHANGEMENT: Statut en_attente (nécessite acceptation)
        permColumns.permission_reproduction,
        permColumns.permission_nutrition,
        permColumns.permission_finance,
        permColumns.permission_rapports,
        permColumns.permission_planification,
        permColumns.permission_mortalites,
        permColumns.permission_sante,
        permColumns.permission_cheptel,
        nowISO, // date_invitation
        null, // ✅ CHANGEMENT: date_acceptation = NULL (sera rempli lors de l'acceptation)
        expirationDateISO, // ✅ CHANGEMENT: expiration_date = J+7
        'qr_scan',
        scannedBy, // ✅ NOUVEAU: invited_by
        JSON.stringify(qrScanData),
        null, // notes
        nowISO,
        nowISO,
      ]
    );

    const createdCollaboration = this.mapRowToCollaborateur(result.rows[0]);

    // Log l'action 'qr_scanned' avec métadonnées enrichies
    await this.logCollaborationAction(
      createdCollaboration.id,
      'qr_scanned',
      scannedBy,
      undefined,
      {
        scanned_user_id: scannedUserId,
        scanned_profile_id: profileId || null,
        scanned_profile_type: profileType || null,
        qr_code_version: qrScanData.qr_code_version,
      },
      ipAddress,
      userAgent,
      Object.keys(deviceInfo).length > 0 ? deviceInfo : undefined,
      {
        qr_scan_data: qrScanData,
      },
      scannerUser?.active_role ? `profile_${scannedBy}_${scannerUser.active_role}` : undefined
    );

    // Log l'action 'permissions_defined'
    await this.logCollaborationAction(
      createdCollaboration.id,
      'permissions_defined',
      scannedBy,
      undefined,
      {
        permissions: createdCollaboration.permissions,
      },
      ipAddress,
      userAgent,
      Object.keys(deviceInfo).length > 0 ? deviceInfo : undefined,
      {
        permissions_defined_at: nowISO,
      },
      scannerUser?.active_role ? `profile_${scannedBy}_${scannerUser.active_role}` : undefined
    );

    // Log l'action 'invitation_sent'
    await this.logCollaborationAction(
      createdCollaboration.id,
      'invitation_sent',
      scannedBy,
      undefined,
      {
        invitation_type: 'qr_scan',
        statut: createdCollaboration.statut,
        expiration_date: expirationDateISO,
      },
      ipAddress,
      userAgent,
      Object.keys(deviceInfo).length > 0 ? deviceInfo : undefined,
      {
        invitation_sent_at: nowISO,
      },
      scannerUser?.active_role ? `profile_${scannedBy}_${scannerUser.active_role}` : undefined
    );

    // ✅ Envoyer une notification au collaborateur invité (PAS au producteur à cette étape)
    // La notification au producteur sera envoyée après acceptation/rejet par le collaborateur
    try {
      const projetNom = projet?.nom || 'le projet';
      const scannerNom = scannerUser ? `${scannerUser.prenom || ''} ${scannerUser.nom || ''}`.trim() : 'Un producteur';
      const roleLabel = role === 'veterinaire' ? 'vétérinaire' : 
                       role === 'ouvrier' ? 'ouvrier' :
                       role === 'observateur' ? 'observateur' :
                       role === 'gestionnaire' ? 'gestionnaire' : role;

      await this.notificationsService.createNotification(
        scannedUserId,
        'invitation_received',
        'Nouvelle invitation',
        `${scannerNom} vous invite à rejoindre le projet "${projetNom}" en tant que ${roleLabel}. Veuillez accepter ou refuser cette invitation.`,
        {
          projet_id: projetId,
          collaboration_id: createdCollaboration.id,
          projet_nom: projetNom,
          invited_by_name: scannerNom,
          invited_by_id: scannedBy,
          role: role,
          permissions: createdCollaboration.permissions,
          invitation_type: 'qr_scan',
          profile_id: profileId || null,
        }
      );

      this.logger.log(
        `Notification d'invitation QR envoyée à l'utilisateur ${scannedUserId} pour le projet ${projetId}`
      );
    } catch (error) {
      // Ne pas faire échouer l'opération si la notification échoue
      this.logger.error('Erreur lors de l\'envoi de la notification au collaborateur:', error);
    }

    return createdCollaboration;
  }

  async create(
    createCollaborateurDto: CreateCollaborateurDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.checkProjetOwnership(createCollaborateurDto.projet_id, userId);

    // Validation : au moins email OU telephone doit être fourni
    const hasEmail = createCollaborateurDto.email && createCollaborateurDto.email.trim().length > 0;
    const hasTelephone = createCollaborateurDto.telephone && createCollaborateurDto.telephone.trim().length > 0;
    if (!hasEmail && !hasTelephone) {
      throw new BadRequestException('Au moins un email ou un numéro de téléphone doit être fourni');
    }

    // ✅ SÉCURITÉ : Vérifier que le user_id est valide si fourni
    if (createCollaborateurDto.user_id && createCollaborateurDto.user_id.trim().length > 0) {
      await this.validateUserId(createCollaborateurDto.user_id);
    }

    // ✅ SÉCURITÉ : Vérifier les doublons AVANT l'insertion
    await this.checkDuplicateCollaborateur(
      createCollaborateurDto.projet_id,
      createCollaborateurDto.email,
      createCollaborateurDto.telephone,
      createCollaborateurDto.user_id
    );

    // ✅ SÉCURITÉ : Vérifier la limite de collaborateurs AVANT l'insertion
    await this.checkCollaborateurLimit(createCollaborateurDto.projet_id);

    const id = this.generateCollaborateurId();
    const now = new Date();
    const nowISO = now.toISOString();
    const statut = createCollaborateurDto.statut || 'en_attente';

    // Calculer la date d'expiration (7 jours à partir de maintenant)
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + INVITATION_EXPIRY_DAYS);
    const expirationDateISO = expirationDate.toISOString();

    // Fusionner les permissions par défaut avec celles fournies
    const defaultPerms = DEFAULT_PERMISSIONS[createCollaborateurDto.role] || {};
    const mergedPermissions = createCollaborateurDto.permissions
      ? { ...defaultPerms, ...createCollaborateurDto.permissions }
      : defaultPerms;

    const permColumns = this.permissionsToColumns(mergedPermissions);

    const result = await this.databaseService.query(
      `INSERT INTO collaborations (
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        permission_sante, permission_cheptel, date_invitation, expiration_date, invitation_type, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        id,
        createCollaborateurDto.projet_id,
        createCollaborateurDto.user_id || null,
        createCollaborateurDto.nom,
        createCollaborateurDto.prenom,
        createCollaborateurDto.email || null,
        createCollaborateurDto.telephone || null,
        createCollaborateurDto.role,
        statut,
        permColumns.permission_reproduction,
        permColumns.permission_nutrition,
        permColumns.permission_finance,
        permColumns.permission_rapports,
        permColumns.permission_planification,
        permColumns.permission_mortalites,
        permColumns.permission_sante,
        permColumns.permission_cheptel,
        nowISO, // date_invitation
        expirationDateISO, // expiration_date
        'manual', // invitation_type (défaut pour les invitations manuelles)
        createCollaborateurDto.notes || null,
        nowISO,
        nowISO,
      ]
    );

    const createdCollaboration = this.mapRowToCollaborateur(result.rows[0]);

    // Log l'action 'invited'
    await this.logCollaborationAction(
      createdCollaboration.id,
      'invited',
      userId,
      undefined,
      {
        projet_id: createdCollaboration.projet_id,
        nom: createdCollaboration.nom,
        prenom: createdCollaboration.prenom,
        email: createdCollaboration.email,
        telephone: createdCollaboration.telephone,
        role: createdCollaboration.role,
        statut: createdCollaboration.statut,
        permissions: createdCollaboration.permissions,
      },
      ipAddress,
      userAgent
    );

    // Envoyer une notification au collaborateur invité (si user_id est fourni)
    if (createdCollaboration.user_id) {
      try {
        // Récupérer le nom du projet
        const projetResult = await this.databaseService.query(
          'SELECT nom FROM projets WHERE id = $1',
          [createdCollaboration.projet_id]
        );
        const projetNom = projetResult.rows[0]?.nom || 'le projet';

        await this.notificationsService.createNotification(
          createdCollaboration.user_id,
          'invitation_received',
          'Nouvelle invitation',
          `Vous avez été invité à rejoindre ${projetNom} en tant que ${createdCollaboration.role}`,
          {
            projet_id: createdCollaboration.projet_id,
            collaboration_id: createdCollaboration.id,
            projet_nom: projetNom,
            role: createdCollaboration.role,
          }
        );
      } catch (error) {
        // Ne pas faire échouer l'opération si la notification échoue
        this.logger.error('Erreur lors de l\'envoi de la notification:', error);
      }
    }

    return createdCollaboration;
  }

  async findAll(
    projetId: string,
    userId: string,
    options?: FindAllOptions
  ) {
    await this.checkProjetOwnership(projetId, userId);

    // Valeurs par défaut
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const sortOrder = options?.sortOrder || 'DESC';

    // Whitelist pour sortBy (sécurité contre SQL injection)
    const allowedSortFields = ['nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation', 'last_activity'];
    const sortBy = options?.sortBy && allowedSortFields.includes(options.sortBy) 
      ? options.sortBy 
      : 'date_creation';

    // Construire la requête de base
    let query = `SELECT * FROM collaborations WHERE projet_id = $1`;
    const params: unknown[] = [projetId];
    let paramIndex = 2;

    // Ajouter la recherche
    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = `%${options.search.trim()}%`;
      query += ` AND (
        LOWER(nom) LIKE LOWER($${paramIndex}) OR 
        LOWER(prenom) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex})
      )`;
      params.push(searchTerm);
      paramIndex++;
    }

    // Ajouter les filtres
    if (options?.role) {
      query += ` AND role = $${paramIndex}`;
      params.push(options.role);
      paramIndex++;
    }

    if (options?.statut) {
      query += ` AND statut = $${paramIndex}`;
      params.push(options.statut);
      paramIndex++;
    }

    // Ajouter le filtre par invitation_type
    if (options?.invitation_type) {
      query += ` AND invitation_type = $${paramIndex}`;
      params.push(options.invitation_type);
      paramIndex++;
    }

    // Ajouter le tri
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Ajouter la pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Exécuter la requête pour récupérer les données
    const result = await this.databaseService.query(query, params);
    const data = result.rows.map((row) => this.mapRowToCollaborateur(row));

    // Construire la requête de comptage (même conditions mais sans pagination)
    let countQuery = `SELECT COUNT(*) as total FROM collaborations WHERE projet_id = $1`;
    const countParams: unknown[] = [projetId];
    let countParamIndex = 2;

    // Ajouter les mêmes conditions de recherche et filtres
    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = `%${options.search.trim()}%`;
      countQuery += ` AND (
        LOWER(nom) LIKE LOWER($${countParamIndex}) OR 
        LOWER(prenom) LIKE LOWER($${countParamIndex}) OR 
        LOWER(email) LIKE LOWER($${countParamIndex})
      )`;
      countParams.push(searchTerm);
      countParamIndex++;
    }

    if (options?.role) {
      countQuery += ` AND role = $${countParamIndex}`;
      countParams.push(options.role);
      countParamIndex++;
    }

    if (options?.statut) {
      countQuery += ` AND statut = $${countParamIndex}`;
      countParams.push(options.statut);
      countParamIndex++;
    }

    if (options?.invitation_type) {
      countQuery += ` AND invitation_type = $${countParamIndex}`;
      countParams.push(options.invitation_type);
      countParamIndex++;
    }

    // Exécuter la requête de comptage
    const countResult = await this.databaseService.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Retourner avec pagination
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT c.* FROM collaborations c
       JOIN projets p ON c.projet_id = p.id
       WHERE c.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToCollaborateur(result.rows[0]) : null;
  }

  async update(
    id: string,
    updateCollaborateurDto: UpdateCollaborateurDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldPermissions = { ...existing.permissions };
    const oldRole = existing.role;
    const oldStatut = existing.statut;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateCollaborateurDto.user_id !== undefined) {
      fields.push(`user_id = $${paramIndex}`);
      values.push(updateCollaborateurDto.user_id || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateCollaborateurDto.nom);
      paramIndex++;
    }
    if (updateCollaborateurDto.prenom !== undefined) {
      fields.push(`prenom = $${paramIndex}`);
      values.push(updateCollaborateurDto.prenom);
      paramIndex++;
    }
    if (updateCollaborateurDto.email !== undefined) {
      // ✅ Ne pas mettre à jour l'email s'il est vide (null ou chaîne vide)
      const emailValue = updateCollaborateurDto.email?.trim() || null;
      if (emailValue !== null && emailValue !== '') {
        fields.push(`email = $${paramIndex}`);
        values.push(emailValue);
        paramIndex++;
      }
    }
    if (updateCollaborateurDto.telephone !== undefined) {
      fields.push(`telephone = $${paramIndex}`);
      values.push(updateCollaborateurDto.telephone || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.role !== undefined) {
      fields.push(`role = $${paramIndex}`);
      values.push(updateCollaborateurDto.role);
      paramIndex++;
    }
    if (updateCollaborateurDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateCollaborateurDto.statut);
      paramIndex++;
    }
    if (updateCollaborateurDto.permissions !== undefined) {
      const permColumns = this.permissionsToColumns(updateCollaborateurDto.permissions);
      fields.push(`permission_reproduction = $${paramIndex}`);
      values.push(permColumns.permission_reproduction);
      paramIndex++;
      fields.push(`permission_nutrition = $${paramIndex}`);
      values.push(permColumns.permission_nutrition);
      paramIndex++;
      fields.push(`permission_finance = $${paramIndex}`);
      values.push(permColumns.permission_finance);
      paramIndex++;
      fields.push(`permission_rapports = $${paramIndex}`);
      values.push(permColumns.permission_rapports);
      paramIndex++;
      fields.push(`permission_planification = $${paramIndex}`);
      values.push(permColumns.permission_planification);
      paramIndex++;
      fields.push(`permission_mortalites = $${paramIndex}`);
      values.push(permColumns.permission_mortalites);
      paramIndex++;
      fields.push(`permission_sante = $${paramIndex}`);
      values.push(permColumns.permission_sante);
      paramIndex++;
      fields.push(`permission_cheptel = $${paramIndex}`);
      values.push(permColumns.permission_cheptel);
      paramIndex++;
    }
    if (updateCollaborateurDto.date_acceptation !== undefined) {
      fields.push(`date_acceptation = $${paramIndex}`);
      values.push(updateCollaborateurDto.date_acceptation || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateCollaborateurDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE collaborations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    const updatedCollaboration = this.mapRowToCollaborateur(result.rows[0]);

    // Vérifier si les permissions ont changé
    const newPermissions = updatedCollaboration.permissions;
    const permissionsChanged = JSON.stringify(oldPermissions) !== JSON.stringify(newPermissions);
    const roleChanged = updateCollaborateurDto.role !== undefined && updateCollaborateurDto.role !== oldRole;
    const statutChanged = updateCollaborateurDto.statut !== undefined && updateCollaborateurDto.statut !== oldStatut;

    // Log l'action 'permission_changed' si les permissions ont changé
    if (permissionsChanged) {
      await this.logCollaborationAction(
        id,
        'permission_changed',
        userId,
        { permissions: oldPermissions },
        { permissions: newPermissions },
        ipAddress,
        userAgent
      );
    }

    // Log l'action 'updated' pour les autres changements
    if (roleChanged || statutChanged || !permissionsChanged) {
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      if (roleChanged) {
        oldValue.role = oldRole;
        newValue.role = updatedCollaboration.role;
      }
      if (statutChanged) {
        oldValue.statut = oldStatut;
        newValue.statut = updatedCollaboration.statut;
      }
      if (Object.keys(oldValue).length > 0 || Object.keys(newValue).length > 0) {
        await this.logCollaborationAction(
          id,
          'updated',
          userId,
          Object.keys(oldValue).length > 0 ? oldValue : undefined,
          Object.keys(newValue).length > 0 ? newValue : undefined,
          ipAddress,
          userAgent
        );
      }
    }

    return updatedCollaboration;
  }

  async delete(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    // Log l'action 'removed' avant la suppression
    await this.logCollaborationAction(
      id,
      'removed',
      userId,
      {
        projet_id: existing.projet_id,
        nom: existing.nom,
        prenom: existing.prenom,
        email: existing.email,
        telephone: existing.telephone,
        role: existing.role,
        statut: existing.statut,
        permissions: existing.permissions,
      },
      undefined,
      ipAddress,
      userAgent
    );

    // Récupérer les informations du projet et du propriétaire pour la notification
    let projetNom = 'le projet';
    let proprietaireNom = 'le propriétaire';
    try {
      const projetResult = await this.databaseService.query(
        `SELECT p.nom, u.nom as proprietaire_nom, u.prenom as proprietaire_prenom 
         FROM projets p 
         JOIN users u ON p.proprietaire_id = u.id 
         WHERE p.id = $1`,
        [existing.projet_id]
      );
      if (projetResult.rows.length > 0) {
        projetNom = projetResult.rows[0].nom || projetNom;
        const propNom = projetResult.rows[0].proprietaire_nom || '';
        const propPrenom = projetResult.rows[0].proprietaire_prenom || '';
        proprietaireNom = `${propPrenom} ${propNom}`.trim() || proprietaireNom;
      }
    } catch (error) {
      this.logger.warn('Erreur lors de la récupération des infos du projet pour notification:', error);
    }

    // Supprimer la collaboration
    await this.databaseService.query('DELETE FROM collaborations WHERE id = $1', [id]);

    // Envoyer une notification au collaborateur retiré (si user_id existe)
    if (existing.user_id) {
      try {
        await this.notificationsService.createNotification(
          existing.user_id,
          NotificationType.COLLABORATION_REMOVED,
          'Accès au projet retiré',
          `Vous avez été retiré du projet "${projetNom}" par ${proprietaireNom}. Vous n'avez plus accès à ce projet.`,
          {
            collaborationId: id,
            projetId: existing.projet_id,
            projetNom: projetNom,
            proprietaireNom: proprietaireNom,
            role: existing.role,
            relatedType: 'collaboration',
            relatedId: id,
            actionUrl: '/collaborations',
          }
        );
        this.logger.log(
          `[Collaborations] ✅ Notification de retrait envoyée au collaborateur ${existing.user_id} pour projet ${existing.projet_id}`,
        );
      } catch (error) {
        this.logger.error(
          `[Collaborations] ⚠️ Erreur lors de l'envoi de la notification de retrait (non-bloquant):`,
          error,
        );
        // Ne pas bloquer si la notification échoue
      }
    }

    return { id };
  }

  async accepterInvitation(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Récupérer l'email et le téléphone de l'utilisateur connecté
    const userResult = await this.databaseService.query(
      `SELECT email, telephone FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const userEmail = user?.email?.toLowerCase().trim();
    const userTelephone = user?.telephone?.trim();

    // Vérifier que l'invitation existe
    const invitationResult = await this.databaseService.query(
      `SELECT * FROM collaborations WHERE id = $1`,
      [id]
    );

    if (invitationResult.rows.length === 0) {
      throw new NotFoundException('Invitation introuvable');
    }

    const collaboration = invitationResult.rows[0];
    const invitationUserId = collaboration.user_id?.trim();
    const invitationEmail = collaboration.email?.toLowerCase().trim();
    const invitationTelephone = collaboration.telephone?.trim();
    const invitationProfileId = collaboration.profile_id?.trim();
    const normalizedUserId = userId?.trim();

    // Log pour debug
    this.logger.debug(`[accepterInvitation] Vérification invitation ${id}:`, {
      invitationUserId,
      normalizedUserId,
      invitationEmail,
      userEmail,
      invitationTelephone,
      userTelephone,
      invitationProfileId,
    });

    // Vérifier que l'invitation appartient à l'utilisateur
    // Par user_id OU email OU telephone OU profile_id (pour les invitations QR)
    const matchByUserId = invitationUserId && normalizedUserId && invitationUserId === normalizedUserId;
    const matchByEmail = userEmail && invitationEmail && userEmail === invitationEmail;
    const matchByTelephone = userTelephone && invitationTelephone && userTelephone === invitationTelephone;
    // ✅ Vérifier par profile_id (invitations QR: format profile_userId_role ou contient userId)
    const matchByProfileId = invitationProfileId && normalizedUserId && (
      invitationProfileId === `profile_${normalizedUserId}_veterinarian` ||
      invitationProfileId === `profile_${normalizedUserId}_technician` ||
      invitationProfileId === `profile_${normalizedUserId}_producer` ||
      invitationProfileId === `profile_${normalizedUserId}_buyer` ||
      invitationProfileId.includes(normalizedUserId)
    );

    this.logger.debug(`[accepterInvitation] Résultats match:`, {
      matchByUserId,
      matchByEmail,
      matchByTelephone,
      matchByProfileId,
    });

    if (!matchByUserId && !matchByEmail && !matchByTelephone && !matchByProfileId) {
      this.logger.warn(`[accepterInvitation] Aucun match pour invitation ${id}, userId=${normalizedUserId}`);
      throw new ForbiddenException(
        "Cette invitation ne vous est pas destinée. Vérifiez que l'email ou le téléphone correspond à votre compte."
      );
    }

    if (collaboration.statut !== 'en_attente') {
      throw new BadRequestException("Cette invitation n'est plus en attente");
    }

    // Vérifier que l'invitation n'a pas expiré
    if (collaboration.expiration_date) {
      const expirationDate = new Date(collaboration.expiration_date);
      const now = new Date();
      if (expirationDate < now) {
        throw new BadRequestException('Cette invitation a expiré');
      }
    }

    const now = new Date().toISOString();
    
    // Sauvegarder l'ancien statut pour le log
    const oldStatut = collaboration.statut;
    const oldUserId = collaboration.user_id;

    const updateResult = await this.databaseService.query(
      `UPDATE collaborations 
       SET statut = 'actif', date_acceptation = $1, derniere_modification = $2,
           user_id = COALESCE(user_id, $3)
       WHERE id = $4
       RETURNING *`,
      [now, now, userId, id]
    );

    const updatedCollaboration = this.mapRowToCollaborateur(updateResult.rows[0]);

    // Log l'action 'accepted'
    await this.logCollaborationAction(
      id,
      'accepted',
      userId,
      {
        statut: oldStatut,
        user_id: oldUserId,
      },
      {
        statut: 'actif',
        user_id: updatedCollaboration.user_id,
        date_acceptation: updatedCollaboration.date_acceptation,
      },
      ipAddress,
      userAgent
    );

    // Envoyer une notification au propriétaire du projet
    try {
      // Récupérer le propriétaire du projet
      const projetResult = await this.databaseService.query(
        'SELECT proprietaire_id, nom FROM projets WHERE id = $1',
        [collaboration.projet_id]
      );
      const proprietaireId = projetResult.rows[0]?.proprietaire_id;
      const projetNom = projetResult.rows[0]?.nom || 'le projet';

      if (proprietaireId && proprietaireId !== userId) {
        const collaborateurNom = `${collaboration.prenom || ''} ${collaboration.nom || ''}`.trim() || 'Un collaborateur';
        await this.notificationsService.createNotification(
          proprietaireId,
          'invitation_accepted',
          'Invitation acceptée',
          `${collaborateurNom} a accepté votre invitation sur ${projetNom}`,
          {
            projet_id: collaboration.projet_id,
            collaboration_id: id,
            projet_nom: projetNom,
            collaborateur_nom: collaboration.nom,
            collaborateur_prenom: collaboration.prenom,
          }
        );
      }
    } catch (error) {
        this.logger.error('Erreur lors de l\'envoi de la notification:', error);
    }

    return updatedCollaboration;
  }

  async rejeterInvitation(
    id: string,
    userId: string,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Récupérer l'email et le téléphone de l'utilisateur connecté
    const userResult = await this.databaseService.query(
      `SELECT email, telephone FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const userEmail = user?.email?.toLowerCase().trim();
    const userTelephone = user?.telephone?.trim();

    // Vérifier que l'invitation existe
    const invitationResult = await this.databaseService.query(
      `SELECT * FROM collaborations WHERE id = $1`,
      [id]
    );

    if (invitationResult.rows.length === 0) {
      throw new NotFoundException('Invitation introuvable');
    }

    const collaboration = invitationResult.rows[0];
    const invitationEmail = collaboration.email?.toLowerCase().trim();
    const invitationTelephone = collaboration.telephone?.trim();
    const invitationProfileId = collaboration.profile_id;

    // Vérifier que l'invitation appartient à l'utilisateur
    // Par user_id OU email OU telephone OU profile_id (pour les invitations QR)
    const matchByUserId = collaboration.user_id === userId;
    const matchByEmail = userEmail && invitationEmail && userEmail === invitationEmail;
    const matchByTelephone = userTelephone && invitationTelephone && userTelephone === invitationTelephone;
    // ✅ Vérifier par profile_id (invitations QR: format profile_userId_role ou contient userId)
    const matchByProfileId = invitationProfileId && (
      invitationProfileId === `profile_${userId}_veterinarian` ||
      invitationProfileId === `profile_${userId}_technician` ||
      invitationProfileId === `profile_${userId}_producer` ||
      invitationProfileId === `profile_${userId}_buyer` ||
      invitationProfileId.includes(userId)
    );

    if (!matchByUserId && !matchByEmail && !matchByTelephone && !matchByProfileId) {
      throw new ForbiddenException(
        "Cette invitation ne vous est pas destinée. Vérifiez que l'email ou le téléphone correspond à votre compte."
      );
    }
    const oldStatut = collaboration.statut;

    const now = new Date().toISOString();
    await this.databaseService.query(
      `UPDATE collaborations 
       SET statut = 'rejete', rejection_reason = $1, derniere_modification = $2
       WHERE id = $3`,
      [rejectionReason || null, now, id]
    );

    // Log l'action 'rejected'
    await this.logCollaborationAction(
      id,
      'rejected',
      userId,
      {
        statut: oldStatut,
      },
      {
        statut: 'rejete',
        rejection_reason: rejectionReason || null,
      },
      ipAddress,
      userAgent
    );

    // Envoyer une notification au propriétaire du projet
    try {
      // Récupérer le propriétaire du projet
      const projetResult = await this.databaseService.query(
        'SELECT proprietaire_id, nom FROM projets WHERE id = $1',
        [collaboration.projet_id]
      );
      const proprietaireId = projetResult.rows[0]?.proprietaire_id;
      const projetNom = projetResult.rows[0]?.nom || 'le projet';

      if (proprietaireId && proprietaireId !== userId) {
        const collaborateurNom = `${collaboration.prenom || ''} ${collaboration.nom || ''}`.trim() || 'Un collaborateur';
        await this.notificationsService.createNotification(
          proprietaireId,
          'invitation_rejected',
          'Invitation rejetée',
          `${collaborateurNom} a rejeté votre invitation sur ${projetNom}`,
          {
            projet_id: collaboration.projet_id,
            collaboration_id: id,
            projet_nom: projetNom,
            collaborateur_nom: collaboration.nom,
            collaborateur_prenom: collaboration.prenom,
            rejection_reason: rejectionReason || null,
          }
        );
      }
    } catch (error) {
        this.logger.error('Erreur lors de l\'envoi de la notification:', error);
    }

    return { id };
  }

  async findCollaborateurActuel(userId: string, projetId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM collaborations 
       WHERE user_id = $1 AND projet_id = $2 AND statut = 'actif'
       LIMIT 1`,
      [userId, projetId]
    );
    return result.rows[0] ? this.mapRowToCollaborateur(result.rows[0]) : null;
  }

  async findInvitationsEnAttente(
    userId?: string,
    email?: string,
    telephone?: string,
    profileId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      if (!userId && !email && !telephone) {
        return [];
      }

      // Construire la requête de base sans les colonnes optionnelles
      // On sélectionne uniquement les colonnes qui existent définitivement pour éviter les erreurs SQL
      // Les valeurs par défaut pour invitation_type, expiration_date, etc. seront gérées dans mapRowToCollaborateur()
      let query = `SELECT 
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance, 
        permission_rapports, permission_planification, permission_mortalites, permission_sante,
        permission_cheptel, date_invitation, date_acceptation, notes, date_creation, derniere_modification
        FROM collaborations 
        WHERE statut = 'en_attente'`;
      const params: unknown[] = [];
      let paramIndex = 1;

      // Construire les conditions de recherche
      const conditions: string[] = [];

      if (userId) {
        conditions.push(`(user_id = $${paramIndex} OR user_id IS NULL)`);
        params.push(userId);
        paramIndex++;
      }

      if (profileId) {
        // Ajouter la recherche par profile_id si fourni
        conditions.push(`profile_id = $${paramIndex}`);
        params.push(profileId);
        paramIndex++;
      }

      if (email) {
        conditions.push(`email = $${paramIndex}`);
        params.push(email);
        paramIndex++;
      }

      if (telephone) {
        conditions.push(`telephone = $${paramIndex}`);
        params.push(telephone);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
      }

      // Utiliser COALESCE pour gérer les cas où date_invitation n'existe pas encore
      // Vérifier d'abord si la colonne date_invitation existe
      query += ` ORDER BY COALESCE(date_invitation, date_creation, derniere_modification) DESC`;

      this.logger.debug(`[findInvitationsEnAttente] Exécution de la requête: ${query}`);
      this.logger.debug(`[findInvitationsEnAttente] Paramètres: ${JSON.stringify(params)}`);

      const result = await this.databaseService.query(query, params);

      this.logger.debug(`[findInvitationsEnAttente] ${result.rows.length} invitation(s) trouvée(s)`);

      // Loguer la visualisation des invitations si un utilisateur est fourni
      if (userId && result.rows.length > 0) {
        // Extraire les informations de device depuis userAgent si disponible
        let deviceInfo: { platform?: string; os_version?: string; app_version?: string } = {};
        if (userAgent) {
          if (userAgent.includes('Android')) {
            deviceInfo.platform = 'android';
            const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/);
            if (androidVersion) {
              deviceInfo.os_version = androidVersion[1];
            }
          } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
            deviceInfo.platform = 'ios';
            const iosVersion = userAgent.match(/OS (\d+)_(\d+)/);
            if (iosVersion) {
              deviceInfo.os_version = `${iosVersion[1]}.${iosVersion[2]}`;
            }
          } else if (userAgent.includes('Mobile')) {
            deviceInfo.platform = 'web';
          }
          const appVersion = userAgent.match(/FermierPro\/([^\s]+)/);
          if (appVersion) {
            deviceInfo.app_version = appVersion[1];
          }
        }

        // Loguer la visualisation pour chaque invitation trouvée
        for (const row of result.rows) {
          try {
            await this.logCollaborationAction(
              row.id,
              'invitation_viewed',
              userId,
              undefined,
              {
                viewed_at: new Date().toISOString(),
              },
              ipAddress,
              userAgent,
              Object.keys(deviceInfo).length > 0 ? deviceInfo : undefined,
              {
                viewed_at: new Date().toISOString(),
                invitation_count: result.rows.length,
              },
              profileId || row.profile_id || undefined
            );
          } catch (error) {
            // Ne pas faire échouer l'opération si le logging échoue
            this.logger.warn(`Erreur lors du logging de invitation_viewed pour ${row.id}:`, error);
          }
        }
      }

      // RETIRÉ : Liaison automatique supprimée pour des raisons de sécurité
      // Les invitations doivent être liées manuellement via linkInvitationToUser()

      // Mapper les résultats avec gestion d'erreur pour chaque ligne
      const mappedResults = result.rows.map((row) => {
        try {
          return this.mapRowToCollaborateur(row);
        } catch (error: unknown) {
          this.logger.error('Erreur lors du mapping d\'une invitation:', error);
          this.logger.error('Stack trace:', (error as Error)?.stack);
          this.logger.error('Données de la ligne:', JSON.stringify(row, null, 2));
          // Retourner un objet minimal pour éviter de casser l'application
          return {
            id: row.id || '',
            projet_id: row.projet_id || '',
            nom: row.nom || '',
            prenom: row.prenom || '',
            email: row.email || '',
            statut: row.statut || 'en_attente',
            role: row.role || 'observateur',
            permissions: this.columnsToPermissions(row),
            date_creation: row.date_creation || new Date().toISOString(),
          };
        }
      });

      return mappedResults;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des invitations en attente:', error);
      throw error;
    }
  }

  /**
   * 🆕 Récupérer toutes les collaborations actives d'un utilisateur (pour vétérinaires/techniciens)
   * Ces collaborations représentent les projets des producteurs auxquels l'utilisateur a accès
   */
  async findMesCollaborationsActives(
    userId: string,
    email?: string,
    telephone?: string,
    profileId?: string
  ): Promise<Collaborateur[]> {
    try {
      if (!userId && !email && !telephone) {
        return [];
      }

      // Construire la requête pour récupérer les collaborations ACTIVES
      let query = `SELECT 
        c.id, c.projet_id, c.user_id, c.nom, c.prenom, c.email, c.telephone, c.role, c.statut,
        c.permission_reproduction, c.permission_nutrition, c.permission_finance, 
        c.permission_rapports, c.permission_planification, c.permission_mortalites, c.permission_sante,
        c.permission_cheptel, c.date_invitation, c.date_acceptation, c.notes, c.date_creation, c.derniere_modification,
        c.profile_id,
        p.nom as projet_nom, p.localisation as projet_localisation
        FROM collaborations c
        LEFT JOIN projets p ON c.projet_id = p.id
        WHERE c.statut = 'actif'`;
      const params: unknown[] = [];
      let paramIndex = 1;

      // Construire les conditions de recherche
      const conditions: string[] = [];

      if (userId) {
        conditions.push(`c.user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (profileId) {
        conditions.push(`c.profile_id = $${paramIndex}`);
        params.push(profileId);
        paramIndex++;
      }

      if (email) {
        conditions.push(`c.email = $${paramIndex}`);
        params.push(email);
        paramIndex++;
      }

      if (telephone) {
        conditions.push(`c.telephone = $${paramIndex}`);
        params.push(telephone);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
      }

      query += ` ORDER BY c.date_acceptation DESC, c.date_creation DESC`;

      this.logger.debug(`[findMesCollaborationsActives] Exécution de la requête: ${query}`);
      this.logger.debug(`[findMesCollaborationsActives] Paramètres: ${JSON.stringify(params)}`);

      const result = await this.databaseService.query(query, params);

      this.logger.debug(`[findMesCollaborationsActives] ${result.rows.length} collaboration(s) active(s) trouvée(s)`);

      // Mapper les résultats
      const mappedResults = result.rows.map((row) => {
        try {
          const collaborateur = this.mapRowToCollaborateur(row);
          // Ajouter les infos du projet
          return {
            ...collaborateur,
            projet_nom: row.projet_nom,
            projet_localisation: row.projet_localisation,
          };
        } catch (error: unknown) {
          this.logger.error('Erreur lors du mapping d\'une collaboration active:', error);
          return {
            id: row.id || '',
            projet_id: row.projet_id || '',
            nom: row.nom || '',
            prenom: row.prenom || '',
            email: row.email || '',
            statut: row.statut || 'actif',
            role: row.role || 'observateur',
            permissions: this.columnsToPermissions(row),
            date_creation: row.date_creation || new Date().toISOString(),
            projet_nom: row.projet_nom,
            projet_localisation: row.projet_localisation,
          };
        }
      });

      return mappedResults;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des collaborations actives:', error);
      throw error;
    }
  }

  /**
   * Nettoie les invitations expirées en changeant leur statut en 'expire'
   * @returns Le nombre d'invitations expirées
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const now = new Date().toISOString();

    // Trouver toutes les invitations en attente qui ont expiré
    const findResult = await this.databaseService.query(
      `SELECT id, statut FROM collaborations 
       WHERE statut = 'en_attente' 
       AND expiration_date IS NOT NULL 
       AND expiration_date < $1`,
      [now]
    );

    if (findResult.rows.length === 0) {
      return 0;
    }

    // Mettre à jour le statut de toutes les invitations expirées
    await this.databaseService.query(
      `UPDATE collaborations 
       SET statut = 'expire', derniere_modification = $1
       WHERE statut = 'en_attente' 
       AND expiration_date IS NOT NULL 
       AND expiration_date < $2`,
      [now, now]
    );

    // Log l'action 'expired' pour chaque invitation
    for (const row of findResult.rows) {
      await this.logCollaborationAction(
        row.id,
        'expired',
        null, // Action système
        { statut: row.statut },
        { statut: 'expire' },
        undefined,
        undefined
      );
    }

    return findResult.rows.length;
  }

  /**
   * Lie manuellement une invitation à un utilisateur
   * Vérifie que l'email ou téléphone correspond avant de lier
   */
  async linkInvitationToUser(
    invitationId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Récupérer l'invitation
    const invitationResult = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE id = $1',
      [invitationId]
    );

    if (invitationResult.rows.length === 0) {
      throw new NotFoundException('Invitation introuvable');
    }

    const invitation = invitationResult.rows[0];

    // Vérifier que l'invitation est en attente
    if (invitation.statut !== 'en_attente') {
      throw new BadRequestException("Cette invitation n'est plus en attente");
    }

    // Vérifier que l'invitation n'a pas expiré
    if (invitation.expiration_date) {
      const expirationDate = new Date(invitation.expiration_date);
      const now = new Date();
      if (expirationDate < now) {
        throw new BadRequestException('Cette invitation a expiré');
      }
    }

    // Récupérer les informations de l'utilisateur
    const userResult = await this.databaseService.query(
      'SELECT email, telephone FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const user = userResult.rows[0];
    const userEmail = user?.email?.toLowerCase().trim();
    const userTelephone = user?.telephone?.trim();

    // Vérifier que l'email OU téléphone correspond
    const invitationEmail = invitation.email?.toLowerCase().trim();
    const invitationTelephone = invitation.telephone?.trim();

    const emailMatch = userEmail && invitationEmail && userEmail === invitationEmail;
    const telephoneMatch = userTelephone && invitationTelephone && userTelephone === invitationTelephone;

    if (!emailMatch && !telephoneMatch) {
      throw new ForbiddenException(
        "L'email ou le téléphone de l'invitation ne correspond pas à votre compte"
      );
    }

    // Mettre à jour l'invitation
    const now = new Date().toISOString();
    const oldUserId = invitation.user_id;

    const updateResult = await this.databaseService.query(
      `UPDATE collaborations 
       SET user_id = $1, derniere_modification = $2
       WHERE id = $3
       RETURNING *`,
      [userId, now, invitationId]
    );

    const updatedInvitation = this.mapRowToCollaborateur(updateResult.rows[0]);

    // Log l'action 'linked'
    await this.logCollaborationAction(
      invitationId,
      'linked',
      userId,
      { user_id: oldUserId },
      { user_id: userId },
      ipAddress,
      userAgent
    );

    return updatedInvitation;
  }

  /**
   * Récupère l'historique complet d'une collaboration
   * Accessible uniquement par le propriétaire du projet
   */
  async getCollaborationHistory(collaborationId: string, userId: string) {
    // Vérifier que la collaboration existe et que l'utilisateur est propriétaire
    const collaboration = await this.findOne(collaborationId, userId);
    if (!collaboration) {
      throw new NotFoundException('Collaboration introuvable');
    }

    // Récupérer l'historique
    const result = await this.databaseService.query(
      `SELECT 
        h.id,
        h.action,
        h.performed_by,
        h.old_value,
        h.new_value,
        h.ip_address,
        h.user_agent,
        h.created_at,
        u.email as performed_by_email,
        u.nom as performed_by_nom,
        u.prenom as performed_by_prenom
      FROM collaboration_history h
      LEFT JOIN users u ON h.performed_by = u.id
      WHERE h.collaboration_id = $1
      ORDER BY h.created_at DESC`,
      [collaborationId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      performed_by: row.performed_by
        ? {
            id: row.performed_by,
            email: row.performed_by_email,
            nom: row.performed_by_nom,
            prenom: row.performed_by_prenom,
          }
        : null,
      old_value: row.old_value ? JSON.parse(row.old_value) : null,
      new_value: row.new_value ? JSON.parse(row.new_value) : null,
      ip_address: row.ip_address || undefined,
      user_agent: row.user_agent || undefined,
      created_at: row.created_at,
    }));
  }

  /**
   * Récupère les statistiques d'un projet concernant les collaborations
   */
  async getProjetStatistics(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Statistiques par statut
    const statutResult = await this.databaseService.query(
      `SELECT 
        COUNT(*) as total_collaborateurs,
        COUNT(*) FILTER (WHERE statut = 'actif') as actifs,
        COUNT(*) FILTER (WHERE statut = 'en_attente') as en_attente,
        COUNT(*) FILTER (WHERE statut = 'rejete') as rejetes,
        COUNT(*) FILTER (WHERE statut = 'expire') as expires
       FROM collaborations
       WHERE projet_id = $1`,
      [projetId]
    );

    const stats = statutResult.rows[0];
    const total_collaborateurs = parseInt(stats.total_collaborateurs || '0', 10);
    const actifs = parseInt(stats.actifs || '0', 10);
    const en_attente = parseInt(stats.en_attente || '0', 10);
    const rejetes = parseInt(stats.rejetes || '0', 10);
    const expires = parseInt(stats.expires || '0', 10);

    // Statistiques par rôle
    const roleResult = await this.databaseService.query(
      `SELECT 
        role,
        COUNT(*) as count
       FROM collaborations
       WHERE projet_id = $1 AND statut = 'actif'
       GROUP BY role`,
      [projetId]
    );

    const par_role = {
      veterinaire: 0,
      gestionnaire: 0,
      ouvrier: 0,
      observateur: 0,
      proprietaire: 0,
    };

    roleResult.rows.forEach((row) => {
      if (par_role.hasOwnProperty(row.role)) {
        par_role[row.role] = parseInt(row.count, 10);
      }
    });

    // Dernière invitation
    const derniereInvitationResult = await this.databaseService.query(
      `SELECT MAX(date_invitation) as derniere_invitation
       FROM collaborations
       WHERE projet_id = $1`,
      [projetId]
    );
    const derniere_invitation = derniereInvitationResult.rows[0]?.derniere_invitation || null;

    // Dernière acceptation
    const derniereAcceptationResult = await this.databaseService.query(
      `SELECT MAX(date_acceptation) as derniere_acceptation
       FROM collaborations
       WHERE projet_id = $1 AND date_acceptation IS NOT NULL`,
      [projetId]
    );
    const derniere_acceptation = derniereAcceptationResult.rows[0]?.derniere_acceptation || null;

    return {
      total_collaborateurs,
      actifs,
      en_attente,
      rejetes,
      expires,
      par_role,
      derniere_invitation,
      derniere_acceptation,
    };
  }

  /**
   * Récupère l'activité d'un collaborateur spécifique
   */
  async getCollaborateurActivity(collaborationId: string, userId: string) {
    // Vérifier que la collaboration existe et que l'utilisateur a accès
    const collaboration = await this.findOne(collaborationId, userId);
    if (!collaboration) {
      throw new NotFoundException('Collaboration introuvable');
    }

    // Vérifier que l'utilisateur est soit le propriétaire, soit le collaborateur concerné
    const projetResult = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [collaboration.projet_id]
    );
    const proprietaireId = projetResult.rows[0]?.proprietaire_id;

    if (proprietaireId !== userId && collaboration.user_id !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette activité');
    }

    // Récupérer la dernière connexion depuis auth_logs (si disponible)
    let derniere_connexion: Date | null = null;
    if (collaboration.user_id) {
      try {
        const connexionResult = await this.databaseService.query(
          `SELECT MAX(timestamp) as derniere_connexion
           FROM auth_logs
           WHERE user_id = $1 AND success = TRUE`,
          [collaboration.user_id]
        );
        derniere_connexion = connexionResult.rows[0]?.derniere_connexion || null;
      } catch (error) {
        // Si la table auth_logs n'existe pas ou n'est pas accessible, ignorer
        this.logger.warn('Impossible de récupérer la dernière connexion:', error);
      }
    }

    // Récupérer le nombre total d'actions depuis collaboration_history
    const nombreActionsResult = await this.databaseService.query(
      `SELECT COUNT(*) as total
       FROM collaboration_history
       WHERE collaboration_id = $1`,
      [collaborationId]
    );
    const nombre_actions = parseInt(nombreActionsResult.rows[0]?.total || '0', 10);

    // Récupérer les 10 dernières actions
    const actionsResult = await this.databaseService.query(
      `SELECT 
        h.action,
        h.created_at as date,
        h.old_value,
        h.new_value,
        h.performed_by,
        u.email as performed_by_email,
        u.nom as performed_by_nom,
        u.prenom as performed_by_prenom
      FROM collaboration_history h
      LEFT JOIN users u ON h.performed_by = u.id
      WHERE h.collaboration_id = $1
      ORDER BY h.created_at DESC
      LIMIT 10`,
      [collaborationId]
    );

    const actions_recentes = actionsResult.rows.map((row) => ({
      action: row.action,
      date: row.date,
      details: {
        old_value: row.old_value ? (typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value) : null,
        new_value: row.new_value ? (typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value) : null,
        performed_by: row.performed_by
          ? {
              id: row.performed_by,
              email: row.performed_by_email,
              nom: row.performed_by_nom,
              prenom: row.performed_by_prenom,
            }
          : null,
      },
    }));

    return {
      derniere_connexion,
      nombre_actions,
      actions_recentes,
    };
  }

  /**
   * Récupère toutes les collaborations d'un utilisateur (tous projets confondus)
   * Retourne uniquement les collaborations où l'utilisateur est lié (user_id correspond)
   */
  async findMyCollaborations(userId: string) {
    const result = await this.databaseService.query(
      `SELECT c.*, p.nom as projet_nom, p.proprietaire_id
       FROM collaborations c
       JOIN projets p ON c.projet_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.date_creation DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToCollaborateur(row));
  }

  /**
   * Récupère l'audit trail complet d'une collaboration
   * Accessible uniquement par le producteur propriétaire du projet ou un administrateur
   */
  async getAuditTrail(
    collaborationId: string,
    userId: string
  ): Promise<{
    collaboration_id: string;
    invitation_type: 'qr_scan' | 'manual';
    timeline: Array<{
      action: string;
      timestamp: string;
      actor: { user_id?: string; profile_id?: string; nom?: string; prenom?: string } | null;
      metadata: Record<string, unknown>;
    }>;
  }> {
    // Vérifier que la collaboration existe et que l'utilisateur a le droit d'accéder à l'audit
    const collabResult = await this.databaseService.query(
      `SELECT c.id, c.projet_id, c.invitation_type, c.qr_scan_data, c.date_creation, p.proprietaire_id
       FROM collaborations c
       JOIN projets p ON c.projet_id = p.id
       WHERE c.id = $1`,
      [collaborationId]
    );

    if (collabResult.rows.length === 0) {
      throw new NotFoundException('Collaboration introuvable');
    }

    const collaboration = collabResult.rows[0];

    // Vérifier les permissions : seul le propriétaire du projet peut voir l'audit trail
    if (collaboration.proprietaire_id !== userId) {
      // TODO: Vérifier si l'utilisateur est administrateur
      throw new ForbiddenException('Vous n\'avez pas accès à l\'audit trail de cette collaboration');
    }

    // Récupérer l'historique complet
    const historyResult = await this.databaseService.query(
      `SELECT 
        ch.id,
        ch.action,
        ch.performed_by,
        ch.profile_id,
        ch.old_value,
        ch.new_value,
        ch.ip_address,
        ch.user_agent,
        ch.device_info,
        ch.action_metadata,
        ch.created_at,
        u.nom,
        u.prenom,
        u.email
      FROM collaboration_history ch
      LEFT JOIN users u ON ch.performed_by = u.id
      WHERE ch.collaboration_id = $1
      ORDER BY ch.created_at ASC`,
      [collaborationId]
    );

    // Construire la timeline
    const timeline = [];

    // Ajouter l'action QR scanned si c'est une invitation QR
    if (collaboration.invitation_type === 'qr_scan' && collaboration.qr_scan_data) {
      try {
        const qrScanData = typeof collaboration.qr_scan_data === 'string'
          ? JSON.parse(collaboration.qr_scan_data)
          : collaboration.qr_scan_data;

        // Récupérer les infos du scanner
        let scannerActor = null;
        if (qrScanData.scanner_user_id || qrScanData.scanner_id) {
          const scannerUserId = qrScanData.scanner_user_id || qrScanData.scanner_id;
          const scannerResult = await this.databaseService.query(
            `SELECT id, nom, prenom FROM users WHERE id = $1`,
            [scannerUserId]
          );
          if (scannerResult.rows.length > 0) {
            const scannerUser = scannerResult.rows[0];
            scannerActor = {
              user_id: scannerUser.id,
              profile_id: qrScanData.scanner_profile_id || null,
              nom: scannerUser.nom,
              prenom: scannerUser.prenom,
            };
          }
        }

        timeline.push({
          action: 'qr_scanned',
          timestamp: qrScanData.scanned_at || qrScanData.timestamp || collaboration.date_creation,
          actor: scannerActor,
          metadata: {
            qr_code_version: qrScanData.qr_code_version || 'v1_userId',
            scanned_profile_id: qrScanData.scanned_profile_id || qrScanData.profile_id_scanned || null,
            scanned_user_id: qrScanData.scanned_user_id || null,
            scanned_profile_type: qrScanData.scanned_profile_type || qrScanData.profile_type_scanned || null,
            scanner_ip: qrScanData.scanner_ip || qrScanData.ip_address || null,
            scanner_user_agent: qrScanData.scanner_user_agent || qrScanData.user_agent || null,
            scanner_device_info: qrScanData.scanner_device_info || null,
          },
        });

        // Ajouter l'action permissions_defined si disponible
        if (qrScanData.permissions_defined_at) {
          timeline.push({
            action: 'permissions_defined',
            timestamp: qrScanData.permissions_defined_at,
            actor: scannerActor,
            metadata: {
              permissions_defined_at: qrScanData.permissions_defined_at,
            },
          });
        }

        // Ajouter l'action invitation_sent
        if (qrScanData.invitation_sent_at) {
          timeline.push({
            action: 'invitation_sent',
            timestamp: qrScanData.invitation_sent_at,
            actor: scannerActor,
            metadata: {},
          });
        }
      } catch (error) {
        this.logger.warn('Erreur lors de l\'analyse des métadonnées QR:', error);
      }
    }

    // Ajouter les actions de l'historique
    for (const row of historyResult.rows) {
      let actor = null;
      if (row.performed_by) {
        actor = {
          user_id: row.performed_by,
          profile_id: row.profile_id || null,
          nom: row.nom || null,
          prenom: row.prenom || null,
        };
      }

      const metadata: Record<string, unknown> = {};
      if (row.device_info) {
        try {
          metadata.device_info = typeof row.device_info === 'string'
            ? JSON.parse(row.device_info)
            : row.device_info;
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
      if (row.action_metadata) {
        try {
          metadata.action_metadata = typeof row.action_metadata === 'string'
            ? JSON.parse(row.action_metadata)
            : row.action_metadata;
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
      if (row.ip_address) {
        metadata.ip_address = row.ip_address;
      }
      if (row.user_agent) {
        metadata.user_agent = row.user_agent;
      }

      // Ajouter les métadonnées spécifiques selon l'action
      if (row.action === 'accepted' || row.action === 'rejected') {
        if (row.new_value) {
          try {
            const newValue = typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value;
            if (newValue.rejection_reason) {
              metadata.rejection_reason = newValue.rejection_reason;
            }
          } catch (e) {
            // Ignorer les erreurs
          }
        }
      }

      timeline.push({
        action: row.action,
        timestamp: row.created_at,
        actor,
        metadata,
      });
    }

    return {
      collaboration_id: collaborationId,
      invitation_type: collaboration.invitation_type || 'manual',
      timeline,
    };
  }

}
