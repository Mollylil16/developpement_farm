/**
 * Export du domaine Production
 */

// Entities
export * from './entities/Animal';

// Repositories (interfaces)
export * from './repositories/IAnimalRepository';

// Use Cases
export * from './useCases/CreateAnimal';
export * from './useCases/UpdateAnimal';
export * from './useCases/GetAnimalStatistics';

// Services
export * from './services/AnimalStatisticsService';
