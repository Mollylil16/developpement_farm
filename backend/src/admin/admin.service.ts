import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { AdminJWTPayload } from './interfaces/admin-jwt-payload.interface';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const result = await this.db.query(
      'SELECT * FROM admins WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const admin = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Mettre à jour last_login
    await this.db.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1',
      [admin.id],
    );

    return {
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      prenom: admin.prenom,
    };
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    try {
      const admin = await this.validateAdmin(email, password);

      const payload: AdminJWTPayload = {
        sub: admin.id,
        email: admin.email,
        iat: Math.floor(Date.now() / 1000),
        // exp sera ajouté automatiquement par jwtService.sign() grâce à expiresIn dans la config
        jti: uuidv4(),
        type: 'admin',
      };

      try {
        const accessToken = this.jwtService.sign(payload);
        return {
          access_token: accessToken,
          expires_in: 8 * 3600,
          admin: {
            id: admin.id,
            email: admin.email,
            nom: admin.nom,
            prenom: admin.prenom,
          },
        };
      } catch (jwtError: any) {
        console.error('Erreur lors de la signature JWT:', jwtError);
        if (jwtError.message?.includes('secret') || jwtError.message?.includes('Secret')) {
          throw new Error('JWT_SECRET n\'est pas configuré. Vérifiez votre fichier .env');
        }
        throw jwtError;
      }
    } catch (error) {
      console.error('Erreur dans admin login:', error);
      throw error;
    }
  }

  async findOne(adminId: string) {
    const result = await this.db.query('SELECT * FROM admins WHERE id = $1', [adminId]);

    if (result.rows.length === 0) {
      throw new NotFoundException('Administrateur introuvable');
    }

    const admin = result.rows[0];
    return {
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      prenom: admin.prenom,
      is_active: admin.is_active,
      created_at: admin.created_at,
      last_login: admin.last_login,
    };
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(period?: string) {
    // Déterminer l'intervalle selon la période
    let dateFilter = ''
    if (period === '7j') {
      dateFilter = "WHERE date_creation >= NOW() - INTERVAL '7 days'"
    } else if (period === '1m') {
      dateFilter = "WHERE date_creation >= NOW() - INTERVAL '30 days'"
    } else if (period === '1a') {
      dateFilter = "WHERE date_creation >= NOW() - INTERVAL '365 days'"
    }
    // 'Tout' = pas de filtre

    // Stats utilisateurs
    const usersStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
        COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_users,
        COUNT(*) FILTER (WHERE date_creation >= NOW() - INTERVAL '30 days') as new_users_30d,
        COUNT(*) FILTER (WHERE date_creation >= NOW() - INTERVAL '7 days') as new_users_7d
      FROM users
      ${dateFilter}
    `);

    // Stats par rôle (producteur, acheteur, vétérinaire, technicien)
    let rolesStatsQuery = `
      SELECT 
        active_role,
        COUNT(*) as count
      FROM users
      WHERE active_role IS NOT NULL
    `
    if (dateFilter) {
      // Remplacer WHERE par AND car on a déjà un WHERE
      rolesStatsQuery += ` ${dateFilter.replace('WHERE ', 'AND ')}`
    }
    rolesStatsQuery += ` GROUP BY active_role`
    const rolesStats = await this.db.query(rolesStatsQuery);

    // Stats détaillées par rôle
    let rolesDetailedQuery = `
      SELECT 
        active_role,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
        COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_count,
        COUNT(*) FILTER (WHERE date_creation >= NOW() - INTERVAL '30 days') as new_30d
      FROM users
      WHERE active_role IS NOT NULL
    `
    if (dateFilter) {
      // Remplacer WHERE par AND car on a déjà un WHERE
      rolesDetailedQuery += ` ${dateFilter.replace('WHERE ', 'AND ')}`
    }
    rolesDetailedQuery += ` GROUP BY active_role`
    
    const rolesDetailed = await this.db.query(rolesDetailedQuery);

    // Stats projets
    const projectsStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE statut = 'actif') as active_projects,
        COUNT(*) FILTER (WHERE statut = 'archive') as archived_projects
      FROM projets
    `);

    // Stats animaux
    const animalsStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_animals,
        COUNT(*) FILTER (WHERE sexe = 'femelle' AND reproducteur = TRUE) as truies,
        COUNT(*) FILTER (WHERE sexe = 'male' AND reproducteur = TRUE) as verrats,
        COUNT(*) FILTER (WHERE (sexe = 'femelle' AND reproducteur = FALSE) OR (sexe = 'male' AND reproducteur = FALSE) OR sexe = 'indetermine') as autres
      FROM production_animaux
      WHERE actif = TRUE
    `);

    // Stats abonnements
    const subscriptionsStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_subscriptions,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions
      FROM user_subscriptions
    `);

    // MRR (Monthly Recurring Revenue)
    const mrrResult = await this.db.query(`
      SELECT COALESCE(SUM(sp.price_monthly), 0) as mrr
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
        AND (us.expires_at IS NULL OR us.expires_at > NOW())
    `);

    // ARR (Annual Recurring Revenue) = MRR * 12
    const mrr = parseFloat(mrrResult.rows[0]?.mrr || '0');
    const arr = mrr * 12;

    // Revenus du mois en cours
    const currentMonthRevenue = await this.db.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM transactions
      WHERE status = 'completed'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        AND currency = 'XOF'
    `);

    // Revenus du mois précédent
    const lastMonthRevenue = await this.db.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM transactions
      WHERE status = 'completed'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND currency = 'XOF'
    `);

    const currentRevenue = parseFloat(currentMonthRevenue.rows[0]?.revenue || '0');
    const lastRevenue = parseFloat(lastMonthRevenue.rows[0]?.revenue || '0');
    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Nouveaux clients ce mois
    const newCustomersThisMonth = await this.db.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_subscriptions
      WHERE DATE_TRUNC('month', started_at) = DATE_TRUNC('month', NOW())
        AND status = 'active'
    `);

    // Churn rate (abonnements annulés ce mois / abonnements actifs début du mois)
    const churnResult = await this.db.query(`
      WITH active_start_month AS (
        SELECT COUNT(*) as count
        FROM user_subscriptions
        WHERE status = 'active'
          AND started_at < DATE_TRUNC('month', NOW())
      ),
      cancelled_this_month AS (
        SELECT COUNT(*) as count
        FROM user_subscriptions
        WHERE status = 'cancelled'
          AND DATE_TRUNC('month', cancelled_at) = DATE_TRUNC('month', NOW())
      )
      SELECT 
        COALESCE((c.count::NUMERIC / NULLIF(a.count, 0)) * 100, 0) as churn_rate
      FROM active_start_month a, cancelled_this_month c
    `);

    return {
      users: usersStats.rows[0] || {},
      roles: {
        distribution: rolesStats.rows || [],
        detailed: rolesDetailed.rows || [],
      },
      projects: projectsStats.rows[0] || {},
      animals: animalsStats.rows[0] || {},
      subscriptions: subscriptionsStats.rows[0] || {},
      finance: {
        mrr,
        arr,
        current_month_revenue: currentRevenue,
        last_month_revenue: lastRevenue,
        revenue_growth_percent: revenueGrowth,
        new_customers_this_month: parseInt(newCustomersThisMonth.rows[0]?.count || '0'),
        churn_rate_percent: parseFloat(churnResult.rows[0]?.churn_rate || '0'),
      },
    };
  }

  // ==================== FINANCE ====================

  async getFinanceStats(period: 'day' | 'week' | 'month' = 'month') {
    let interval: string;
    switch (period) {
      case 'day':
        interval = '1 day';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      default:
        interval = '30 days';
    }

    // Revenus par période
    const revenueByPeriod = await this.db.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as revenue,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);

    // Revenus par plan
    const revenueByPlan = await this.db.query(`
      SELECT 
        sp.name as plan_name,
        sp.display_name,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_revenue
      FROM transactions t
      JOIN subscription_plans sp ON t.plan_id = sp.id
      WHERE t.status = 'completed'
        AND t.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY sp.id, sp.name, sp.display_name
      ORDER BY total_revenue DESC
    `);

    // Revenus par méthode de paiement
    const revenueByPaymentMethod = await this.db.query(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(amount) as total_revenue
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY payment_method
      ORDER BY total_revenue DESC
    `);

    return {
      revenue_by_period: revenueByPeriod.rows,
      revenue_by_plan: revenueByPlan.rows,
      revenue_by_payment_method: revenueByPaymentMethod.rows,
    };
  }

  async getTransactions(page: number = 1, limit: number = 50, filters?: any) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        t.*,
        u.email as user_email,
        u.nom as user_nom,
        u.prenom as user_prenom,
        sp.display_name as plan_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.payment_method) {
      query += ` AND t.payment_method = $${paramIndex}`;
      params.push(filters.payment_method);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const transactions = await this.db.query(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters?.status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(filters.status);
      countParamIndex++;
    }

    if (filters?.payment_method) {
      countQuery += ` AND payment_method = $${countParamIndex}`;
      countParams.push(filters.payment_method);
      countParamIndex++;
    }

    const countResult = await this.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return {
      data: transactions.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== USERS & SUBSCRIPTIONS ====================

  async getUsersWithSubscriptions(page: number = 1, limit: number = 50, filters?: any) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        u.id,
        u.email,
        u.telephone,
        u.nom,
        u.prenom,
        u.is_active,
        u.date_creation,
        u.derniere_connexion,
        u.roles,
        u.active_role,
        u.is_onboarded,
        us.id as subscription_id,
        us.status as subscription_status,
        us.started_at as subscription_started_at,
        us.expires_at as subscription_expires_at,
        sp.name as plan_name,
        sp.display_name as plan_display_name,
        sp.price_monthly as plan_price
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id 
        AND us.status = 'active'
        AND (us.expires_at IS NULL OR us.expires_at > NOW())
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.role) {
      query += ` AND u.active_role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (u.email ILIKE $${paramIndex} OR u.nom ILIKE $${paramIndex} OR u.prenom ILIKE $${paramIndex} OR u.telephone ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.has_subscription !== undefined) {
      if (filters.has_subscription) {
        query += ` AND us.id IS NOT NULL`;
      } else {
        query += ` AND us.id IS NULL`;
      }
    }

    if (filters?.subscription_status) {
      query += ` AND us.status = $${paramIndex}`;
      params.push(filters.subscription_status);
      paramIndex++;
    }

    query += ` ORDER BY u.date_creation DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const users = await this.db.query(query, params);

    // Count total
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id 
        AND us.status = 'active'
        AND (us.expires_at IS NULL OR us.expires_at > NOW())
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters?.role) {
      countQuery += ` AND u.active_role = $${countParamIndex}`;
      countParams.push(filters.role);
      countParamIndex++;
    }

    if (filters?.search) {
      countQuery += ` AND (u.email ILIKE $${countParamIndex} OR u.nom ILIKE $${countParamIndex} OR u.prenom ILIKE $${countParamIndex} OR u.telephone ILIKE $${countParamIndex})`;
      countParams.push(`%${filters.search}%`);
      countParamIndex++;
    }

    if (filters?.has_subscription !== undefined) {
      if (filters.has_subscription) {
        countQuery += ` AND us.id IS NOT NULL`;
      } else {
        countQuery += ` AND us.id IS NULL`;
      }
    }

    if (filters?.subscription_status) {
      countQuery += ` AND us.status = $${countParamIndex}`;
      countParams.push(filters.subscription_status);
      countParamIndex++;
    }

    const countResult = await this.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return {
      data: users.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== PROJECTS ====================

  async getProjects(page: number = 1, limit: number = 50, filters?: any) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        p.id,
        p.nom,
        p.notes as description,
        p.proprietaire_id as user_id,
        p.statut,
        p.date_creation,
        p.derniere_modification as date_modification,
        u.email as user_email,
        u.nom as user_nom,
        u.prenom as user_prenom,
        u.active_role as user_role,
        COALESCE(animal_counts.total_animals, 0) as total_animals
      FROM projets p
      LEFT JOIN users u ON p.proprietaire_id = u.id
      LEFT JOIN (
        SELECT projet_id, COUNT(*) as total_animals
        FROM production_animaux
        WHERE actif = TRUE
        GROUP BY projet_id
      ) animal_counts ON p.id = animal_counts.projet_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.statut) {
      query += ` AND p.statut = $${paramIndex}`;
      params.push(filters.statut);
      paramIndex++;
    }

    if (filters?.user_id) {
      query += ` AND p.proprietaire_id = $${paramIndex}`;
      params.push(filters.user_id);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (p.nom ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.nom ILIKE $${paramIndex} OR u.prenom ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.date_creation DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await this.db.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM projets p
      LEFT JOIN users u ON p.proprietaire_id = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters?.statut) {
      countQuery += ` AND p.statut = $${countParamIndex}`;
      countParams.push(filters.statut);
      countParamIndex++;
    }

    if (filters?.user_id) {
      countQuery += ` AND p.proprietaire_id = $${countParamIndex}`;
      countParams.push(filters.user_id);
      countParamIndex++;
    }

    if (filters?.search) {
      countQuery += ` AND (p.nom ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex} OR u.nom ILIKE $${countParamIndex} OR u.prenom ILIKE $${countParamIndex})`;
      countParams.push(`%${filters.search}%`);
      countParamIndex++;
    }

    const total = await this.db.query(countQuery, countParams);

    return {
      data: data.rows,
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0]?.total || '0'),
        total_pages: Math.ceil(parseInt(total.rows[0]?.total || '0') / limit),
      },
    };
  }

  // ==================== USER DETAILS ====================

  async getUserDetail(userId: string) {
    // Informations utilisateur
    const user = await this.db.query(
      `SELECT id, email, telephone, nom, prenom, date_creation, derniere_connexion, is_active, active_role, roles, is_onboarded FROM users WHERE id = $1`,
      [userId]
    );

    if (user.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    // Abonnements
    const subscriptions = await this.db.query(
      `SELECT us.*, sp.name as plan_name, sp.display_name, sp.price_monthly
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1
       ORDER BY us.created_at DESC`,
      [userId]
    );

    // Transactions
    const transactions = await this.db.query(
      `SELECT t.*, sp.display_name as plan_name
       FROM transactions t
       LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Projets
    const projects = await this.db.query(
      `SELECT p.*, COUNT(DISTINCT pa.id) as total_animals
       FROM projets p
       LEFT JOIN production_animaux pa ON p.id = pa.projet_id AND pa.actif = TRUE
       WHERE p.proprietaire_id = $1
       GROUP BY p.id
       ORDER BY p.date_creation DESC`,
      [userId]
    );

    return {
      user: user.rows[0],
      subscriptions: subscriptions.rows,
      transactions: transactions.rows,
      projects: projects.rows,
    };
  }

  // ==================== USER ACTIONS ====================

  async updateUserStatus(userId: string, isActive: boolean) {
    await this.db.query(
      `UPDATE users SET is_active = $1 WHERE id = $2`,
      [isActive, userId]
    );
    return { success: true, message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` };
  }

  async updateUserSubscription(userId: string, subscriptionId: string, status: string) {
    await this.db.query(
      `UPDATE user_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
      [status, subscriptionId, userId]
    );
    return { success: true, message: 'Abonnement mis à jour avec succès' };
  }

  // ==================== REVENUE TREND ====================

  async getRevenueTrend(months: number = 6) {
    const revenueTrend = await this.db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    return revenueTrend.rows;
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(limit: number = 10) {
    // Notifications système (transactions récentes, nouveaux utilisateurs, etc.)
    const recentTransactions = await this.db.query(`
      SELECT 
        'transaction' as type,
        'Nouvelle transaction' as title,
        CONCAT('Transaction de ', amount, ' CFA') as message,
        created_at as created_at,
        id as reference_id
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const newUsers = await this.db.query(`
      SELECT 
        'user' as type,
        'Nouvel utilisateur' as title,
        CONCAT(prenom, ' ', nom, ' s''est inscrit') as message,
        date_creation as created_at,
        id as reference_id
      FROM users
      WHERE date_creation >= NOW() - INTERVAL '7 days'
      ORDER BY date_creation DESC
      LIMIT 5
    `);

    const newSubscriptions = await this.db.query(`
      SELECT 
        'subscription' as type,
        'Nouvel abonnement' as title,
        CONCAT('Abonnement ', sp.display_name, ' activé') as message,
        us.started_at as created_at,
        us.id as reference_id
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
        AND us.started_at >= NOW() - INTERVAL '7 days'
      ORDER BY us.started_at DESC
      LIMIT 5
    `);

    // Combiner et trier toutes les notifications
    const allNotifications = [
      ...recentTransactions.rows,
      ...newUsers.rows,
      ...newSubscriptions.rows,
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    // Compter les non lues (pour l'instant, on considère toutes comme non lues)
    const unreadCount = allNotifications.length;

    return {
      notifications: allNotifications,
      unread_count: unreadCount,
    };
  }

  // ==================== GLOBAL SEARCH ====================

  async globalSearch(query: string) {
    if (!query || query.length < 2) {
      return { users: [], projects: [], transactions: [] };
    }

    const searchTerm = `%${query}%`;

    // Recherche utilisateurs
    const users = await this.db.query(`
      SELECT 
        'user' as type,
        id,
        CONCAT(prenom, ' ', nom) as title,
        email as subtitle,
        '/users/' || id as url
      FROM users
      WHERE email ILIKE $1 OR nom ILIKE $1 OR prenom ILIKE $1 OR telephone ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    // Recherche projets
    const projects = await this.db.query(`
      SELECT 
        'project' as type,
        p.id,
        p.nom as title,
        u.email as subtitle,
        '/projects' as url
      FROM projets p
      LEFT JOIN users u ON p.proprietaire_id = u.id
      WHERE p.nom ILIKE $1 OR u.email ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    // Recherche transactions récentes
    const transactions = await this.db.query(`
      SELECT 
        'transaction' as type,
        t.id,
        CONCAT('Transaction ', t.amount, ' CFA') as title,
        u.email as subtitle,
        '/finance' as url
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE u.email ILIKE $1 OR CAST(t.amount AS TEXT) ILIKE $1
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [searchTerm]);

    return {
      users: users.rows,
      projects: projects.rows,
      transactions: transactions.rows,
    };
  }

  // ==================== COMMUNICATION & MESSAGES ====================

  async sendMessage(
    adminId: string,
    subject: string,
    content: string,
    type: string,
    targetAudience: string,
    targetUserIds?: string[],
    targetRoles?: string[],
  ) {
    const messageId = uuidv4();

    // Créer l'enregistrement du message
    await this.db.query(
      `INSERT INTO admin_messages (id, subject, content, type, target_audience, target_user_ids, target_roles, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sending')`,
      [messageId, subject, content, type, targetAudience, targetUserIds || null, targetRoles || null, adminId],
    );

    // Récupérer les utilisateurs ciblés
    let usersQuery = 'SELECT id, email, nom, prenom FROM users WHERE is_active = TRUE';
    const params: any[] = [];
    let paramIndex = 1;

    if (targetAudience === 'specific_users' && targetUserIds && targetUserIds.length > 0) {
      usersQuery += ` AND id = ANY($${paramIndex})`;
      params.push(targetUserIds);
      paramIndex++;
    } else if (targetAudience === 'by_role' && targetRoles && targetRoles.length > 0) {
      usersQuery += ` AND active_role = ANY($${paramIndex})`;
      params.push(targetRoles);
      paramIndex++;
    } else if (targetAudience === 'active_users') {
      usersQuery += ` AND derniere_connexion >= NOW() - INTERVAL '30 days'`;
    } else if (targetAudience === 'new_users') {
      usersQuery += ` AND date_creation >= NOW() - INTERVAL '7 days'`;
    }
    // 'all' = pas de filtre supplémentaire

    const users = await this.db.query(usersQuery, params);

    // Générer le template email
    const emailHtml = this.emailService.generateEmailTemplate(type, content);

    // Envoyer les emails
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users.rows) {
      if (!user.email) continue;

      const personalizedContent = emailHtml
        .replace(/\{\{name\}\}/g, `${user.prenom} ${user.nom}`)
        .replace(/\{\{email\}\}/g, user.email);

      const success = await this.emailService.sendEmail(user.email, subject, personalizedContent);
      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Petite pause pour éviter de surcharger
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Mettre à jour le statut du message
    await this.db.query(
      `UPDATE admin_messages 
       SET status = $1, sent_at = NOW(), sent_count = $2, failed_count = $3, updated_at = NOW()
       WHERE id = $4`,
      [failedCount === 0 ? 'sent' : sentCount > 0 ? 'sent' : 'failed', sentCount, failedCount, messageId],
    );

    return {
      id: messageId,
      sent_count: sentCount,
      failed_count: failedCount,
      total_recipients: users.rows.length,
    };
  }

  async getMessages(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;

    const messages = await this.db.query(
      `SELECT m.*, a.email as admin_email, a.nom as admin_nom, a.prenom as admin_prenom
       FROM admin_messages m
       LEFT JOIN admins a ON m.created_by = a.id
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const total = await this.db.query('SELECT COUNT(*) as total FROM admin_messages');
    const totalCount = parseInt(total.rows[0]?.total || '0');

    return {
      data: messages.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ==================== PROMOTIONS ====================

  async createPromotion(adminId: string, promotionData: any) {
    const promotionId = uuidv4();

    await this.db.query(
      `INSERT INTO promotions (
        id, code, name, description, type, discount_percentage, discount_amount,
        free_months, gift_description, valid_from, valid_until, max_uses,
        target_audience, target_user_ids, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        promotionId,
        promotionData.code.toUpperCase(),
        promotionData.name,
        promotionData.description || null,
        promotionData.type,
        promotionData.discount_percentage || null,
        promotionData.discount_amount || null,
        promotionData.free_months || null,
        promotionData.gift_description || null,
        promotionData.valid_from,
        promotionData.valid_until || null,
        promotionData.max_uses || null,
        promotionData.target_audience,
        promotionData.target_user_ids || null,
        promotionData.is_active !== false,
        adminId,
      ],
    );

    return this.getPromotion(promotionId);
  }

  async getPromotion(promotionId: string) {
    const result = await this.db.query('SELECT * FROM promotions WHERE id = $1', [promotionId]);
    if (result.rows.length === 0) {
      throw new NotFoundException('Promotion non trouvée');
    }
    return result.rows[0];
  }

  async getPromotions(page: number = 1, limit: number = 50, filters?: any) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM promotions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters?.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const promotions = await this.db.query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM promotions WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters?.is_active !== undefined) {
      countQuery += ` AND is_active = $${countParamIndex}`;
      countParams.push(filters.is_active);
      countParamIndex++;
    }

    if (filters?.type) {
      countQuery += ` AND type = $${countParamIndex}`;
      countParams.push(filters.type);
      countParamIndex++;
    }

    const total = await this.db.query(countQuery, countParams);

    return {
      data: promotions.rows,
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0]?.total || '0'),
        total_pages: Math.ceil(parseInt(total.rows[0]?.total || '0') / limit),
      },
    };
  }

  async updatePromotionStatus(promotionId: string, isActive: boolean) {
    const result = await this.db.query(
      'UPDATE promotions SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, promotionId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Promotion non trouvée');
    }
    return result.rows[0];
  }

  async congratulateActiveUsers(adminId: string, message: string, giftDescription?: string) {
    // Récupérer les utilisateurs actifs (connexion dans les 30 derniers jours)
    const activeUsers = await this.db.query(
      `SELECT id, email, nom, prenom, active_role 
       FROM users 
       WHERE is_active = TRUE 
         AND derniere_connexion >= NOW() - INTERVAL '30 days'
         AND email IS NOT NULL`,
    );

    if (activeUsers.rows.length === 0) {
      return { sent: 0, failed: 0, message: 'Aucun utilisateur actif trouvé' };
    }

    // Créer une promotion cadeau si spécifiée
    let promotionId = null;
    let promotionCode = null;
    if (giftDescription) {
      const promotionData = {
        code: `GIFT${Date.now()}`,
        name: 'Cadeau Utilisateurs Actifs',
        description: giftDescription,
        type: 'gift',
        gift_description: giftDescription,
        valid_from: new Date().toISOString(),
        target_audience: 'active_users',
        is_active: true,
      };
      const promotion = await this.createPromotion(adminId, promotionData);
      promotionId = promotion.id;
      promotionCode = promotion.code;
    }

    // Envoyer le message de félicitations
    const emailContent = message + (promotionId ? `<p><strong>Cadeau spécial:</strong> ${giftDescription}</p><p>Utilisez le code: <code>${promotionCode}</code></p>` : '');
    
    const result = await this.sendMessage(
      adminId,
      '🎉 Félicitations ! Vous êtes un utilisateur actif',
      emailContent,
      'congratulations',
      'active_users',
    );

    return {
      ...result,
      promotion_id: promotionId,
      promotion_code: promotionCode,
    };
  }
}

