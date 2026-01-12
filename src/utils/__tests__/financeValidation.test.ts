/**
 * Tests pour financeValidation
 * Teste toutes les fonctions de validation financière
 */

import {
  validateMontant,
  validateCohérenceVente,
  validateChargeFixe,
  validateDepensePonctuelle,
  validateRevenu,
  validateCalculMarges,
} from '../financeValidation';
import { FINANCE_LIMITS, FINANCE_WEIGHT_LIMITS, FINANCE_ANIMAL_LIMITS } from '../../config/finance.config';
import type { Revenu } from '../../types/finance';

describe('financeValidation', () => {
  describe('validateMontant', () => {
    it('devrait accepter un montant valide', () => {
      const result = validateMontant(1000);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter un montant négatif', () => {
      const result = validateMontant(-100);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Le montant ne peut pas être négatif'))).toBe(true);
    });

    it('devrait rejeter un montant trop élevé', () => {
      const result = validateMontant(FINANCE_LIMITS.MAX_MONTANT + 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Le montant ne peut pas dépasser'))).toBe(true);
    });

    it('devrait avertir pour un montant très faible', () => {
      const result = validateMontant(500);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('devrait avertir pour un montant très élevé', () => {
      const result = validateMontant(FINANCE_LIMITS.MAX_MONTANT_WARNING + 1);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateCohérenceVente', () => {
    it('devrait accepter une vente cohérente', () => {
      // La fonction attend: montant, poidsKg?, nombreAnimaux?
      const result = validateCohérenceVente(120000, 120, 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter un poids négatif', () => {
      const result = validateCohérenceVente(120000, -10, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait rejeter un poids inférieur au minimum', () => {
      const result = validateCohérenceVente(120000, FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG - 1, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait rejeter un poids supérieur au maximum', () => {
      const result = validateCohérenceVente(120000, FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG + 1, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait rejeter un nombre d\'animaux inférieur au minimum', () => {
      const result = validateCohérenceVente(120000, 120, FINANCE_ANIMAL_LIMITS.MIN_NOMBRE_ANIMAUX - 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait rejeter un nombre d\'animaux supérieur au maximum', () => {
      const result = validateCohérenceVente(120000, 120, FINANCE_ANIMAL_LIMITS.MAX_NOMBRE_ANIMAUX + 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateChargeFixe', () => {
    it('devrait accepter une charge fixe valide', () => {
      const result = validateChargeFixe({
        montant: 10000,
        frequence: 'mensuel',
        jour_paiement: 15,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter un montant invalide', () => {
      const result = validateChargeFixe({
        montant: -100,
        frequence: 'mensuel',
        jour_paiement: 15,
      });
      expect(result.isValid).toBe(false);
    });

    it('devrait rejeter un jour de paiement invalide', () => {
      const result = validateChargeFixe({
        montant: 10000,
        frequence: 'mensuel',
        jour_paiement: 35, // Invalide (max 31)
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDepensePonctuelle', () => {
    it('devrait accepter une dépense valide', () => {
      const result = validateDepensePonctuelle({
        montant: 5000,
        categorie: 'alimentation',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter un montant invalide', () => {
      const result = validateDepensePonctuelle({
        montant: -100,
        categorie: 'alimentation',
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateRevenu', () => {
    it('devrait accepter un revenu valide', () => {
      const result = validateRevenu({
        montant: 100000,
        poids_kg: 120,
        nombre_animaux: 2,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter une incohérence montant/poids', () => {
      const result = validateRevenu({
        montant: 1000000, // Montant très élevé
        poids_kg: 10, // Poids très faible (incohérent)
        nombre_animaux: 1,
      });
      // Devrait produire un avertissement ou une erreur selon la logique
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateCalculMarges', () => {
    it('devrait accepter des marges valides', () => {
      const revenu: Revenu = {
        id: '1',
        projet_id: 'proj-1',
        montant: 100000,
        categorie: 'vente_porc',
        date: '2025-01-01',
        date_creation: '2025-01-01',
        poids_kg: 120,
        cout_reel_opex: 80000,
        cout_reel_complet: 90000,
        marge_opex: 20000,
        marge_complete: 10000,
        marge_opex_pourcent: 20,
        marge_complete_pourcent: 10,
      };

      const result = validateCalculMarges(revenu);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter une marge supérieure au montant', () => {
      const revenu: Revenu = {
        id: '1',
        projet_id: 'proj-1',
        montant: 100000,
        categorie: 'vente_porc',
        date: '2025-01-01',
        date_creation: '2025-01-01',
        marge_opex: 150000, // Supérieure au montant
      };

      const result = validateCalculMarges(revenu);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait rejeter un pourcentage de marge invalide', () => {
      const revenu: Revenu = {
        id: '1',
        projet_id: 'proj-1',
        montant: 100000,
        categorie: 'vente_porc',
        date: '2025-01-01',
        date_creation: '2025-01-01',
        marge_opex_pourcent: 150, // Supérieur à 100%
      };

      const result = validateCalculMarges(revenu);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait détecter une incohérence entre marge en valeur et en pourcentage', () => {
      const revenu: Revenu = {
        id: '1',
        projet_id: 'proj-1',
        montant: 100000,
        categorie: 'vente_porc',
        date: '2025-01-01',
        date_creation: '2025-01-01',
        marge_opex: 20000, // 20% du montant
        marge_opex_pourcent: 50, // Incohérent (devrait être 20%)
      };

      const result = validateCalculMarges(revenu);
      // Devrait produire un avertissement ou une erreur
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
