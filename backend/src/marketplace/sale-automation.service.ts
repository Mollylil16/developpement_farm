import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Service pour automatiser les opérations post-vente
 * Appelé automatiquement après confirmation de livraison par les deux parties
 */
@Injectable()
export class SaleAutomationService {
  private readonly logger = new Logger(SaleAutomationService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Traite la vente complète après confirmation de livraison
   * Cette méthode est TRANSACTIONNELLE : tout réussit ou tout échoue
   */
  async processSaleFromTransaction(transactionId: string): Promise<{
    venteId: string;
    revenuId: string;
  }> {
    return await this.databaseService.transaction(async (client) => {
      // 1. Récupérer la transaction et l'offre associée
      const transactionResult = await client.query(
        'SELECT * FROM marketplace_transactions WHERE id = $1',
        [transactionId]
      );

      if (transactionResult.rows.length === 0) {
        throw new NotFoundException('Transaction introuvable');
      }

      const transaction = transactionResult.rows[0];
      const subjectIds: string[] = Array.isArray(transaction.subject_ids)
        ? transaction.subject_ids
        : typeof transaction.subject_ids === 'string'
        ? JSON.parse(transaction.subject_ids)
        : [];

      if (subjectIds.length === 0) {
        throw new BadRequestException('Aucun sujet trouvé dans la transaction');
      }

      // Récupérer l'offre pour avoir date_recuperation_souhaitee
      const offerResult = await client.query(
        'SELECT * FROM marketplace_offers WHERE id = $1',
        [transaction.offer_id]
      );
      const offer = offerResult.rows[0];
      const dateRecuperation = offer?.date_recuperation_souhaitee
        ? new Date(offer.date_recuperation_souhaitee)
        : null;

      // Récupérer le listing pour déterminer le type (individuel ou batch)
      const listingResult = await client.query(
        'SELECT * FROM marketplace_listings WHERE id = $1',
        [transaction.listing_id]
      );
      const listing = listingResult.rows[0];
      const listingType = listing?.listing_type || 'individual';

      // Récupérer le projet du producteur
      const projetResult = await client.query(
        'SELECT id FROM projets WHERE proprietaire_id = $1 LIMIT 1',
        [transaction.producer_id]
      );
      if (projetResult.rows.length === 0) {
        throw new NotFoundException('Projet du producteur introuvable');
      }
      const projetId = projetResult.rows[0].id;

      // 2. Calculer le poids total et récupérer les informations des animaux
      const { totalWeight, animalInfos } = await this.calculateTotalWeightAndGetAnimalInfos(
        subjectIds,
        listingType,
        client
      );

      // 3. CRÉER LA VENTE
      const venteId = this.generateId('vente');
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO ventes (
          id, transaction_id, projet_id, producteur_id, acheteur_id,
          prix_total, nombre_sujets, poids_total, statut,
          date_vente, date_recuperation, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          venteId,
          transactionId,
          projetId,
          transaction.producer_id,
          transaction.buyer_id,
          transaction.final_price,
          subjectIds.length,
          Math.round(totalWeight), // Nombre entier
          'confirmee',
          now,
          dateRecuperation?.toISOString().split('T')[0] || null,
          now,
          now,
        ]
      );

      // 4. CRÉER LES ENTRÉES DANS ventes_animaux
      const prixUnitaire = transaction.final_price / subjectIds.length;
      for (const animalInfo of animalInfos) {
        await client.query(
          `INSERT INTO ventes_animaux (
            vente_id, animal_id, animal_type, poids_vente, prix_unitaire
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            venteId,
            animalInfo.animalId,
            animalInfo.animalType,
            Math.round(animalInfo.weight), // Nombre entier
            prixUnitaire,
          ]
        );
      }

      // 5. METTRE À JOUR LES ANIMAUX (statut = 'vendu')
      for (const animalInfo of animalInfos) {
        if (animalInfo.animalType === 'production_animaux') {
          // Mode individuel : mettre à jour production_animaux
          await client.query(
            `UPDATE production_animaux 
             SET statut = 'vendu', actif = false, derniere_modification = $1
             WHERE id = $2`,
            [now, animalInfo.animalId]
          );
        } else if (animalInfo.animalType === 'batch_pigs') {
          // Mode bande : créer un mouvement de retrait dans batch_pig_movements
          const movementId = this.generateId('movement');
          
          // Récupérer les infos du batch_pig
          const pigResult = await client.query(
            'SELECT batch_id, current_weight_kg FROM batch_pigs WHERE id = $1',
            [animalInfo.animalId]
          );
          
          if (pigResult.rows.length > 0) {
            const pig = pigResult.rows[0];
            
            // Récupérer le nom de l'acheteur
            const buyerResult = await client.query(
              'SELECT prenom, nom FROM users WHERE id = $1',
              [transaction.buyer_id]
            );
            const buyerName = buyerResult.rows.length > 0
              ? `${buyerResult.rows[0].prenom || ''} ${buyerResult.rows[0].nom || ''}`.trim()
              : 'Acheteur inconnu';

            await client.query(
              `INSERT INTO batch_pig_movements (
                id, pig_id, movement_type, removal_reason,
                sale_price, sale_weight_kg, buyer_name,
                movement_date, notes, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                movementId,
                animalInfo.animalId,
                'removal',
                'sale',
                prixUnitaire,
                Math.round(animalInfo.weight),
                buyerName,
                now.split('T')[0], // Date seulement
                `Vente via marketplace - Transaction ${transactionId}`,
                now,
              ]
            );

            // Supprimer le batch_pig (le trigger mettra à jour les compteurs de la bande)
            await client.query('DELETE FROM batch_pigs WHERE id = $1', [animalInfo.animalId]);
          }
        }
      }

      // 6. ACTUALISER LE CHEPTEL
      // Décrémenter nombre_animaux_total du projet
      await client.query(
        'UPDATE projets SET nombre_animaux_total = GREATEST(nombre_animaux_total - $1, 0) WHERE id = $2',
        [subjectIds.length, projetId]
      );

      // 7. CRÉER LE REVENU (Finance > Revenus)
      const revenuId = this.generateId('revenu');
      
      // Récupérer le nom de l'acheteur
      const buyerResult = await client.query(
        'SELECT prenom, nom FROM users WHERE id = $1',
        [transaction.buyer_id]
      );
      const buyerName = buyerResult.rows.length > 0
        ? `${buyerResult.rows[0].prenom || ''} ${buyerResult.rows[0].nom || ''}`.trim()
        : 'Acheteur inconnu';

      // Récupérer les codes des animaux
      const animalCodes = await this.getAnimalCodes(subjectIds, listingType, client);

      await client.query(
        `INSERT INTO revenus (
          id, projet_id, montant, date, categorie, description,
          acheteur, poids_total, nombre_animaux, vente_id, animal_ids,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          revenuId,
          projetId,
          transaction.final_price,
          now.split('T')[0], // Date seulement
          'vente_porc',
          `Vente de ${subjectIds.length} sujet(s)${animalCodes.length > 0 ? ` - Codes: ${animalCodes.join(', ')}` : ''}`,
          buyerName,
          Math.round(totalWeight),
          subjectIds.length,
          venteId,
          JSON.stringify(subjectIds), // Array d'IDs
          now,
        ]
      );

      // 8. METTRE À JOUR LE MARKETPLACE
      // Si tous les animaux du listing sont vendus, marquer le listing comme vendu
      // Sinon, retirer uniquement les animaux vendus
      const remainingSubjectIds = await this.getRemainingSubjectsInListing(
        transaction.listing_id,
        subjectIds,
        listingType,
        client
      );

      if (remainingSubjectIds.length === 0) {
        // Tous les animaux sont vendus
        await client.query(
          'UPDATE marketplace_listings SET status = $1, derniere_modification = $2 WHERE id = $3',
          ['sold', now, transaction.listing_id]
        );
      } else {
        // Mettre à jour le listing pour retirer les animaux vendus
        // (Le listing reste disponible avec les animaux restants)
        // On pourrait mettre à jour subject_ids ou pigIds, mais pour simplifier, on laisse le listing tel quel
        // et les animaux vendus ne seront plus accessibles
      }

      // 9. METTRE À JOUR LA TRANSACTION avec vente_id et revenu_id
      await client.query(
        'UPDATE marketplace_transactions SET vente_id = $1, revenu_id = $2, poids_total = $3, nombre_sujets = $4, date_vente = $5 WHERE id = $6',
        [
          venteId,
          revenuId,
          Math.round(totalWeight),
          subjectIds.length,
          now,
          transactionId,
        ]
      );

      // 10. NOTIFICATIONS
      await this.createNotification({
        userId: transaction.producer_id,
        type: 'vente_confirmee',
        title: 'Vente confirmée',
        message: `${subjectIds.length} sujet(s) vendu(s) pour ${transaction.final_price.toLocaleString('fr-FR')} FCFA`,
        relatedId: venteId,
        relatedType: 'vente',
      });

      const dateRecuperationStr = dateRecuperation
        ? `Récupération prévue le ${dateRecuperation.toLocaleDateString('fr-FR')}`
        : 'Récupération à convenir';

      await this.createNotification({
        userId: transaction.buyer_id,
        type: 'achat_confirme',
        title: 'Achat confirmé',
        message: `${dateRecuperationStr}`,
        relatedId: venteId,
        relatedType: 'vente',
      });

      this.logger.log(
        `Vente ${venteId} traitée avec succès pour ${subjectIds.length} sujet(s)`
      );

      return {
        venteId,
        revenuId,
      };
    });
  }

  /**
   * Calcule le poids total et récupère les informations des animaux
   */
  private async calculateTotalWeightAndGetAnimalInfos(
    subjectIds: string[],
    listingType: string,
    client: any
  ): Promise<{
    totalWeight: number;
    animalInfos: Array<{ animalId: string; animalType: string; weight: number }>;
  }> {
    const animalInfos: Array<{ animalId: string; animalType: string; weight: number }> = [];
    let totalWeight = 0;

    if (listingType === 'batch') {
      // Mode bande : animaux dans batch_pigs
      for (const subjectId of subjectIds) {
        const result = await client.query(
          'SELECT id, current_weight_kg FROM batch_pigs WHERE id = $1',
          [subjectId]
        );
        if (result.rows.length > 0) {
          const weight = parseFloat(result.rows[0].current_weight_kg) || 0;
          totalWeight += weight;
          animalInfos.push({
            animalId: subjectId,
            animalType: 'batch_pigs',
            weight,
          });
        }
      }
    } else {
      // Mode individuel : animaux dans production_animaux
      for (const subjectId of subjectIds) {
        // Récupérer le poids depuis la dernière pesée
        const peseeResult = await client.query(
          `SELECT poids_kg FROM production_pesees 
           WHERE animal_id = $1 
           ORDER BY date DESC 
           LIMIT 1`,
          [subjectId]
        );

        let weight = 0;
        if (peseeResult.rows.length > 0) {
          weight = parseFloat(peseeResult.rows[0].poids_kg) || 0;
        } else {
          // Fallback : poids initial
          const animalResult = await client.query(
            'SELECT poids_initial FROM production_animaux WHERE id = $1',
            [subjectId]
          );
          if (animalResult.rows.length > 0) {
            weight = parseFloat(animalResult.rows[0].poids_initial) || 0;
          }
        }

        totalWeight += weight;
        animalInfos.push({
          animalId: subjectId,
          animalType: 'production_animaux',
          weight,
        });
      }
    }

    return { totalWeight, animalInfos };
  }

  /**
   * Récupère les codes des animaux
   */
  private async getAnimalCodes(
    subjectIds: string[],
    listingType: string,
    client: any
  ): Promise<string[]> {
    const codes: string[] = [];

    if (listingType === 'batch') {
      // Mode bande : batch_pigs n'a pas de code, utiliser le name ou l'ID
      for (const subjectId of subjectIds) {
        const result = await client.query(
          'SELECT name FROM batch_pigs WHERE id = $1',
          [subjectId]
        );
        if (result.rows.length > 0 && result.rows[0].name) {
          codes.push(result.rows[0].name);
        } else {
          codes.push(subjectId.substring(0, 8)); // Utiliser les 8 premiers caractères de l'ID
        }
      }
    } else {
      // Mode individuel : production_animaux a un code
      for (const subjectId of subjectIds) {
        const result = await client.query(
          'SELECT code FROM production_animaux WHERE id = $1',
          [subjectId]
        );
        if (result.rows.length > 0 && result.rows[0].code) {
          codes.push(result.rows[0].code);
        }
      }
    }

    return codes;
  }

  /**
   * Détermine les sujets restants dans le listing après vente
   */
  private async getRemainingSubjectsInListing(
    listingId: string,
    soldSubjectIds: string[],
    listingType: string,
    client: any
  ): Promise<string[]> {
    const listingResult = await client.query(
      'SELECT subject_id, pig_ids FROM marketplace_listings WHERE id = $1',
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      return [];
    }

    const listing = listingResult.rows[0];

    if (listingType === 'batch') {
      // Mode bande : pig_ids est un array
      const pigIds: string[] = Array.isArray(listing.pig_ids)
        ? listing.pig_ids
        : typeof listing.pig_ids === 'string'
        ? JSON.parse(listing.pig_ids)
        : [];
      return pigIds.filter((id) => !soldSubjectIds.includes(id));
    } else {
      // Mode individuel : subject_id est un seul ID
      if (listing.subject_id && !soldSubjectIds.includes(listing.subject_id)) {
        return [listing.subject_id];
      }
      return [];
    }
  }

  /**
   * Crée une notification (copie de la méthode dans MarketplaceService pour éviter dépendance circulaire)
   */
  private async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
  }): Promise<void> {
    try {
      const id = this.generateId('notif');
      const now = new Date().toISOString();

      await this.databaseService.query(
        `INSERT INTO marketplace_notifications (
          id, user_id, type, title, message, related_id, related_type, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          data.userId,
          data.type,
          data.title,
          data.message,
          data.relatedId || null,
          data.relatedType || null,
          false,
          now,
        ]
      );
    } catch (error: any) {
      // Si la table n'existe pas encore, logger un warning mais ne pas faire échouer
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_notifications n\'existe pas encore, notification non créée');
        return;
      }
      throw error;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

