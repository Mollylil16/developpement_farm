/**
 * Tests pour les schémas de validation Finance
 * Vérifie que les validations conditionnelles fonctionnent correctement
 */

import { depenseSchema, revenuSchema, chargeFixeSchema } from '../financeSchemas';

describe('depenseSchema', () => {
  describe('Validation conditionnelle de libelle_categorie', () => {
    it('ne devrait PAS requérir libelle_categorie si categorie !== "autre"', async () => {
      const validData = {
        montant: 50000,
        categorie: 'aliment',
        libelle_categorie: null, // Pas requis pour 'aliment'
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait requérir libelle_categorie si categorie === "autre"', async () => {
      const invalidData = {
        montant: 50000,
        categorie: 'autre',
        libelle_categorie: null, // Requis pour 'autre'
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le libellé de la catégorie est obligatoire'
      );
    });

    it('devrait accepter libelle_categorie si categorie === "autre" et libelle fourni', async () => {
      const validData = {
        montant: 50000,
        categorie: 'autre',
        libelle_categorie: 'Achat divers',
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter libelle_categorie trop court (<3 caractères) pour "autre"', async () => {
      const invalidData = {
        montant: 50000,
        categorie: 'autre',
        libelle_categorie: 'ab', // Trop court
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le libellé doit contenir au moins 3 caractères'
      );
    });
  });

  describe('Validation du champ categorie', () => {
    it('devrait accepter les catégories valides', async () => {
      const categories = ['aliment', 'medicament', 'main_oeuvre', 'batiment', 'materiel', 'autre'];

      for (const cat of categories) {
        const validData = {
          montant: 50000,
          categorie: cat,
          libelle_categorie: cat === 'autre' ? 'Test' : null,
          type_depense: 'OPEX',
          date: '2024-11-26',
          commentaire: null,
          duree_amortissement_mois: null,
        };

        await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
      }
    });

    it('devrait rejeter les catégories invalides', async () => {
      const invalidData = {
        montant: 50000,
        categorie: 'categorie_invalide',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow('Catégorie invalide');
    });

    it('devrait rejeter si categorie est vide', async () => {
      const invalidData = {
        montant: 50000,
        categorie: '',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('Validation conditionnelle de duree_amortissement_mois', () => {
    it('ne devrait PAS requérir duree_amortissement si type_depense === "OPEX"', async () => {
      const validData = {
        montant: 50000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait requérir duree_amortissement si type_depense === "CAPEX"', async () => {
      const invalidData = {
        montant: 50000,
        categorie: 'batiment',
        libelle_categorie: null,
        type_depense: 'CAPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        "La durée d'amortissement est obligatoire pour les CAPEX"
      );
    });

    it('devrait accepter duree_amortissement si type_depense === "CAPEX" et durée fournie', async () => {
      const validData = {
        montant: 500000,
        categorie: 'batiment',
        libelle_categorie: null,
        type_depense: 'CAPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: 36,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });
  });

  describe('Validation du montant', () => {
    it('devrait accepter les montants valides', async () => {
      const validData = {
        montant: 50000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter les montants négatifs', async () => {
      const invalidData = {
        montant: -1000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le montant doit être positif'
      );
    });

    it('devrait rejeter les montants supérieurs à 1 milliard', async () => {
      const invalidData = {
        montant: 1500000000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le montant ne peut pas dépasser 1 milliard de FCFA'
      );
    });

    it('devrait rejeter les montants non numériques', async () => {
      const invalidData = {
        montant: 'abc',
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: null,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le montant doit être un nombre'
      );
    });
  });

  describe('Validation du commentaire', () => {
    it('devrait accepter les commentaires valides', async () => {
      const validData = {
        montant: 50000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: 'Achat de maïs pour alimentation',
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter les commentaires trop longs (>500 caractères)', async () => {
      const longComment = 'a'.repeat(501);
      const invalidData = {
        montant: 50000,
        categorie: 'aliment',
        libelle_categorie: null,
        type_depense: 'OPEX',
        date: '2024-11-26',
        commentaire: longComment,
        duree_amortissement_mois: null,
      };

      await expect(depenseSchema.validate(invalidData)).rejects.toThrow(
        'Le commentaire ne peut pas dépasser 500 caractères'
      );
    });
  });
});

describe('revenuSchema', () => {
  describe('Validation du montant', () => {
    it('devrait accepter les montants valides', async () => {
      const validData = {
        montant: 100000,
        categorie: 'vente_porc',
        date: '2024-11-26',
        poids_kg: null,
        commentaire: null,
      };

      await expect(revenuSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter les montants négatifs', async () => {
      const invalidData = {
        montant: -5000,
        categorie: 'vente_porc',
        date: '2024-11-26',
        poids_kg: null,
        commentaire: null,
      };

      await expect(revenuSchema.validate(invalidData)).rejects.toThrow(
        'Le montant doit être positif'
      );
    });
  });

  describe('Validation de la catégorie', () => {
    it('devrait accepter les catégories valides', async () => {
      const categories = ['vente_porc', 'vente_porcelets', 'autre'];

      for (const cat of categories) {
        const validData = {
          montant: 100000,
          categorie: cat,
          date: '2024-11-26',
          poids_kg: null,
          commentaire: null,
        };

        await expect(revenuSchema.validate(validData)).resolves.toBeDefined();
      }
    });

    it('devrait rejeter les catégories invalides', async () => {
      const invalidData = {
        montant: 100000,
        categorie: 'categorie_invalide',
        date: '2024-11-26',
        poids_kg: null,
        commentaire: null,
      };

      await expect(revenuSchema.validate(invalidData)).rejects.toThrow('Catégorie invalide');
    });
  });
});

describe('chargeFixeSchema', () => {
  describe('Validation du nom', () => {
    it('devrait accepter les noms valides', async () => {
      const validData = {
        nom: 'Loyer mensuel',
        montant_mensuel: 50000,
        categorie: 'infrastructure',
        date_debut: '2024-01-01',
        date_fin: null,
        description: null,
      };

      await expect(chargeFixeSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter les noms trop courts (<2 caractères)', async () => {
      const invalidData = {
        nom: 'a',
        montant_mensuel: 50000,
        categorie: 'infrastructure',
        date_debut: '2024-01-01',
        date_fin: null,
        description: null,
      };

      await expect(chargeFixeSchema.validate(invalidData)).rejects.toThrow(
        'Le nom doit contenir au moins 2 caractères'
      );
    });
  });

  describe('Validation des dates', () => {
    it('devrait accepter date_fin après date_debut', async () => {
      const validData = {
        nom: 'Loyer mensuel',
        montant_mensuel: 50000,
        categorie: 'infrastructure',
        date_debut: '2024-01-01',
        date_fin: '2024-12-31',
        description: null,
      };

      await expect(chargeFixeSchema.validate(validData)).resolves.toBeDefined();
    });

    it('devrait rejeter date_fin avant date_debut', async () => {
      const invalidData = {
        nom: 'Loyer mensuel',
        montant_mensuel: 50000,
        categorie: 'infrastructure',
        date_debut: '2024-12-31',
        date_fin: '2024-01-01',
        description: null,
      };

      await expect(chargeFixeSchema.validate(invalidData)).rejects.toThrow(
        'La date de fin doit être après la date de début'
      );
    });
  });
});

