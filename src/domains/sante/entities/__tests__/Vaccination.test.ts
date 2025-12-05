/**
 * Tests pour VaccinationEntity
 * 
 * Tests de la logique métier de l'entité Vaccination
 */

import { VaccinationEntity, type Vaccination } from '../Vaccination';

describe('VaccinationEntity', () => {
  const createMockVaccination = (overrides?: Partial<Vaccination>): Vaccination => ({
    id: 'vaccination-1',
    projetId: 'projet-1',
    calendrierId: 'calendrier-1',
    animalId: 'animal-1',
    vaccin: 'vaccin-test',
    nomVaccin: 'Vaccin Test',
    dateVaccination: '2024-01-15',
    dateRappel: '2024-02-15',
    numeroLotVaccin: 'LOT-123',
    veterinaire: 'Dr. Test',
    cout: 5000,
    statut: 'effectue',
    effetsSecondaires: undefined,
    notes: 'Vaccination effectuée',
    animalIds: undefined,
    typeProphylaxie: undefined,
    produitAdministre: undefined,
    photoFlacon: undefined,
    dosage: undefined,
    uniteDosage: undefined,
    raisonTraitement: undefined,
    raisonAutre: undefined,
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  describe('isEffectuee', () => {
    it('devrait retourner true si le statut est effectue', () => {
      const vaccination = createMockVaccination({
        statut: 'effectue',
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isEffectuee()).toBe(true);
    });

    it('devrait retourner false si le statut n\'est pas effectue', () => {
      const vaccination = createMockVaccination({
        statut: 'planifie',
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isEffectuee()).toBe(false);
    });
  });

  describe('isEnRetard', () => {
    it('devrait retourner true si la vaccination est en retard', () => {
      const dateVaccination = new Date();
      dateVaccination.setDate(dateVaccination.getDate() - 10); // 10 jours dans le passé

      const vaccination = createMockVaccination({
        statut: 'en_retard',
        dateVaccination: dateVaccination.toISOString().split('T')[0],
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isEnRetard()).toBe(true);
    });

    it('devrait retourner false si le statut n\'est pas en_retard', () => {
      const dateVaccination = new Date();
      dateVaccination.setDate(dateVaccination.getDate() - 10);

      const vaccination = createMockVaccination({
        statut: 'planifie',
        dateVaccination: dateVaccination.toISOString().split('T')[0],
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isEnRetard()).toBe(false);
    });

    it('devrait retourner false si dateVaccination n\'est pas définie', () => {
      const vaccination = createMockVaccination({
        statut: 'en_retard',
        dateVaccination: '',
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isEnRetard()).toBe(false);
    });
  });

  describe('isRappelNecessaire', () => {
    it('devrait retourner true si le rappel est nécessaire', () => {
      const dateRappel = new Date();
      dateRappel.setDate(dateRappel.getDate() - 1); // Hier

      // Si statut est 'effectue' et dateRappel existe, isRappelEffectue() retourne true
      // donc isRappelNecessaire() retourne false
      // Pour tester isRappelNecessaire() = true, on utilise un statut 'planifie'
      const vaccination = createMockVaccination({
        statut: 'planifie',
        dateVaccination: '2024-01-01',
        dateRappel: dateRappel.toISOString().split('T')[0],
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isRappelNecessaire()).toBe(true);
    });

    it('devrait retourner false si dateRappel n\'est pas définie', () => {
      const vaccination = createMockVaccination({
        statut: 'effectue',
        dateRappel: undefined,
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isRappelNecessaire()).toBe(false);
    });

    it('devrait retourner false si le rappel est dans le futur', () => {
      const dateRappel = new Date();
      dateRappel.setDate(dateRappel.getDate() + 10); // Dans 10 jours

      const vaccination = createMockVaccination({
        statut: 'effectue',
        dateRappel: dateRappel.toISOString().split('T')[0],
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.isRappelNecessaire()).toBe(false);
    });
  });

  describe('getJoursDepuisVaccination', () => {
    it('devrait calculer le nombre de jours depuis la vaccination', () => {
      const dateVaccination = new Date();
      dateVaccination.setDate(dateVaccination.getDate() - 30); // Il y a 30 jours

      const vaccination = createMockVaccination({
        dateVaccination: dateVaccination.toISOString().split('T')[0],
      });
      const entity = new VaccinationEntity(vaccination);

      const jours = entity.getJoursDepuisVaccination();
      expect(jours).toBeGreaterThanOrEqual(29);
      expect(jours).toBeLessThanOrEqual(31);
    });

    it('devrait retourner null si dateVaccination n\'est pas définie', () => {
      const vaccination = createMockVaccination({
        dateVaccination: '',
      });
      const entity = new VaccinationEntity(vaccination);

      expect(entity.getJoursDepuisVaccination()).toBeNull();
    });
  });
});

