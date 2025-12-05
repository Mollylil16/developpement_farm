/**
 * Index des Repositories
 * Export centralisé pour faciliter les imports
 */

// Base
export { BaseRepository } from './BaseRepository';

// Auth & Projets
export { UserRepository } from './UserRepository';
export { ProjetRepository } from './ProjetRepository';

// Production
export { AnimalRepository } from './AnimalRepository';
export { PeseeRepository } from './PeseeRepository';

// Finance
export {
  RevenuRepository,
  DepensePonctuelleRepository,
  ChargeFixeRepository,
  FinanceService,
} from './FinanceRepository';

// Reproduction
export { GestationRepository } from './GestationRepository';
export { SevrageRepository } from './SevrageRepository';
export { IngredientRepository } from './IngredientRepository';
export { RationRepository } from './RationRepository';
export { PlanificationRepository } from './PlanificationRepository';
export { CollaborateurRepository } from './CollaborateurRepository';
export { RapportCroissanceRepository } from './RapportCroissanceRepository';

// Santé Vétérinaire
export { VaccinationRepository } from './VaccinationRepository';
export { CalendrierVaccinationRepository } from './CalendrierVaccinationRepository';
export { MaladieRepository } from './MaladieRepository';
export { TraitementRepository } from './TraitementRepository';
export { VisiteVeterinaireRepository } from './VisiteVeterinaireRepository';
export { RappelVaccinationRepository, CreateRappelVaccinationInput } from './RappelVaccinationRepository';
export { MortaliteRepository } from './MortaliteRepository';
export { VeterinarianRepository } from './VeterinarianRepository';

// Nutrition
export { StockRepository } from './StockRepository';

// Marketplace Repositories
export { MarketplaceListingRepository } from './MarketplaceListingRepository';
export {
  MarketplaceOfferRepository,
  MarketplaceTransactionRepository,
  MarketplaceRatingRepository,
  MarketplaceNotificationRepository,
  MarketplaceChatRepository,
} from './MarketplaceRepositories';
export {
  WeeklyPorkPriceTrendRepository,
  type WeeklyPorkPriceTrend,
  type CreateWeeklyPorkPriceTrendInput,
  type UpdateWeeklyPorkPriceTrendInput,
} from './WeeklyPorkPriceTrendRepository';

// Service Proposal Notifications
export { ServiceProposalNotificationRepository, type ServiceProposalNotification } from './ServiceProposalNotificationRepository';

// À ajouter si nécessaire :
// export { TraitementRepository } from './TraitementRepository';
// export { MaladieRepository } from './MaladieRepository';
// export { CollaborateurRepository } from './CollaborateurRepository';
// export { PlanificationRepository } from './PlanificationRepository';

