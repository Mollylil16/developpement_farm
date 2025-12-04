# Plan d'Amélioration de la Couverture de Tests

## 📊 État Actuel (selon audit)

- **Fichiers de tests**: 65 fichiers pour ~500 fichiers source
- **Couverture actuelle**: ~70% (threshold) mais probablement non atteint
- **Tests E2E**: Aucun
- **Objectif**: 90%+ de couverture

## 🎯 Objectifs par Type de Tests

```bash
# Objectif: 90%+ coverage globale
# Tests unitaires: 80% (priorité)
# Tests intégration: 15% (services critiques)
# Tests E2E: 5% (flux critiques)
```

## 📋 Plan d'Action

### Phase 1: Configuration et Infrastructure (Priorité P0) ✅

#### 1.1 Mise à jour de Jest Config ✅
- [x] Augmenter les thresholds à 90% (statements, branches, functions, lines)
- [ ] Ajouter des thresholds par répertoire (domains, services, repositories)
- [ ] Configurer les reports de couverture détaillés

#### 1.2 Structure pour Tests E2E ✅
- [x] Créer le dossier `e2e/`
- [x] Créer les helpers et fixtures E2E
- [ ] Configurer Detox ou Maestro pour React Native
- [ ] Configurer CI/CD pour les tests E2E

#### 1.3 Scripts de Test ✅
- [x] Ajouter `test:unit` - Tests unitaires uniquement
- [x] Ajouter `test:integration` - Tests d'intégration
- [x] Ajouter `test:e2e` - Tests E2E
- [x] Ajouter `test:coverage:html` - Générer rapport HTML
- [x] Ajouter `test:coverage:watch` - Mode watch avec couverture
- [x] Ajouter `test:identify-untested` - Identifier les fichiers non testés

### Phase 2: Tests Unitaires - Services Critiques (Priorité P0)

#### 2.1 Services Non Testés (15 fichiers)
- [x] `src/services/database.ts` - **CRITIQUE** ✅ (24 tests créés, tous passent)
- [ ] `src/services/exportService.ts` - Export de données
- [ ] `src/services/pdfService.ts` - Génération PDF
- [ ] `src/services/notificationsService.ts` - Notifications
- [ ] `src/services/i18n.ts` - Internationalisation
- [ ] `src/services/PurchaseRequestService.ts` - Demandes d'achat
- [ ] `src/services/ServiceProposalNotificationService.ts` - Notifications de propositions
- [ ] `src/services/chat/ChatService.ts` - Service de chat
- [ ] `src/services/sante/SanteAlertesService.ts` - Alertes santé
- [ ] `src/services/sante/SanteHistoriqueService.ts` - Historique santé
- [ ] `src/services/sante/SanteTempsAttenteService.ts` - Temps d'attente
- [ ] `src/services/MarketplacePermissions.ts` - Permissions marketplace
- [ ] `src/services/pdf/dashboardPDF.ts` - PDF dashboard
- [ ] `src/services/pdf/financePDF.ts` - PDF finance
- [ ] `src/services/pdf/rapportCompletPDF.ts` - PDF rapport complet

#### 2.2 Services Partiellement Testés
- [ ] Améliorer `src/services/MarketplaceService.test.ts` (couverture complète)
- [ ] Vérifier et compléter les autres services testés

### Phase 3: Tests Unitaires - Repositories (Priorité P1)

#### 3.1 Repositories Non Testés (25 fichiers)
- [ ] `src/database/repositories/AnimalRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/FinanceRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/GestationRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/MortaliteRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/PeseeRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/ProjetRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/UserRepository.ts` - **CRITIQUE**
- [ ] `src/database/repositories/BaseRepository.ts` - Base pour tous
- [ ] `src/database/repositories/CalendrierVaccinationRepository.ts`
- [ ] `src/database/repositories/CollaborateurRepository.ts`
- [ ] `src/database/repositories/IngredientRepository.ts`
- [ ] `src/database/repositories/MaladieRepository.ts`
- [ ] `src/database/repositories/PlanificationRepository.ts`
- [ ] `src/database/repositories/PurchaseRequestRepository.ts`
- [ ] `src/database/repositories/RappelVaccinationRepository.ts`
- [ ] `src/database/repositories/RapportCroissanceRepository.ts`
- [ ] `src/database/repositories/RationRepository.ts`
- [ ] `src/database/repositories/SevrageRepository.ts`
- [ ] `src/database/repositories/StockRepository.ts`
- [ ] `src/database/repositories/TraitementRepository.ts`
- [ ] `src/database/repositories/VaccinationRepository.ts`
- [ ] `src/database/repositories/VisiteVeterinaireRepository.ts`
- [ ] `src/database/repositories/ServiceProposalNotificationRepository.ts`
- [ ] `src/database/repositories/MarketplaceRepositories.ts` (si différent de MarketplaceListingRepository)

