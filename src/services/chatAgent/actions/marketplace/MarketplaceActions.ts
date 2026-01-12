/**
 * Actions Marketplace pour Kouakou
 * Permet à Kouakou de gérer la vente de sujets dans le marketplace
 */

import { AgentActionResult, AgentContext } from '../../../../types/chatAgent';
import apiClient from '../../../api/apiClient';
import { getPorkPriceTrendService } from '../../../PorkPriceTrendService';
import { logger } from '../../../../utils/logger';

interface SellAnimalParams {
  animalCode?: string;
  animalId?: string;
  batchId?: string;
  logeName?: string;
  weight?: number;
  weightRange?: { min: number; max: number };
  pricePerKg?: number;
  minPricePerKg?: number;
  autoManage?: boolean;
  userMessage?: string;
}

interface SetPriceParams {
  listingId?: string;
  pricePerKg?: number;
  minPricePerKg?: number;
  autoAcceptThreshold?: number;
  confirmThreshold?: number;
  autoRejectThreshold?: number;
  userMessage?: string;
}

interface RespondOfferParams {
  offerId?: string;
  action?: 'accept' | 'reject' | 'counter';
  counterPrice?: number;
  userMessage?: string;
}

export class MarketplaceActions {
  /**
   * Récupérer les tendances de prix du marché
   */
  static async getPriceTrends(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      const trendService = getPorkPriceTrendService();
      const trends = await trendService.getLastWeeksTrends(4);

      if (trends.length === 0) {
        return {
          success: true,
          message: `📊 Je n'ai pas encore assez de données pour te donner une tendance de prix. 
          
Le prix régional de référence est actuellement d'environ **2 300 FCFA/kg** pour le porc poids vif.

💡 Une fois que des ventes auront été enregistrées sur le marketplace, je pourrai te donner des tendances plus précises.`,
        };
      }

      // Calculer le prix moyen des 4 dernières semaines
      const prices = trends
        .map(t => t.avgPricePlatform || t.avgPriceRegional || 0)
        .filter(p => p > 0);
      
      const avgPrice = prices.length > 0 
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 2300;

      // Calculer la variation
      let variation = '';
      if (trends.length >= 2) {
        const currentPrice = trends[trends.length - 1].avgPricePlatform || trends[trends.length - 1].avgPriceRegional || avgPrice;
        const previousPrice = trends[trends.length - 2].avgPricePlatform || trends[trends.length - 2].avgPriceRegional || avgPrice;
        const change = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        if (change > 0) {
          variation = `📈 Les prix sont en hausse de ${change.toFixed(1)}% cette semaine.`;
        } else if (change < 0) {
          variation = `📉 Les prix sont en baisse de ${Math.abs(change).toFixed(1)}% cette semaine.`;
        } else {
          variation = `➡️ Les prix sont stables cette semaine.`;
        }
      }

      return {
        success: true,
        message: `📊 **Tendance des prix du porc poids vif (4 dernières semaines)**

💰 **Prix moyen actuel : ${avgPrice.toLocaleString('fr-FR')} FCFA/kg**

${variation}

📋 Détail par semaine :
${trends.slice(-4).map(t => 
  `• Semaine ${t.weekNumber} : ${(t.avgPricePlatform || t.avgPriceRegional || 0).toLocaleString('fr-FR')} FCFA/kg`
).join('\n')}

💡 Je te recommande de fixer ton prix autour de **${avgPrice.toLocaleString('fr-FR')} FCFA/kg** pour être compétitif.`,
        data: { trends, avgPrice },
      };
    } catch (error) {
      logger.error('[MarketplaceActions] Erreur getPriceTrends:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer les tendances de prix. Réessaye plus tard.",
      };
    }
  }

  /**
   * Mettre un animal en vente
   */
  static async sellAnimal(
    params: SellAnimalParams,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      // 1. D'abord, récupérer les tendances de prix
      const trendService = getPorkPriceTrendService();
      const trends = await trendService.getLastWeeksTrends(4);
      
      const prices = trends
        .map(t => t.avgPricePlatform || t.avgPriceRegional || 0)
        .filter(p => p > 0);
      const marketAvgPrice = prices.length > 0 
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 2300;

      // 2. Si pas de prix spécifié, demander à l'utilisateur
      if (!params.pricePerKg) {
        // Chercher l'animal
        let animalInfo = '';
        let animalId = params.animalId;
        let weight = params.weight;

        if (params.animalCode) {
          try {
            const animals = await apiClient.get<any[]>('/production/animaux', {
              params: { code: params.animalCode, projet_id: context.projetId }
            });
            if (animals && animals.length > 0) {
              const animal = animals[0];
              animalId = animal.id;
              weight = animal.poids_actuel || animal.poids_initial;
              animalInfo = `🐷 **${animal.code}** (${animal.race || 'Race inconnue'})
• Poids actuel : ${weight ? `${weight} kg` : 'Non renseigné'}
• Statut : ${animal.statut || 'Actif'}`;
            }
          } catch (e) {
            logger.warn('[MarketplaceActions] Erreur recherche animal:', e);
          }
        } else if (params.logeName) {
          animalInfo = `🏠 Animaux de la loge **${params.logeName}**`;
        } else if (params.weightRange) {
          animalInfo = `🐷 Animaux entre **${params.weightRange.min}** et **${params.weightRange.max} kg**`;
        }

        return {
          success: true,
          message: `${animalInfo ? animalInfo + '\n\n' : ''}📊 **Tendance du marché : ${marketAvgPrice.toLocaleString('fr-FR')} FCFA/kg**

Pour mettre ce sujet en vente, j'ai besoin de connaître :

1. **À quel prix du kg** veux-tu le vendre ?
   💡 Je te recommande **${marketAvgPrice.toLocaleString('fr-FR')} FCFA/kg** basé sur le marché actuel.

2. **Quel est ton prix minimum** acceptable ?
   ⚠️ En dessous de ce prix, je refuserai automatiquement les offres.

Réponds-moi par exemple : *"${marketAvgPrice} FCFA le kg, minimum ${Math.round(marketAvgPrice * 0.95)}"*

Ou dis-moi simplement *"au prix du marché"* et je fixerai le prix à ${marketAvgPrice.toLocaleString('fr-FR')} FCFA/kg.`,
          data: { 
            pendingAction: 'marketplace_set_price',
            animalId,
            animalCode: params.animalCode,
            weight,
            marketAvgPrice,
          },
          requiresConfirmation: true,
        };
      }

      // 3. Prix spécifié, créer le listing
      const pricePerKg = params.pricePerKg;
      const minPricePerKg = params.minPricePerKg || Math.round(pricePerKg * 0.95);
      const weight = params.weight || 0;
      const calculatedPrice = pricePerKg * weight;

      // Trouver l'animal
      let animalId = params.animalId;
      if (!animalId && params.animalCode) {
        try {
          const animals = await apiClient.get<any[]>('/production/animaux', {
            params: { code: params.animalCode, projet_id: context.projetId }
          });
          if (animals && animals.length > 0) {
            animalId = animals[0].id;
          }
        } catch (e) {
          logger.warn('[MarketplaceActions] Erreur recherche animal:', e);
        }
      }

      if (!animalId) {
        return {
          success: false,
          message: "Je n'ai pas trouvé l'animal que tu veux vendre. Peux-tu me donner son code exact ?",
        };
      }

      // Créer le listing
      const listingData = {
        subjectId: animalId,
        farmId: context.projetId,
        pricePerKg,
        weight,
        lastWeightDate: new Date().toISOString(),
        location: {
          latitude: 5.3600,
          longitude: -4.0083,
          address: 'Côte d\'Ivoire',
          city: 'Abidjan',
          region: 'Abidjan',
        },
        saleTerms: {
          transport: 'buyer_responsibility',
          slaughter: 'buyer_responsibility',
          paymentTerms: 'on_delivery',
        },
      };

      const listing = await apiClient.post<any>('/marketplace/listings', listingData);

      // Activer la gestion automatique si demandé
      if (params.autoManage !== false) {
        try {
          await apiClient.post('/marketplace/auto-sale-settings', {
            listingId: listing.id,
            minPricePerKg,
            targetPricePerKg: pricePerKg,
            autoAcceptThreshold: 0, // Accepter seulement au prix ou au-dessus
            confirmThreshold: 5, // Demander confirmation si 3-5% en dessous
            autoRejectThreshold: 5, // Rejeter si > 5% en dessous
            autoManagementEnabled: true,
            kouakouManaged: true,
          });
        } catch (e) {
          logger.warn('[MarketplaceActions] Erreur création auto-sale settings:', e);
        }
      }

      return {
        success: true,
        message: `✅ **Annonce publiée avec succès !**

🐷 Sujet mis en vente sur le marketplace
💰 Prix : **${pricePerKg.toLocaleString('fr-FR')} FCFA/kg** (${calculatedPrice.toLocaleString('fr-FR')} FCFA total)
⬇️ Prix minimum : **${minPricePerKg.toLocaleString('fr-FR')} FCFA/kg**

🤖 **Gestion automatique activée**
Je vais surveiller les offres pour toi :
• ✅ J'accepte automatiquement les offres ≥ ${pricePerKg.toLocaleString('fr-FR')} FCFA/kg
• 🔔 Je te demande ton avis pour les offres entre ${minPricePerKg.toLocaleString('fr-FR')} et ${pricePerKg.toLocaleString('fr-FR')} FCFA/kg
• ❌ Je refuse automatiquement les offres < ${Math.round(minPricePerKg * 0.95).toLocaleString('fr-FR')} FCFA/kg

Je t'informerai dès qu'une offre arrive ! 🔔`,
        data: { listing },
      };
    } catch (error) {
      logger.error('[MarketplaceActions] Erreur sellAnimal:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu créer l'annonce. Vérifie que l'animal existe et réessaye.",
      };
    }
  }

  /**
   * Configurer le prix de vente
   */
  static async setPrice(
    params: SetPriceParams,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const { pricePerKg, minPricePerKg, listingId } = params;

    if (!pricePerKg) {
      return {
        success: false,
        message: "Je n'ai pas compris le prix. Dis-moi le prix par kg que tu souhaites, par exemple : *2500 FCFA le kg*",
      };
    }

    const minPrice = minPricePerKg || Math.round(pricePerKg * 0.95);

    return {
      success: true,
      message: `✅ Prix configuré :
• Prix demandé : **${pricePerKg.toLocaleString('fr-FR')} FCFA/kg**
• Prix minimum : **${minPrice.toLocaleString('fr-FR')} FCFA/kg**

Veux-tu continuer et publier l'annonce avec ces prix ?`,
      data: { pricePerKg, minPricePerKg: minPrice, listingId },
      requiresConfirmation: true,
    };
  }

  /**
   * Vérifier les offres en cours
   */
  static async checkOffers(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      // Récupérer les offres reçues
      const offers = await apiClient.get<any[]>('/marketplace/my-received-offers');

      if (!offers || offers.length === 0) {
        return {
          success: true,
          message: `📭 Tu n'as pas d'offres en attente pour le moment.

💡 Tes annonces sont visibles sur le marketplace. Je t'informerai dès qu'un acheteur fera une offre !`,
        };
      }

      const pendingOffers = offers.filter(o => o.status === 'pending');
      const counteredOffers = offers.filter(o => o.status === 'countered');

      let message = `📬 **Tu as ${offers.length} offre(s) :**\n\n`;

      if (pendingOffers.length > 0) {
        message += `**Offres en attente (${pendingOffers.length}) :**\n`;
        pendingOffers.forEach((offer, i) => {
          const pricePerKg = offer.proposedPrice && offer.pig_count 
            ? Math.round(offer.proposedPrice / (offer.pig_count * 80)) 
            : 0;
          message += `${i + 1}. **${offer.proposedPrice?.toLocaleString('fr-FR')} FCFA** (≈${pricePerKg} FCFA/kg)
   De: ${offer.buyer_nom || 'Acheteur'} - ${offer.message || 'Pas de message'}\n`;
        });
        message += '\n';
      }

      if (counteredOffers.length > 0) {
        message += `**Contre-propositions en cours (${counteredOffers.length}) :**\n`;
        counteredOffers.forEach((offer, i) => {
          message += `${i + 1}. En attente de réponse de l'acheteur\n`;
        });
      }

      message += `\n💬 Dis-moi si tu veux **accepter**, **refuser** ou **faire une contre-proposition** sur une offre.`;

      return {
        success: true,
        message,
        data: { offers, pendingOffers, counteredOffers },
      };
    } catch (error) {
      logger.error('[MarketplaceActions] Erreur checkOffers:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer tes offres. Réessaye plus tard.",
      };
    }
  }

  /**
   * Répondre à une offre
   */
  static async respondToOffer(
    params: RespondOfferParams,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const { offerId, action, counterPrice } = params;

    if (!offerId) {
      return {
        success: false,
        message: "Je n'ai pas compris quelle offre tu veux traiter. Peux-tu préciser ?",
      };
    }

    if (!action) {
      return {
        success: true,
        message: `Que veux-tu faire avec cette offre ?
• Dis **"accepter"** pour accepter l'offre
• Dis **"refuser"** pour refuser l'offre  
• Dis **"contre-proposer à X FCFA"** pour faire une contre-proposition`,
        requiresConfirmation: true,
      };
    }

    try {
      let result;
      let message = '';

      switch (action) {
        case 'accept':
          result = await apiClient.patch(`/marketplace/offers/${offerId}/accept`);
          message = `✅ **Offre acceptée !**

La vente est en cours. L'acheteur va être notifié et vous pourrez organiser la livraison.

🎉 Félicitations pour cette vente !`;
          break;

        case 'reject':
          result = await apiClient.patch(`/marketplace/offers/${offerId}/reject`);
          message = `❌ **Offre refusée.**

L'acheteur a été notifié. Ton annonce reste active pour d'autres acheteurs.`;
          break;

        case 'counter':
          if (!counterPrice) {
            return {
              success: false,
              message: "À quel prix veux-tu faire la contre-proposition ?",
            };
          }
          result = await apiClient.patch(`/marketplace/offers/${offerId}/counter`, {
            nouveau_prix_total: counterPrice,
          });
          message = `💬 **Contre-proposition envoyée !**

Tu as proposé **${counterPrice.toLocaleString('fr-FR')} FCFA**. L'acheteur va recevoir ta proposition et pourra l'accepter ou négocier.

Je te tiendrai au courant de sa réponse ! 🔔`;
          break;
      }

      return {
        success: true,
        message,
        data: result,
      };
    } catch (error) {
      logger.error('[MarketplaceActions] Erreur respondToOffer:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu traiter ta réponse. Réessaye plus tard.",
      };
    }
  }

  /**
   * Récupérer mes annonces en cours
   */
  static async getMyListings(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      const response = await apiClient.get<any>('/marketplace/listings', {
        params: { user_id: context.userId, limit: 50 }
      });

      const listings = response.listings || response || [];

      if (!listings || listings.length === 0) {
        return {
          success: true,
          message: `📋 Tu n'as pas d'annonces en cours sur le marketplace.

💡 Pour mettre un animal en vente, dis-moi par exemple :
• *"Mets le porc P123 en vente"*
• *"Vends les porcs de la loge 2"*
• *"Je veux vendre un porc de 80kg"*`,
        };
      }

      const activeListings = listings.filter((l: any) => l.status === 'available');
      const reservedListings = listings.filter((l: any) => l.status === 'reserved');

      let message = `📋 **Tes annonces sur le marketplace :**\n\n`;

      if (activeListings.length > 0) {
        message += `**Actives (${activeListings.length}) :**\n`;
        activeListings.forEach((l: any, i: number) => {
          message += `${i + 1}. ${l.code || l.id} - **${l.calculatedPrice?.toLocaleString('fr-FR')} FCFA** (${l.pricePerKg} FCFA/kg)
   👁️ ${l.views || 0} vues | 💬 ${l.inquiries || 0} offres\n`;
        });
        message += '\n';
      }

      if (reservedListings.length > 0) {
        message += `**Réservées (${reservedListings.length}) :**\n`;
        reservedListings.forEach((l: any, i: number) => {
          message += `${i + 1}. ${l.code || l.id} - Vente en cours\n`;
        });
      }

      return {
        success: true,
        message,
        data: { listings, activeListings, reservedListings },
      };
    } catch (error) {
      logger.error('[MarketplaceActions] Erreur getMyListings:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer tes annonces. Réessaye plus tard.",
      };
    }
  }
}
