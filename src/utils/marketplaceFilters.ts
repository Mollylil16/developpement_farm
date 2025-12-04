/**
 * Utilitaires pour filtrer les annonces marketplace selon les règles de rôles
 * 
 * RÈGLES IMPORTANTES:
 * 1. L'utilisateur PEUT voir ses propres annonces dans "Mes annonces"
 * 2. L'utilisateur NE PEUT PAS voir ses propres annonces dans "Acheter" (pour éviter l'auto-achat)
 * 3. L'utilisateur NE PEUT JAMAIS acheter ses propres sujets, quel que soit son rôle/profil
 */

import { MarketplaceListing } from '../types/marketplace';

/**
 * Filtre les annonces pour exclure celles de l'utilisateur
 * 
 * ⚠️ UTILISATION: Cette fonction doit être utilisée UNIQUEMENT pour la vue "Acheter"
 * Pour la vue "Mes annonces", ne PAS utiliser ce filtre (l'utilisateur doit voir ses propres annonces)
 * 
 * Règle: Peu importe son rôle actif, un utilisateur ne peut pas voir ses propres annonces dans la vue "Acheter"
 * 
 * @param listings - Liste des annonces
 * @param userId - ID de l'utilisateur
 * @returns Liste filtrée sans les annonces de l'utilisateur
 */
export const filterListingsForBuyView = (
  listings: MarketplaceListing[],
  userId: string
): MarketplaceListing[] => {
  return listings.filter(listing => {
    // ❌ Exclure toutes les annonces de l'utilisateur dans la vue "Acheter"
    // Peu importe son rôle actif
    return listing.producerId !== userId;
  });
};

/**
 * Vérifie si un utilisateur peut voir une annonce dans la vue "Acheter"
 * 
 * ⚠️ Cette fonction est pour la vue "Acheter" uniquement
 * Dans "Mes annonces", l'utilisateur peut toujours voir ses propres annonces
 * 
 * @param listing - L'annonce à vérifier
 * @param userId - ID de l'utilisateur
 * @returns true si l'utilisateur peut voir l'annonce dans la vue "Acheter"
 */
export const canUserViewListingInBuyView = (
  listing: MarketplaceListing,
  userId: string
): boolean => {
  return listing.producerId !== userId;
};

