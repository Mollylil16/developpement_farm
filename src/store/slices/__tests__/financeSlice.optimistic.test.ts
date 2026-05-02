/**
 * Tests pour les optimistic updates dans financeSlice
 * Teste le comportement des mises à jour optimistes (création, modification, suppression)
 */

import { configureStore } from '@reduxjs/toolkit';
import financeReducer, {
  createChargeFixe,
  updateChargeFixe,
  deleteChargeFixe,
  createDepensePonctuelle,
  updateDepensePonctuelle,
  deleteDepensePonctuelle,
  createRevenu,
  updateRevenu,
  deleteRevenu,
} from '../financeSlice';
import apiClient from '../../../services/api/apiClient';

// Mock apiClient
jest.mock('../../../services/api/apiClient', () => ({
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
}));

// Mock financeCache
jest.mock('../../../services/financeCache', () => ({
  invalidateCoutsProductionCache: jest.fn().mockResolvedValue(undefined),
  setCachedMargesVente: jest.fn().mockResolvedValue(undefined),
}));

describe('financeSlice - Optimistic Updates', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        finance: financeReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          immutableCheck: false, // Désactiver pour les tests d'optimistic updates (Immer gère l'immutabilité)
        }),
    });

    jest.clearAllMocks();
  });

  describe('Charges Fixes - Optimistic Updates', () => {
    it('devrait créer une charge fixe optimiste immédiatement', async () => {
      const newCharge = {
        projet_id: 'proj-1',
        categorie: 'salaires',
        libelle: 'Salaire employé',
        montant: 100000,
        date_debut: '2025-01-01',
        frequence: 'mensuel' as const,
        jour_paiement: 15,
      };

      const createdCharge = {
        id: 'charge-1',
        ...newCharge,
        statut: 'actif',
        date_creation: '2025-01-01T00:00:00Z',
        derniere_modification: '2025-01-01T00:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(createdCharge);

      const promise = store.dispatch(createChargeFixe(newCharge));

      // Vérifier que l'état a été mis à jour immédiatement (optimistic update)
      const pendingState = store.getState().finance;
      const pendingCharges = Object.values(pendingState.entities.chargesFixes);
      
      // Devrait avoir une charge temporaire
      const tempCharge = pendingCharges.find(c => c.id.startsWith('temp_charge_fixe_'));
      expect(tempCharge).toBeDefined();
      expect(tempCharge?.montant).toBe(100000);
      expect(tempCharge?.libelle).toBe('Salaire employé');

      await promise;

      // Après la confirmation, la charge temporaire devrait être remplacée par la vraie charge
      const fulfilledState = store.getState().finance;
      const finalCharge = fulfilledState.entities.chargesFixes['charge-1'];
      expect(finalCharge).toBeDefined();
      expect(finalCharge.id).toBe('charge-1');
      expect(finalCharge.montant).toBe(100000);

      // La charge temporaire ne devrait plus exister
      const tempCharges = Object.values(fulfilledState.entities.chargesFixes).filter(
        c => c.id.startsWith('temp_charge_fixe_')
      );
      expect(tempCharges).toHaveLength(0);
    });

    it('devrait faire un rollback si la création échoue', async () => {
      const newCharge = {
        projet_id: 'proj-1',
        categorie: 'salaires',
        libelle: 'Salaire employé',
        montant: 100000,
        date_debut: '2025-01-01',
        frequence: 'mensuel' as const,
        jour_paiement: 15,
      };

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

      const promise = store.dispatch(createChargeFixe(newCharge));

      // Vérifier que l'état a été mis à jour optimistiquement
      const pendingState = store.getState().finance;
      const tempChargesBefore = Object.values(pendingState.entities.chargesFixes).filter(
        c => c.id.startsWith('temp_charge_fixe_')
      );
      expect(tempChargesBefore.length).toBeGreaterThan(0);

      await promise;

      // Après l'échec, la charge temporaire devrait être supprimée (rollback)
      const rejectedState = store.getState().finance;
      const tempChargesAfter = Object.values(rejectedState.entities.chargesFixes).filter(
        c => c.id.startsWith('temp_charge_fixe_')
      );
      expect(tempChargesAfter).toHaveLength(0);
      expect(rejectedState.error).toBeDefined();
    });

    it('devrait mettre à jour une charge fixe optimistement', async () => {
      // Créer une charge initiale
      const initialCharge = {
        id: 'charge-1',
        projet_id: 'proj-1',
        categorie: 'salaires',
        libelle: 'Salaire employé',
        montant: 100000,
        date_debut: '2025-01-01',
        frequence: 'mensuel' as const,
        jour_paiement: 15,
        statut: 'actif' as const,
        date_creation: '2025-01-01T00:00:00Z',
        derniere_modification: '2025-01-01T00:00:00Z',
      };

      // Initialiser l'état avec une charge
      store.dispatch({
        type: 'finance/migrateFromLegacy',
        payload: { chargesFixes: [initialCharge] },
      });

      const updatedCharge = {
        ...initialCharge,
        montant: 120000,
        derniere_modification: '2025-01-02T00:00:00Z',
      };

      (apiClient.patch as jest.Mock).mockResolvedValue(updatedCharge);

      const promise = store.dispatch(
        updateChargeFixe({ id: 'charge-1', updates: { montant: 120000 } })
      );

      // Vérifier que l'état a été mis à jour immédiatement (optimistic update)
      const pendingState = store.getState().finance;
      const charge = pendingState.entities.chargesFixes['charge-1'];
      expect(charge.montant).toBe(120000); // Mis à jour immédiatement

      // Vérifier que l'état précédent est sauvegardé
      expect(pendingState.optimisticUpdates.chargesFixes['charge-1']).toBeDefined();
      expect(pendingState.optimisticUpdates.chargesFixes['charge-1'].montant).toBe(100000);

      await promise;

      // Après la confirmation, l'état devrait être correct
      const fulfilledState = store.getState().finance;
      expect(fulfilledState.optimisticUpdates.chargesFixes['charge-1']).toBeUndefined();
    });

    it('devrait supprimer une charge fixe optimistement', async () => {
      const initialCharge = {
        id: 'charge-1',
        projet_id: 'proj-1',
        categorie: 'salaires',
        libelle: 'Salaire employé',
        montant: 100000,
        date_debut: '2025-01-01',
        frequence: 'mensuel' as const,
        jour_paiement: 15,
        statut: 'actif' as const,
        date_creation: '2025-01-01T00:00:00Z',
        derniere_modification: '2025-01-01T00:00:00Z',
      };

      store.dispatch({
        type: 'finance/migrateFromLegacy',
        payload: { chargesFixes: [initialCharge] },
      });

      (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

      const promise = store.dispatch(deleteChargeFixe('charge-1'));

      // Vérifier que la charge a été supprimée immédiatement
      const pendingState = store.getState().finance;
      expect(pendingState.entities.chargesFixes['charge-1']).toBeUndefined();
      expect(pendingState.ids.chargesFixes).not.toContain('charge-1');

      // Vérifier que l'état précédent est sauvegardé pour rollback
      expect(pendingState.optimisticUpdates.chargesFixes['charge-1']).toBeDefined();

      await promise;

      // Après la confirmation, le cache optimistic devrait être nettoyé
      const fulfilledState = store.getState().finance;
      expect(fulfilledState.optimisticUpdates.chargesFixes['charge-1']).toBeUndefined();
    });
  });

  describe('Dépenses Ponctuelles - Optimistic Updates', () => {
    it('devrait créer une dépense optimiste immédiatement', async () => {
      const newDepense = {
        projet_id: 'proj-1',
        montant: 50000,
        categorie: 'alimentation',
        date: '2025-01-15',
      };

      const createdDepense = {
        id: 'depense-1',
        ...newDepense,
        date_creation: '2025-01-15T00:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(createdDepense);

      const promise = store.dispatch(createDepensePonctuelle(newDepense));

      // Vérifier optimistic update
      const pendingState = store.getState().finance;
      const tempDepenses = Object.values(pendingState.entities.depensesPonctuelles).filter(
        d => d.id.startsWith('temp_depense_')
      );
      expect(tempDepenses.length).toBeGreaterThan(0);

      await promise;

      // Vérifier que la dépense temporaire est remplacée
      const fulfilledState = store.getState().finance;
      const finalDepense = fulfilledState.entities.depensesPonctuelles['depense-1'];
      expect(finalDepense).toBeDefined();
    });

    it('devrait faire un rollback si la création de dépense échoue', async () => {
      const newDepense = {
        projet_id: 'proj-1',
        montant: 50000,
        categorie: 'alimentation',
        date: '2025-01-15',
      };

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

      const promise = store.dispatch(createDepensePonctuelle(newDepense));

      await promise;

      // Vérifier rollback
      const rejectedState = store.getState().finance;
      const tempDepenses = Object.values(rejectedState.entities.depensesPonctuelles).filter(
        d => d.id.startsWith('temp_depense_')
      );
      expect(tempDepenses).toHaveLength(0);
      expect(rejectedState.error).toBeDefined();
    });
  });

  describe('Revenus - Optimistic Updates', () => {
    it('devrait créer un revenu optimiste immédiatement', async () => {
      const newRevenu = {
        projet_id: 'proj-1',
        montant: 200000,
        categorie: 'vente_porc' as const,
        date: '2025-01-20',
        poids_kg: 120,
      };

      const createdRevenu = {
        id: 'revenu-1',
        ...newRevenu,
        date_creation: '2025-01-20T00:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(createdRevenu);

      const promise = store.dispatch(createRevenu(newRevenu));

      // Vérifier optimistic update
      const pendingState = store.getState().finance;
      const tempRevenus = Object.values(pendingState.entities.revenus).filter(
        r => r.id.startsWith('temp_revenu_')
      );
      expect(tempRevenus.length).toBeGreaterThan(0);

      await promise;

      // Vérifier remplacement
      const fulfilledState = store.getState().finance;
      const finalRevenu = fulfilledState.entities.revenus['revenu-1'];
      expect(finalRevenu).toBeDefined();
    });
  });
});