### Phase 4: Tests Unitaires - Domain Entities (Priorité P1)

#### 4.1 Entities Production
- [ ] `src/domains/production/entities/Animal.ts` - Logique métier animaux
- [ ] Tests pour les méthodes: `calculateAgeInDays`, `isReproducer`, etc.

#### 4.2 Entities Finance
- [ ] `src/domains/finance/entities/Depense.ts` - Logique métier dépenses
- [ ] `src/domains/finance/entities/Revenu.ts` - Logique métier revenus
- [ ] `src/domains/finance/entities/ChargeFixe.ts` - Logique métier charges fixes
- [ ] Tests pour les calculs de marge, validation, etc.

#### 4.3 Entities Santé
- [ ] `src/domains/sante/entities/Vaccination.ts` - Logique métier vaccinations
- [ ] `src/domains/sante/entities/Maladie.ts` - Logique métier maladies
- [ ] Tests pour les alertes, validations, etc.

### Phase 5: Tests Unitaires - Use Cases (Priorité P1)

#### 5.1 Use Cases Production
- [ ] `src/domains/production/useCases/CreateAnimal.ts`
- [ ] `src/domains/production/useCases/UpdateAnimal.ts`
- [ ] `src/domains/production/useCases/GetAnimalStatistics.ts`

#### 5.2 Use Cases Finance
- [ ] `src/domains/finance/useCases/CalculateFinancialBalance.ts`
- [ ] `src/domains/finance/useCases/CreateDepense.ts`
- [ ] `src/domains/finance/useCases/CreateRevenu.ts`

#### 5.3 Use Cases Santé
- [ ] `src/domains/sante/useCases/GetAlertesSanitaires.ts`
- [ ] `src/domains/sante/useCases/CreateVaccination.ts`
- [ ] `src/domains/sante/useCases/CreateMaladie.ts`

### Phase 6: Tests d'Intégration (Priorité P1)

#### 6.1 Intégration Services-Repositories
- [ ] Tests d'intégration pour `database.ts` avec les repositories
- [ ] Tests d'intégration pour les services avec leurs repositories
- [ ] Tests d'intégration pour les migrations

#### 6.2 Intégration Domain-Infrastructure
- [ ] Tests d'intégration pour les use cases avec les repositories
- [ ] Tests d'intégration pour les services de domaine

#### 6.3 Intégration Redux
- [ ] Tests d'intégration pour les slices Redux avec les services
- [ ] Tests d'intégration pour les selectors complexes

### Phase 7: Tests E2E - Flux Critiques (Priorité P2)

#### 7.1 Flux Onboarding
- [ ] E2E: Création de compte utilisateur
- [ ] E2E: Sélection de profil (producteur, acheteur, vétérinaire)
- [ ] E2E: Complétion des informations utilisateur
- [ ] E2E: Création du premier projet

#### 7.2 Flux Production
- [ ] E2E: Ajout d'un animal
- [ ] E2E: Enregistrement d'une pesée
- [ ] E2E: Enregistrement d'une gestation
- [ ] E2E: Enregistrement d'une mortalité

#### 7.3 Flux Finance
- [ ] E2E: Création d'une dépense
- [ ] E2E: Création d'un revenu
- [ ] E2E: Calcul du bilan financier

#### 7.4 Flux Marketplace
- [ ] E2E: Création d'une annonce
- [ ] E2E: Réponse à une offre
- [ ] E2E: Finalisation d'une transaction

## 📊 Métriques de Succès

### Objectifs Quantitatifs
- **Couverture globale**: 90%+
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### Objectifs Qualitatifs
- Tous les fichiers critiques testés
- Tous les cas d'erreur couverts
- Tous les cas limites testés
- Tests rapides (< 5s pour la suite complète)
- Tests maintenables et lisibles

