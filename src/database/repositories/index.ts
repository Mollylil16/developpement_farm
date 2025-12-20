/**
 * Export centralisé de tous les repositories
 * Tous les repositories utilisent maintenant l'API REST (PostgreSQL via backend)
 */

export { BaseRepository } from './BaseRepository';
export { UserRepository } from './UserRepository';
export { ProjetRepository } from './ProjetRepository';
export { AnimalRepository } from './AnimalRepository';
export { PeseeRepository } from './PeseeRepository';
export { GestationRepository } from './GestationRepository';
export { SevrageRepository } from './SevrageRepository';
export { DepensePonctuelleRepository } from './FinanceRepository';
export { RevenuRepository } from './FinanceRepository';
export { ChargeFixeRepository } from './FinanceRepository';
export { FinanceService } from './FinanceRepository';
export { StockRepository } from './StockRepository';
export { IngredientRepository } from './IngredientRepository';
export { RationRepository } from './RationRepository';
export { PlanificationRepository } from './PlanificationRepository';
export { CollaborateurRepository } from './CollaborateurRepository';
export { MortaliteRepository } from './MortaliteRepository';
export { VaccinationRepository } from './VaccinationRepository';
export { RappelVaccinationRepository } from './VaccinationRepository';
export { MaladieRepository } from './MaladieRepository';
export { TraitementRepository } from './TraitementRepository';
export { VisiteVeterinaireRepository } from './VisiteVeterinaireRepository';
export { MarketplaceListingRepository } from './MarketplaceRepositories';
export { MarketplaceOfferRepository } from './MarketplaceRepositories';
export { MarketplaceTransactionRepository } from './MarketplaceRepositories';
export { MarketplaceRatingRepository } from './MarketplaceRepositories';
export { MarketplaceNotificationRepository } from './MarketplaceRepositories';
export { MarketplaceChatRepository } from './MarketplaceRepositories';
export { PurchaseRequestRepository } from './PurchaseRequestRepository';
export { PurchaseRequestOfferRepository } from './PurchaseRequestRepository';
export { PurchaseRequestMatchRepository } from './PurchaseRequestRepository';
export { ServiceProposalNotificationRepository } from './ServiceProposalNotificationRepository';
export { WeeklyPorkPriceTrendRepository } from './WeeklyPorkPriceTrendRepository';
export { VeterinarianRepository } from './VeterinarianRepository';

/**
 * Helper pour créer des repositories sans besoin de db
 * ⚠️ DEPRECATED: Les repositories n'ont plus besoin de db en paramètre
 * Utilisez directement: new UserRepository() au lieu de new UserRepository(db)
 */
export function createRepositories() {
  return {
    user: new UserRepository(),
    projet: new ProjetRepository(),
    // Ajoutez d'autres repositories selon vos besoins
  };
}
