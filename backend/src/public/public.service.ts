import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class PublicService {
  constructor(private db: DatabaseService) {}

  async getStats() {
    // Nombre total de producteurs actifs
    const producersResult = await this.db.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE u.active_role = 'producer'
        AND u.is_active = true
        AND u.is_onboarded = true
    `)

    // Nombre total d'animaux actifs
    const animalsResult = await this.db.query(`
      SELECT COUNT(*) as total
      FROM production_animaux
      WHERE actif = true
    `)

    // Nombre total de transactions complétées
    const transactionsResult = await this.db.query(`
      SELECT COUNT(*) as total
      FROM transactions
      WHERE status = 'completed'
    `)

    // Nombre de régions couvertes (basé sur les projets)
    const regionsResult = await this.db.query(`
      SELECT COUNT(DISTINCT p.localisation) as total
      FROM projets p
      WHERE p.statut = 'actif'
        AND p.localisation IS NOT NULL
        AND p.localisation != ''
    `)

    return {
      total_producers: parseInt(producersResult.rows[0]?.total || '0'),
      total_animals: parseInt(animalsResult.rows[0]?.total || '0'),
      total_transactions: parseInt(transactionsResult.rows[0]?.total || '0'),
      regions_covered: parseInt(regionsResult.rows[0]?.total || '0'),
    }
  }

  async getTopProducers(limit: number = 6) {
    const result = await this.db.query(
      `
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.telephone,
        u.email,
        u.photo,
        p.localisation,
        COUNT(DISTINCT pa.id) as total_animals,
        COUNT(DISTINCT t.id) as total_transactions
      FROM users u
      LEFT JOIN projets p ON p.proprietaire_id = u.id AND p.statut = 'actif'
      LEFT JOIN production_animaux pa ON pa.projet_id = p.id AND pa.actif = true
      LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'completed'
      WHERE u.active_role = 'producer'
        AND u.is_active = true
        AND u.is_onboarded = true
      GROUP BY u.id, u.nom, u.prenom, u.telephone, u.email, u.photo, p.localisation
      HAVING COUNT(DISTINCT pa.id) > 0
      ORDER BY 
        COUNT(DISTINCT pa.id) DESC,
        COUNT(DISTINCT t.id) DESC
      LIMIT $1
    `,
      [limit],
    )

    return {
      producers: result.rows.map((row) => ({
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        telephone: row.telephone || undefined,
        email: row.email || undefined,
        photo: row.photo || undefined,
        localisation: row.localisation || undefined,
        total_animals: parseInt(row.total_animals || '0'),
        total_transactions: parseInt(row.total_transactions || '0'),
        // Note moyenne (à calculer si vous avez un système de notation)
        rating: 5.0, // Placeholder - à implémenter si nécessaire
      })),
    }
  }

  async getTestimonials() {
    // Pour l'instant, retourner des témoignages statiques
    // Plus tard, vous pouvez créer une table testimonials dans la DB
    return {
      testimonials: [
        {
          id: 1,
          name: 'Kouamé Y.',
          location: 'Éleveur à Bouaké',
          rating: 5,
          text: 'Le suivi de gestation est incroyable. Je sais exactement quand chaque truie va mettre bas et je peux me préparer.',
        },
        {
          id: 2,
          name: 'Aminata K.',
          location: 'Propriétaire de ferme à Abidjan',
          rating: 5,
          text: 'Le calculateur de rations m\'aide à optimiser l\'alimentation. J\'ai une meilleure visibilité sur mes coûts.',
        },
        {
          id: 3,
          name: 'Jean-Baptiste D.',
          location: 'Éleveur à Yamoussoukro',
          rating: 5,
          text: 'L\'application est très intuitive. Je peux tout gérer depuis mon téléphone, même quand je suis dans la ferme.',
        },
      ],
    }
  }
}
