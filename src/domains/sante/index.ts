/**
 * Export du domaine Santé
 */

// Entities
export * from './entities/Vaccination';
export * from './entities/Maladie';

// Repositories (interfaces)
export * from './repositories/ISanteRepository';

// Use Cases
export * from './useCases/GetAlertesSanitaires';
export * from './useCases/CreateVaccination';
export * from './useCases/CreateMaladie';

