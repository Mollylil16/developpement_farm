/**
 * Index des Repositories
 * Export centralisé pour faciliter les imports
 */

// Base
export { BaseRepository } from './BaseRepository';

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

// Santé Vétérinaire
export { VaccinationRepository } from './VaccinationRepository';
export { MortaliteRepository } from './MortaliteRepository';

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

// À ajouter si nécessaire :
// export { TraitementRepository } from './TraitementRepository';
// export { MaladieRepository } from './MaladieRepository';
// export { CollaborateurRepository } from './CollaborateurRepository';
// export { PlanificationRepository } from './PlanificationRepository';

