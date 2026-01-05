import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : user_${Date.now()}_${random}
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Normalise l'email (trim + lowercase)
   */
  private normalizeEmail(email?: string): string | null {
    return email ? email.trim().toLowerCase() : null;
  }

  /**
   * Normalise le téléphone (trim + supprime espaces et caractères non numériques sauf +)
   * Exemples:
   * - "+225 07 12 34 56 78" → "+2250712345678"
   * - "07 12 34 56 78" → "0712345678"
   * - "225 07 12 34 56 78" → "2250712345678"
   */
  private normalizeTelephone(telephone?: string): string | null {
    if (!telephone) return null;
    // Supprimer tous les espaces et caractères non numériques sauf +
    let normalized = telephone.trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');
    // Si le numéro commence par +, le garder, sinon supprimer tous les +
    if (normalized.startsWith('+')) {
      normalized = '+' + normalized.substring(1).replace(/\+/g, '');
    } else {
      normalized = normalized.replace(/\+/g, '');
    }
    return normalized || null;
  }

  async create(createUserDto: any) {
    // Vérifier qu'au moins email ou téléphone est fourni
    if (!createUserDto.email && !createUserDto.telephone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const normalizedTelephone = this.normalizeTelephone(createUserDto.telephone);

    // Vérifier si l'email existe déjà (si fourni)
    // NOTE: Cette vérification est déjà faite dans auth.service.register, mais on la garde pour sécurité
    if (normalizedEmail) {
      this.logger.debug(`create: vérification email ${normalizedEmail}`);
      const existingEmail = await this.findByEmail(normalizedEmail);
      if (existingEmail) {
        this.logger.warn(`create: email déjà utilisé, userId=${existingEmail.id}`);
        throw new Error('Un compte existe déjà avec cet email');
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (normalizedTelephone) {
      const existingPhone = await this.findByTelephone(normalizedTelephone);
      if (existingPhone) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    const id = this.generateUserId();
    const now = new Date().toISOString();
    const provider = createUserDto.provider || (normalizedTelephone ? 'telephone' : 'email');

    const result = await this.databaseService.query(
      `INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, 
        provider, provider_id, photo, date_creation, derniere_connexion, is_active,
        roles, active_role, is_onboarded, onboarding_completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        normalizedEmail,
        normalizedTelephone,
        createUserDto.nom,
        createUserDto.prenom,
        createUserDto.password_hash || null,
        provider,
        createUserDto.provider_id || null,
        createUserDto.photo || null,
        now,
        now,
        true,
        createUserDto.roles ? JSON.stringify(createUserDto.roles) : null,
        createUserDto.activeRole || null,
        createUserDto.isOnboarded ? true : false,
        createUserDto.onboardingCompletedAt || null,
      ]
    );
    return this.mapRowToUser(result.rows[0]);
  }

  async findOne(id: string) {
    // Colonnes nécessaires pour mapRowToUser (optimisation: éviter SELECT *)
    const userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
      saved_farms, date_creation, derniere_connexion, roles, active_role, 
      is_onboarded, onboarding_completed_at, is_active`;
    
    const result = await this.databaseService.query(
      `SELECT ${userColumns} FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string, includePasswordHash = false) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      this.logger.debug('findByEmail: email vide ou invalide');
      return null;
    }

    this.logger.debug(`findByEmail: recherche de ${normalizedEmail}`);
    // Colonnes nécessaires pour mapRowToUser (optimisation: éviter SELECT *)
    let userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
      saved_farms, date_creation, derniere_connexion, roles, active_role, 
      is_onboarded, onboarding_completed_at, is_active`;
    
    // Ajouter password_hash si nécessaire pour l'authentification
    if (includePasswordHash) {
      userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
        saved_farms, date_creation, derniere_connexion, roles, active_role, 
        is_onboarded, onboarding_completed_at, is_active, password_hash`;
    }
    
    const result = await this.databaseService.query(
      `SELECT ${userColumns} FROM users WHERE email = $1 AND is_active = true`,
      [normalizedEmail]
    );
    
    this.logger.debug(`findByEmail: ${result.rows.length} utilisateur(s) trouvé(s)`);
    
    if (!result.rows[0]) return null;
    
    const user = this.mapRowToUser(result.rows[0]);
    
    // Inclure password_hash si demandé
    if (includePasswordHash && result.rows[0].password_hash) {
      (user as any).password_hash = result.rows[0].password_hash;
    }
    
    return user;
  }

  async findByTelephone(telephone: string, includePasswordHash = false) {
    this.logger.debug(`findByTelephone: recherche avec téléphone original="${telephone}"`);
    const normalizedTelephone = this.normalizeTelephone(telephone);
    if (!normalizedTelephone) {
      this.logger.debug(`findByTelephone: téléphone normalisé vide pour "${telephone}"`);
      return null;
    }
    
    this.logger.debug(`findByTelephone: téléphone normalisé="${normalizedTelephone}"`);

    // Colonnes nécessaires pour mapRowToUser (optimisation: éviter SELECT *)
    let userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
      saved_farms, date_creation, derniere_connexion, roles, active_role, 
      is_onboarded, onboarding_completed_at, is_active`;
    
    // Ajouter password_hash si nécessaire pour l'authentification
    if (includePasswordHash) {
      userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
        saved_farms, date_creation, derniere_connexion, roles, active_role, 
        is_onboarded, onboarding_completed_at, is_active, password_hash`;
    }

    const result = await this.databaseService.query(
      `SELECT ${userColumns} FROM users WHERE telephone = $1 AND is_active = true`,
      [normalizedTelephone]
    );
    this.logger.debug(`findByTelephone: ${result.rows.length} utilisateur(s) trouvé(s) pour "${normalizedTelephone}"`);
    
    if (!result.rows[0]) {
      // Essayer aussi sans le + au début si le numéro commence par +
      if (normalizedTelephone.startsWith('+')) {
        const withoutPlus = normalizedTelephone.substring(1);
        this.logger.debug(`findByTelephone: tentative alternative sans + pour "${withoutPlus}"`);
        const result2 = await this.databaseService.query(
          `SELECT ${userColumns} FROM users WHERE telephone = $1 AND is_active = true`,
          [withoutPlus]
        );
        if (result2.rows[0]) {
          this.logger.debug(`findByTelephone: utilisateur trouvé avec variante sans +`);
          const user = this.mapRowToUser(result2.rows[0]);
          if (includePasswordHash && result2.rows[0].password_hash) {
            (user as any).password_hash = result2.rows[0].password_hash;
          }
          return user;
        }
      }
      return null;
    }
    
    const user = this.mapRowToUser(result.rows[0]);
    this.logger.debug(`findByTelephone: utilisateur trouvé userId=${user.id}, telephone=${user.telephone}`);
    
    // Inclure password_hash si demandé
    if (includePasswordHash && result.rows[0].password_hash) {
      (user as any).password_hash = result.rows[0].password_hash;
      this.logger.debug(`findByTelephone: password_hash inclus pour userId=${user.id}`);
    } else if (includePasswordHash) {
      this.logger.warn(`findByTelephone: password_hash demandé mais absent pour userId=${user.id}`);
    }
    
    return user;
  }

  async findByProviderId(provider: string, providerId: string) {
    if (!provider || !providerId) return null;

    this.logger.debug(`findByProviderId: recherche de ${provider} ${providerId}`);
    // Colonnes nécessaires pour mapRowToUser (optimisation: éviter SELECT *)
    const userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
      saved_farms, date_creation, derniere_connexion, roles, active_role, 
      is_onboarded, onboarding_completed_at, is_active`;
    
    const result = await this.databaseService.query(
      `SELECT ${userColumns} FROM users WHERE provider = $1 AND provider_id = $2 AND is_active = true`,
      [provider, providerId]
    );
    this.logger.debug(`findByProviderId: ${result.rows.length} utilisateur(s) trouvé(s)`);
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByIdentifier(identifier: string) {
    const normalized = identifier.trim();
    const isEmail = normalized.includes('@');

    if (isEmail) {
      return this.findByEmail(normalized.toLowerCase());
    } else {
      const cleanPhone = normalized.replace(/\s+/g, '');
      return this.findByTelephone(cleanPhone);
    }
  }

  async updateLastConnection(id: string): Promise<void> {
    await this.databaseService.query('UPDATE users SET derniere_connexion = $1 WHERE id = $2', [
      new Date().toISOString(),
      id,
    ]);
  }

  async findAll() {
    // Colonnes nécessaires pour mapRowToUser (optimisation: éviter SELECT *)
    const userColumns = `id, email, telephone, nom, prenom, provider, provider_id, photo, 
      saved_farms, date_creation, derniere_connexion, roles, active_role, 
      is_onboarded, onboarding_completed_at, is_active`;
    
    const result = await this.databaseService.query(
      `SELECT ${userColumns} FROM users WHERE is_active = true ORDER BY date_creation DESC`
    );
    return result.rows.map((row) => this.mapRowToUser(row));
  }

  async update(id: string, updateUserDto: any) {
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new Error('Utilisateur introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateUserDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateUserDto.nom);
      paramIndex++;
    }
    if (updateUserDto.prenom !== undefined) {
      fields.push(`prenom = $${paramIndex}`);
      values.push(updateUserDto.prenom);
      paramIndex++;
    }
    if (updateUserDto.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(this.normalizeEmail(updateUserDto.email));
      paramIndex++;
    }
    if (updateUserDto.telephone !== undefined) {
      fields.push(`telephone = $${paramIndex}`);
      values.push(this.normalizeTelephone(updateUserDto.telephone));
      paramIndex++;
    }
    if (updateUserDto.photo !== undefined) {
      fields.push(`photo = $${paramIndex}`);
      values.push(updateUserDto.photo);
      paramIndex++;
    }
    if (updateUserDto.roles !== undefined) {
      fields.push(`roles = $${paramIndex}`);
      values.push(JSON.stringify(updateUserDto.roles));
      paramIndex++;
    }
    if (updateUserDto.activeRole !== undefined) {
      fields.push(`active_role = $${paramIndex}`);
      values.push(updateUserDto.activeRole);
      paramIndex++;
    }
    if (updateUserDto.isOnboarded !== undefined) {
      fields.push(`is_onboarded = $${paramIndex}`);
      values.push(updateUserDto.isOnboarded);
      paramIndex++;
    }
    if (updateUserDto.onboardingCompletedAt !== undefined) {
      fields.push(`onboarding_completed_at = $${paramIndex}`);
      values.push(updateUserDto.onboardingCompletedAt);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existingUser;
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async remove(id: string) {
    await this.databaseService.query('DELETE FROM users WHERE id = $1', [id]);
    return { id };
  }

  /**
   * Ajoute un profil à un utilisateur (producteur, acheteur, etc.)
   * Crée un profil minimal si le profil n'existe pas encore
   */
  async addProfile(userId: string, profileName: string) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const validProfiles = ['producer', 'buyer', 'veterinarian', 'technician'];
    const normalizedProfile = profileName.toLowerCase();
    
    if (!validProfiles.includes(normalizedProfile)) {
      throw new Error(`Profil invalide: ${profileName}. Profils valides: ${validProfiles.join(', ')}`);
    }

    // Récupérer les rôles actuels
    let roles = user.roles || {};

    // Vérifier si le profil existe déjà
    if (roles[normalizedProfile]) {
      this.logger.debug(`addProfile: profil ${normalizedProfile} existe déjà pour userId=${userId}`);
      return user; // Retourner l'utilisateur tel quel si le profil existe déjà
    }

    // Créer un profil minimal selon le type
    let newProfile: any = {
      isActive: true,
      activatedAt: new Date().toISOString(),
    };

    switch (normalizedProfile) {
      case 'producer':
        // Profil producteur minimal (sera complété lors de la création du projet)
        newProfile = {
          ...newProfile,
          farmName: '', // Sera défini lors de la création du projet
          farmType: 'individual', // Par défaut
          capacity: {
            totalCapacity: 0,
            currentOccupancy: 0,
          },
          stats: {
            totalSales: 0,
            totalRevenue: 0,
            averageRating: 0,
            totalReviews: 0,
          },
          marketplaceSettings: {
            defaultPricePerKg: 450,
            autoAcceptOffers: false,
            minimumOfferPercentage: 80,
            notificationsEnabled: true,
          },
        };
        break;
      case 'buyer':
        newProfile = {
          ...newProfile,
          buyerType: 'individual',
          businessInfo: null,
          purchaseHistory: {
            totalPurchases: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            preferredRaces: [],
          },
          preferences: {
            preferredWeightRange: { min: 20, max: 150 },
            maxDistance: 50,
            notifyNewListings: true,
            notifyPriceDrops: false,
          },
          rating: {
            asReviewer: 0,
            totalReviewsGiven: 0,
          },
        };
        break;
      case 'veterinarian':
        newProfile = {
          ...newProfile,
          validationStatus: 'pending',
          submittedAt: new Date().toISOString(),
          qualifications: null,
          specializations: [],
          stats: {
            totalConsultations: 0,
            totalClients: 0,
            averageRating: 0,
          },
        };
        break;
      case 'technician':
        newProfile = {
          ...newProfile,
          level: 'junior',
          skills: [],
          stats: {
            totalConsultations: 0,
            totalClients: 0,
            averageRating: 0,
          },
        };
        break;
    }

    // Ajouter le nouveau profil
    roles[normalizedProfile] = newProfile;

    // Mettre à jour l'utilisateur
    const updatedUser = await this.update(userId, {
      roles: roles,
    });

    this.logger.log(`addProfile: profil ${normalizedProfile} ajouté avec succès pour userId=${userId}`);
    return updatedUser;
  }

  /**
   * Supprime un profil d'un utilisateur et toutes ses données associées
   * Vérifie qu'il reste au moins un autre profil
   */
  async removeProfile(userId: string, profileName: string) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const normalizedProfile = profileName.toLowerCase();
    const roles = user.roles || {};

    // Vérifier que le profil existe
    if (!roles[normalizedProfile]) {
      throw new Error(`Le profil ${profileName} n'existe pas pour cet utilisateur`);
    }

    // Vérifier qu'il reste au moins un autre profil
    const remainingProfiles = Object.keys(roles).filter((p) => p !== normalizedProfile);
    if (remainingProfiles.length === 0) {
      throw new Error(
        'Impossible de supprimer le dernier profil. Vous devez avoir au moins un profil. Pour supprimer votre compte, utilisez l\'option "Supprimer mon compte".'
      );
    }

    // Utiliser une transaction pour garantir la cohérence
    return await this.databaseService.transaction(async (client) => {
      try {
        // Supprimer les données associées selon le type de profil
        switch (normalizedProfile) {
          case 'producer':
            await this.deleteProducerData(userId, client);
            break;
          case 'buyer':
            await this.deleteBuyerData(userId, client);
            break;
          case 'veterinarian':
            await this.deleteVeterinarianData(userId, client);
            break;
          case 'technician':
            await this.deleteTechnicianData(userId, client);
            break;
        }

        // Retirer le profil de la liste des rôles
        delete roles[normalizedProfile];

        // Si le rôle actif était celui qu'on supprime, changer le rôle actif
        let activeRole = user.activeRole;
        if (activeRole === normalizedProfile) {
          // Utiliser le premier profil restant
          activeRole = remainingProfiles[0] as any;
        }

        // Mettre à jour l'utilisateur
        const updatedUser = await this.update(userId, {
          roles: roles,
          activeRole: activeRole,
        });

        this.logger.log(`removeProfile: profil ${normalizedProfile} supprimé avec succès pour userId=${userId}`);
        return updatedUser;
      } catch (error) {
        this.logger.error(`Erreur lors de la suppression du profil ${normalizedProfile}:`, error);
        throw error;
      }
    });
  }

  /**
   * Supprime toutes les données associées au profil producteur
   */
  private async deleteProducerData(userId: string, client: any): Promise<void> {
    this.logger.debug(`deleteProducerData: suppression des données producteur pour userId=${userId}`);

    // 1. Récupérer tous les projets du producteur
    const projetsResult = await client.query(
      'SELECT id FROM projets WHERE proprietaire_id = $1',
      [userId]
    );
    const projetIds = projetsResult.rows.map((row: any) => row.id);

    if (projetIds.length > 0) {
      // 2. Supprimer les annonces marketplace liées aux projets
      await client.query(
        'DELETE FROM marketplace_listings WHERE producteur_id = $1',
        [userId]
      );

      // 3. Supprimer les offres du producteur (qui sont aussi acheteur peut-être, mais on supprime ses offres en tant que producteur)
      // Note: On garde les offres où il est acheteur pour l'historique
      await client.query(
        `DELETE FROM marketplace_offers WHERE producteur_id = $1`,
        [userId]
      );

      // 4. Supprimer les transactions du producteur
      await client.query(
        'DELETE FROM marketplace_transactions WHERE producteur_id = $1',
        [userId]
      );

      // Pour chaque projet, supprimer les données associées
      for (const projetId of projetIds) {
        // Supprimer les animaux individuels
        await client.query(
          'DELETE FROM production_animaux WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les bandes (cela supprimera automatiquement les batch_pigs via CASCADE)
        await client.query(
          'DELETE FROM batches WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les données financières
        await client.query(
          'DELETE FROM revenus WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM depenses WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les ventes
        await client.query(
          'DELETE FROM ventes WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les collaborations (où il est propriétaire)
        await client.query(
          'DELETE FROM collaborations WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les données de santé (vaccinations, maladies, etc.)
        await client.query(
          'DELETE FROM vaccinations WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM maladies WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM traitements WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les pesées
        await client.query(
          'DELETE FROM pesees WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM batch_weighings WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les mortalités
        await client.query(
          'DELETE FROM mortalites WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM batch_mortalites WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les gestations
        await client.query(
          'DELETE FROM gestations WHERE projet_id = $1',
          [projetId]
        );
        await client.query(
          'DELETE FROM batch_gestations WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les migrations
        await client.query(
          'DELETE FROM migrations WHERE projet_id = $1',
          [projetId]
        );

        // Supprimer les rapports de croissance
        await client.query(
          'DELETE FROM rapports_croissance WHERE projet_id = $1',
          [projetId]
        );
      }

      // 5. Supprimer les projets eux-mêmes
      await client.query(
        'DELETE FROM projets WHERE proprietaire_id = $1',
        [userId]
      );
    }

    this.logger.log(`deleteProducerData: ${projetIds.length} projet(s) et données associées supprimés pour userId=${userId}`);
  }

  /**
   * Supprime toutes les données associées au profil acheteur
   */
  private async deleteBuyerData(userId: string, client: any): Promise<void> {
    this.logger.debug(`deleteBuyerData: suppression des données acheteur pour userId=${userId}`);

    // Supprimer les offres de l'acheteur
    await client.query(
      'DELETE FROM marketplace_offers WHERE acheteur_id = $1',
      [userId]
    );

    // Garder les ventes pour l'historique du producteur, mais anonymiser
    // (ou supprimer si nécessaire)
    await client.query(
      'UPDATE ventes SET acheteur_id = NULL WHERE acheteur_id = $1',
      [userId]
    );

    this.logger.log(`deleteBuyerData: données acheteur supprimées pour userId=${userId}`);
  }

  /**
   * Supprime toutes les données associées au profil vétérinaire
   */
  private async deleteVeterinarianData(userId: string, client: any): Promise<void> {
    this.logger.debug(`deleteVeterinarianData: suppression des données vétérinaire pour userId=${userId}`);

    // Supprimer les collaborations (où il est collaborateur vétérinaire)
    await client.query(
      `DELETE FROM collaborations WHERE user_id = $1 AND role = 'veterinaire'`,
      [userId]
    );

    // Supprimer les notes vétérinaires (si table existe)
    try {
      await client.query(
        'DELETE FROM notes_veterinaires WHERE veterinaire_id = $1',
        [userId]
      );
    } catch (error: any) {
      // Si la table n'existe pas, ignorer
      if (!error.message?.includes('does not exist') && !error.message?.includes("n'existe pas")) {
        throw error;
      }
    }

    this.logger.log(`deleteVeterinarianData: données vétérinaire supprimées pour userId=${userId}`);
  }

  /**
   * Supprime toutes les données associées au profil technicien
   */
  private async deleteTechnicianData(userId: string, client: any): Promise<void> {
    this.logger.debug(`deleteTechnicianData: suppression des données technicien pour userId=${userId}`);

    // Supprimer les collaborations (où il est collaborateur technicien)
    await client.query(
      `DELETE FROM collaborations WHERE user_id = $1 AND role = 'technicien'`,
      [userId]
    );

    // Supprimer les rapports techniques (si table existe)
    try {
      await client.query(
        'DELETE FROM rapports_techniques WHERE technicien_id = $1',
        [userId]
      );
    } catch (error: any) {
      // Si la table n'existe pas, ignorer
      if (!error.message?.includes('does not exist') && !error.message?.includes("n'existe pas")) {
        throw error;
      }
    }

    this.logger.log(`deleteTechnicianData: données technicien supprimées pour userId=${userId}`);
  }

  /**
   * Mapper une ligne de la base de données vers un objet User (comme le frontend)
   */
  private mapRowToUser(row: any): any {
    // Parser saved_farms depuis JSON
    let savedFarms: string[] = [];
    if (row.saved_farms) {
      try {
        savedFarms = JSON.parse(row.saved_farms);
      } catch (e) {
        savedFarms = [];
      }
    }

    // Parser roles depuis JSON
    let roles: any = undefined;
    if (row.roles) {
      try {
        roles = typeof row.roles === 'string' ? JSON.parse(row.roles) : row.roles;
      } catch (e) {
        roles = undefined;
      }
    }

    return {
      id: row.id,
      email: row.email || undefined,
      telephone: row.telephone || undefined,
      nom: row.nom,
      prenom: row.prenom,
      provider: row.provider || 'email',
      photo: row.photo || undefined,
      saved_farms: savedFarms.length > 0 ? savedFarms : undefined,
      date_creation: row.date_creation,
      derniere_connexion: row.derniere_connexion || row.date_creation,
      roles: roles,
      activeRole: row.active_role || undefined,
      isOnboarded: row.is_onboarded === true || row.is_onboarded === 1,
      onboardingCompletedAt: row.onboarding_completed_at || undefined,
      is_active: row.is_active === true || row.is_active === 1, // Important pour le guard JWT
    };
  }
}
