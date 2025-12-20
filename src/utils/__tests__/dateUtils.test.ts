/**
 * Tests unitaires pour les utilitaires de date
 * Exemple de tests pour des fonctions pures
 */

import { format, addDays, differenceInDays, parseISO } from 'date-fns';

describe('Date Utilities', () => {
  describe('date-fns integration', () => {
    it('devrait formater une date correctement', () => {
      const date = new Date('2025-11-21');
      const formatted = format(date, 'dd/MM/yyyy');
      expect(formatted).toBe('21/11/2025');
    });

    it('devrait ajouter des jours à une date', () => {
      const date = new Date('2025-11-21');
      const result = addDays(date, 7);
      const expected = new Date('2025-11-28');
      expect(format(result, 'yyyy-MM-dd')).toBe(format(expected, 'yyyy-MM-dd'));
    });

    it('devrait calculer la différence entre deux dates', () => {
      const date1 = new Date('2025-11-21');
      const date2 = new Date('2025-11-28');
      const diff = differenceInDays(date2, date1);
      expect(diff).toBe(7);
    });

    it('devrait parser une chaîne ISO', () => {
      const isoString = '2025-11-21T10:30:00.000Z';
      const date = parseISO(isoString);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // Novembre = 10 (0-indexed)
    });
  });

  describe('Date Calculations for Production', () => {
    it('devrait calculer la date de mise bas (114 jours après saillie)', () => {
      const dateSaillie = new Date('2025-01-01');
      const dateMiseBas = addDays(dateSaillie, 114);
      const expected = new Date('2025-04-25');
      expect(format(dateMiseBas, 'yyyy-MM-dd')).toBe(format(expected, 'yyyy-MM-dd'));
    });

    it('devrait calculer la date de sevrage (21 jours après mise bas)', () => {
      const dateMiseBas = new Date('2025-04-25');
      const dateSevrage = addDays(dateMiseBas, 21);
      const expected = new Date('2025-05-16');
      expect(format(dateSevrage, 'yyyy-MM-dd')).toBe(format(expected, 'yyyy-MM-dd'));
    });

    it('devrait vérifier si une date est dans le passé', () => {
      const datePassee = new Date('2020-01-01');
      const dateFuture = new Date('2030-01-01');
      const maintenant = new Date();

      expect(datePassee < maintenant).toBe(true);
      expect(dateFuture > maintenant).toBe(true);
    });
  });
});