## 🛠️ Outils et Configuration

### Outils de Test
- **Jest**: Framework de test principal
- **React Native Testing Library**: Tests de composants
- **Detox/Maestro**: Tests E2E (à configurer)
- **MSW (Mock Service Worker)**: Mocks d'API (si nécessaire)

### Configuration Recommandée
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
  // Thresholds par répertoire
  './src/domains/**': {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95,
  },
  './src/services/**': {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
  './src/database/repositories/**': {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
}
```

## 📅 Estimation

- **Phase 1** (Configuration): 2 jours
- **Phase 2** (Services): 10 jours
- **Phase 3** (Repositories): 8 jours
- **Phase 4** (Entities): 5 jours
- **Phase 5** (Use Cases): 5 jours
- **Phase 6** (Intégration): 5 jours
- **Phase 7** (E2E): 5 jours

**Total**: ~40 jours/homme (conforme à l'estimation de l'audit)

## 🎯 Priorisation

### P0 (Critique - Semaine 1-2)
1. Configuration Jest (90% threshold)
2. Tests pour `database.ts`
3. Tests pour repositories critiques (Animal, Finance, Projet, User)
4. Tests pour services critiques non testés

### P1 (Important - Semaine 3-6)
1. Tests pour tous les repositories
2. Tests pour domain entities
3. Tests pour use cases
4. Tests d'intégration

### P2 (Souhaitable - Semaine 7-8)
1. Tests E2E pour flux critiques
2. Amélioration de la couverture des composants
3. Tests pour hooks restants

## 📝 Templates de Tests

### Template pour Service
```typescript
import { ServiceName } from '../ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    mockDependency = createMockDependency();
    service = new ServiceName(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('devrait exécuter correctement avec des données valides', async () => {
      // Arrange
      const input = createValidInput();
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
    });

    it('devrait gérer les erreurs correctement', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow('Test error');
    });

    it('devrait gérer les cas limites', async () => {
      // Test edge cases
    });
  });
});
```

### Template pour Repository
```typescript
import { RepositoryName } from '../RepositoryName';
import type { SQLiteDatabase } from 'expo-sqlite';

describe('RepositoryName', () => {
  let repository: RepositoryName;
  let mockDb: jest.Mocked<SQLiteDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    repository = new RepositoryName(mockDb);
  });

  describe('create', () => {
    it('devrait créer un enregistrement', async () => {
      // Test creation
    });
  });

  describe('findById', () => {
    it('devrait trouver un enregistrement par ID', async () => {
      // Test find
    });
  });
});
```

### Template pour Entity
```typescript
import { EntityName } from '../EntityName';

describe('EntityName', () => {
  describe('businessMethod', () => {
    it('devrait calculer correctement', () => {
      const entity = new EntityName(validData);
      const result = entity.businessMethod();
      expect(result).toBe(expectedValue);
    });

    it('devrait valider les données', () => {
      expect(() => new EntityName(invalidData)).toThrow();
    });
  });
});
```

## 🔍 Commandes Utiles

```bash
# Exécuter tous les tests
npm test

# Tests avec couverture
npm run test:coverage

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e

# Rapport HTML de couverture
npm run test:coverage:html

# Watch mode avec couverture
npm run test:coverage:watch

# Tests pour un fichier spécifique
npm test -- ServiceName.test.ts

# Couverture d'un fichier spécifique
npm run test:coverage -- --collectCoverageFrom="src/services/ServiceName.ts"
```

## 📈 Suivi de Progression

### Dashboard de Couverture
- Générer un rapport HTML après chaque session de tests
- Suivre la progression par répertoire
- Identifier les fichiers avec 0% de couverture

### Métriques à Suivre
- Nombre de fichiers testés / total
- Couverture par répertoire
- Couverture par type (services, repositories, entities, etc.)
- Temps d'exécution des tests
- Nombre de tests qui échouent

## 🚀 Prochaines Étapes Immédiates

1. ✅ Mettre à jour `jest.config.js` avec 90% threshold
2. Créer la structure E2E
3. Créer les tests pour `database.ts` (service critique)
4. Créer les tests pour les repositories critiques
5. Ajouter les scripts de test manquants

