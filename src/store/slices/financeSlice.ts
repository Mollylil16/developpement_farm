/**
 * Slice Redux pour la gestion financière
 * Utilise normalizr pour stocker les données de manière normalisée
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { normalize } from 'normalizr';
import type {
  ChargeFixe,
  DepensePonctuelle,
  Revenu,
  CreateChargeFixeInput,
  CreateDepensePonctuelleInput,
  UpdateDepensePonctuelleInput,
  CreateRevenuInput,
  UpdateRevenuInput,
} from '../../types/finance';
import apiClient from '../../services/api/apiClient';
import {
  chargesFixesSchema,
  depensesPonctuellesSchema,
  revenusSchema,
  chargeFixeSchema,
  depensePonctuelleSchema,
  revenuSchema,
} from '../normalization/schemas';
import { createLoggerWithPrefix } from '../../utils/logger';
import {
  validateChargeFixe,
  validateDepensePonctuelle,
  validateRevenu,
  validateCalculMarges,
} from '../../utils/financeValidation';
import { getFinanceErrorMessage } from '../../utils/financeErrors';
import type { RootState } from '../store';
import { FINANCE_WEIGHT_LIMITS } from '../../config/finance.config';
import {
  setCachedCoutsProduction,
  getCachedCoutsProduction,
  invalidateCoutsProductionCache,
  invalidateMargesVenteCache,
  clearExpiredFinanceCaches,
} from '../../services/financeCache';

const logger = createLoggerWithPrefix('FinanceSlice');

// Structure normalisée de l'état
interface NormalizedEntities {
  chargesFixes: Record<string, ChargeFixe>;
  depensesPonctuelles: Record<string, DepensePonctuelle>;
  revenus: Record<string, Revenu>;
}

interface FinanceState {
  entities: NormalizedEntities;
  ids: {
    chargesFixes: string[];
    depensesPonctuelles: string[];
    revenus: string[];
  };
  loading: boolean;
  error: string | null;
  // OPTIMISTIC UPDATES : Stockage des états précédents pour rollback
  optimisticUpdates: {
    chargesFixes: Record<string, ChargeFixe>; // État précédent avant modification/suppression
    depensesPonctuelles: Record<string, DepensePonctuelle>;
    revenus: Record<string, Revenu>;
  };
  // IDs temporaires pour les créations optimistes
  tempIds: {
    chargesFixes: Record<string, string>; // requestId -> tempId
    depensesPonctuelles: Record<string, string>;
    revenus: Record<string, string>;
  };
}

const initialState: FinanceState = {
  entities: {
    chargesFixes: {},
    depensesPonctuelles: {},
    revenus: {},
  },
  ids: {
    chargesFixes: [],
    depensesPonctuelles: [],
    revenus: [],
  },
  loading: false,
  error: null,
  optimisticUpdates: {
    chargesFixes: {},
    depensesPonctuelles: {},
    revenus: {},
  },
  tempIds: {
    chargesFixes: {},
    depensesPonctuelles: {},
    revenus: {},
  },
};

// Helpers pour normaliser
const normalizeChargesFixes = (charges: ChargeFixe[]) => normalize(charges, chargesFixesSchema);
const normalizeDepensesPonctuelles = (depenses: DepensePonctuelle[]) =>
  normalize(depenses, depensesPonctuellesSchema);
const normalizeRevenus = (revenus: Revenu[]) => normalize(revenus, revenusSchema);
const normalizeChargeFixe = (charge: ChargeFixe) => normalize([charge], chargesFixesSchema);
const normalizeDepensePonctuelle = (depense: DepensePonctuelle) =>
  normalize([depense], depensesPonctuellesSchema);
const normalizeRevenu = (revenu: Revenu) => normalize([revenu], revenusSchema);

// Thunks pour Charges Fixes
export const createChargeFixe = createAsyncThunk(
  'finance/createChargeFixe',
  async (input: CreateChargeFixeInput, { rejectWithValue }) => {
    try {
      // VALIDATION : Valider le montant et les données avant l'envoi
      const validation = validateChargeFixe({
        montant: input.montant,
        frequence: input.frequence,
        jour_paiement: input.jour_paiement,
      });

      if (!validation.isValid) {
        logger.warn('[createChargeFixe] Validation échouée:', validation.errors);
        return rejectWithValue(validation.errors.join('. '));
      }

      if (validation.warnings.length > 0) {
        logger.warn('[createChargeFixe] Avertissements de validation:', validation.warnings);
      }

      // Le backend définit automatiquement statut='actif'
      const charge = await apiClient.post<ChargeFixe>('/finance/charges-fixes', input);
      
      // Invalider le cache des coûts de production car une nouvelle charge fixe affecte les calculs
      if (input.projet_id) {
        invalidateCoutsProductionCache(input.projet_id).catch((error) => {
          logger.warn('[createChargeFixe] Erreur lors de l\'invalidation du cache:', error);
        });
      }
      
      return charge;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[createChargeFixe] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la création de la charge fixe');
    }
  }
);

export const loadChargesFixes = createAsyncThunk(
  'finance/loadChargesFixes',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const charges = await apiClient.get<ChargeFixe[]>('/finance/charges-fixes', {
        params: { projet_id: projetId },
      });
      return charges;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[loadChargesFixes] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du chargement des charges fixes');
    }
  }
);

export const updateChargeFixe = createAsyncThunk(
  'finance/updateChargeFixe',
  async ({ id, updates }: { id: string; updates: Partial<ChargeFixe> }, { rejectWithValue, getState }) => {
    try {
      // VALIDATION : Valider le montant si présent dans les mises à jour
      if (updates.montant !== undefined) {
        const validation = validateChargeFixe({
          montant: updates.montant,
          frequence: updates.frequence || 'mensuel', // Valeur par défaut si non fournie
          jour_paiement: updates.jour_paiement,
        });

        if (!validation.isValid) {
          logger.warn('[updateChargeFixe] Validation échouée:', validation.errors);
          return rejectWithValue(validation.errors.join('. '));
        }

        if (validation.warnings.length > 0) {
          logger.warn('[updateChargeFixe] Avertissements de validation:', validation.warnings);
        }
      }

      const charge = await apiClient.patch<ChargeFixe>(`/finance/charges-fixes/${id}`, updates);
      
      // Invalider le cache des coûts si le montant ou la fréquence change
      if (updates.montant !== undefined || updates.frequence !== undefined || updates.statut !== undefined) {
        // Récupérer le projet_id depuis l'entité existante
        const state = getState() as RootState;
        const existingCharge = state.finance?.entities?.chargesFixes?.[id];
        if (existingCharge?.projet_id) {
          invalidateCoutsProductionCache(existingCharge.projet_id).catch((error) => {
            logger.warn('[updateChargeFixe] Erreur lors de l\'invalidation du cache:', error);
          });
        }
      }
      
      return charge;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[updateChargeFixe] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la mise à jour de la charge fixe');
    }
  }
);

export const deleteChargeFixe = createAsyncThunk(
  'finance/deleteChargeFixe',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      // Récupérer le projet_id avant la suppression pour invalider le cache
      const state = getState() as RootState;
      const existingCharge = state.finance?.entities?.chargesFixes?.[id];
      const projetId = existingCharge?.projet_id;
      
      await apiClient.delete(`/finance/charges-fixes/${id}`);
      
      // Invalider le cache des coûts de production
      if (projetId) {
        invalidateCoutsProductionCache(projetId).catch((error) => {
          logger.warn('[deleteChargeFixe] Erreur lors de l\'invalidation du cache:', error);
        });
      }
      
      return id;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[deleteChargeFixe] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la suppression de la charge fixe');
    }
  }
);

// Thunks pour Dépenses Ponctuelles
export const createDepensePonctuelle = createAsyncThunk(
  'finance/createDepensePonctuelle',
  async (input: CreateDepensePonctuelleInput, { rejectWithValue }) => {
    try {
      // VALIDATION : Valider le montant avant l'envoi
      const validation = validateDepensePonctuelle({
        montant: input.montant,
        categorie: input.categorie,
      });

      if (!validation.isValid) {
        logger.warn('[createDepensePonctuelle] Validation échouée:', validation.errors);
        return rejectWithValue(validation.errors.join('. '));
      }

      if (validation.warnings.length > 0) {
        logger.warn('[createDepensePonctuelle] Avertissements de validation:', validation.warnings);
      }

      // Le backend détermine automatiquement type_opex_capex selon la catégorie
      const depense = await apiClient.post<DepensePonctuelle>(
        '/finance/depenses-ponctuelles',
        input
      );
      
      // Invalider le cache des coûts de production car une nouvelle dépense affecte les calculs
      invalidateCoutsProductionCache(input.projet_id).catch((error) => {
        logger.warn('[createDepensePonctuelle] Erreur lors de l\'invalidation du cache:', error);
      });
      
      return depense;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[createDepensePonctuelle] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la création de la dépense');
    }
  }
);

export const loadDepensesPonctuelles = createAsyncThunk(
  'finance/loadDepensesPonctuelles',
  async (projetId: string, { rejectWithValue }) => {
    try {
      logger.debug(`loadDepensesPonctuelles appelé pour projetId: ${projetId}`);
      const depenses = await apiClient.get<DepensePonctuelle[]>('/finance/depenses-ponctuelles', {
        params: { projet_id: projetId },
      });
      logger.debug(`${depenses.length} dépenses chargées depuis l'API`);
      return depenses;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[loadDepensesPonctuelles] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du chargement des dépenses');
    }
  }
);

export const updateDepensePonctuelle = createAsyncThunk(
  'finance/updateDepensePonctuelle',
  async (
    { id, updates }: { id: string; updates: UpdateDepensePonctuelleInput },
    { rejectWithValue, getState }
  ) => {
    try {
      // VALIDATION : Valider le montant si présent dans les mises à jour
      if (updates.montant !== undefined) {
        const validation = validateDepensePonctuelle({
          montant: updates.montant,
          categorie: updates.categorie || 'autre', // Valeur par défaut si non fournie
        });

        if (!validation.isValid) {
          logger.warn('[updateDepensePonctuelle] Validation échouée:', validation.errors);
          return rejectWithValue(validation.errors.join('. '));
        }

        if (validation.warnings.length > 0) {
          logger.warn('[updateDepensePonctuelle] Avertissements de validation:', validation.warnings);
        }
      }

      // Le backend recalcule automatiquement type_opex_capex si la catégorie change
      const depense = await apiClient.patch<DepensePonctuelle>(
        `/finance/depenses-ponctuelles/${id}`,
        updates
      );
      
      // Invalider le cache des coûts si le montant, la catégorie ou la date change
      if (updates.montant !== undefined || updates.categorie !== undefined || updates.date !== undefined) {
        // Récupérer le projet_id depuis l'entité existante
        const state = getState() as RootState;
        const existingDepense = state.finance?.entities?.depensesPonctuelles?.[id];
        if (existingDepense?.projet_id) {
          invalidateCoutsProductionCache(existingDepense.projet_id).catch((error) => {
            logger.warn('[updateDepensePonctuelle] Erreur lors de l\'invalidation du cache:', error);
          });
        }
      }
      
      return depense;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[updateDepensePonctuelle] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la mise à jour de la dépense');
    }
  }
);

export const deleteDepensePonctuelle = createAsyncThunk(
  'finance/deleteDepensePonctuelle',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      // Récupérer le projet_id avant la suppression pour invalider le cache
      const state = getState() as RootState;
      const existingDepense = state.finance?.entities?.depensesPonctuelles?.[id];
      const projetId = existingDepense?.projet_id;
      
      await apiClient.delete(`/finance/depenses-ponctuelles/${id}`);
      
      // Invalider le cache des coûts de production
      if (projetId) {
        invalidateCoutsProductionCache(projetId).catch((error) => {
          logger.warn('[deleteDepensePonctuelle] Erreur lors de l\'invalidation du cache:', error);
        });
      }
      
      return id;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[deleteDepensePonctuelle] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la suppression de la dépense');
    }
  }
);

// Thunks pour Revenus
export const createRevenu = createAsyncThunk(
  'finance/createRevenu',
  async (input: CreateRevenuInput, { rejectWithValue }) => {
    try {
      // VALIDATION : Valider le montant et la cohérence (montant, poids, nombre) avant l'envoi
      const validation = validateRevenu({
        montant: input.montant,
        categorie: input.categorie,
        poids_kg: input.poids_kg,
        nombre_animaux: input.nombre_animaux,
      });

      if (!validation.isValid) {
        logger.warn('[createRevenu] Validation échouée:', validation.errors);
        return rejectWithValue(validation.errors.join('. '));
      }

      if (validation.warnings.length > 0) {
        logger.warn('[createRevenu] Avertissements de validation:', validation.warnings);
      }

      const revenu = await apiClient.post<Revenu>('/finance/revenus', input);
      return revenu;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[createRevenu] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la création du revenu');
    }
  }
);

export const loadRevenus = createAsyncThunk(
  'finance/loadRevenus',
  async (projetId: string, { rejectWithValue }) => {
    try {
      logger.debug(`loadRevenus appelé pour projetId: ${projetId}`);
      const revenus = await apiClient.get<Revenu[]>('/finance/revenus', {
        params: { projet_id: projetId },
      });
      logger.debug(`${revenus.length} revenus chargés depuis l'API`);
      
      // VALIDATION POST-CHARGEMENT : Valider les marges de chaque revenu chargé
      const revenusAvecErreurs: Array<{ id: string; errors: string[] }> = [];
      for (const revenu of revenus) {
        if (revenu.marge_opex !== undefined || revenu.marge_complete !== undefined) {
          const margeValidation = validateCalculMarges(revenu);
          if (!margeValidation.isValid) {
            logger.warn(`[loadRevenus] Revenu ${revenu.id} a des erreurs de validation des marges:`, margeValidation.errors);
            revenusAvecErreurs.push({ id: revenu.id, errors: margeValidation.errors });
          }
          if (margeValidation.warnings.length > 0) {
            logger.debug(`[loadRevenus] Revenu ${revenu.id} a des avertissements de validation:`, margeValidation.warnings);
          }
        }
      }
      
      if (revenusAvecErreurs.length > 0 && __DEV__) {
        logger.warn(`[loadRevenus] ${revenusAvecErreurs.length} revenu(s) avec des erreurs de validation des marges`);
      }
      
      return revenus;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[loadRevenus] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du chargement des revenus');
    }
  }
);

export const updateRevenu = createAsyncThunk(
  'finance/updateRevenu',
  async ({ id, updates }: { id: string; updates: UpdateRevenuInput }, { rejectWithValue, getState }) => {
    try {
      // VALIDATION : Valider le montant et la cohérence si présents dans les mises à jour
      if (updates.montant !== undefined || updates.poids_kg !== undefined || updates.nombre_animaux !== undefined) {
        // Récupérer le revenu actuel pour avoir les valeurs par défaut
        const state = getState() as RootState;
        const revenuActuel = state.finance?.entities?.revenus?.[id];
        
        const validation = validateRevenu({
          montant: updates.montant ?? revenuActuel?.montant ?? 0,
          categorie: updates.categorie || revenuActuel?.categorie || 'vente_porc',
          poids_kg: updates.poids_kg ?? revenuActuel?.poids_kg,
          nombre_animaux: updates.nombre_animaux ?? revenuActuel?.nombre_animaux,
        });

        if (!validation.isValid) {
          logger.warn('[updateRevenu] Validation échouée:', validation.errors);
          return rejectWithValue(validation.errors.join('. '));
        }

        if (validation.warnings.length > 0) {
          logger.warn('[updateRevenu] Avertissements de validation:', validation.warnings);
        }
      }

      const revenu = await apiClient.patch<Revenu>(`/finance/revenus/${id}`, updates);
      
      // VALIDATION POST-RÉCEPTION : Valider les calculs de marges si présents
      if (revenu.marge_opex !== undefined || revenu.marge_complete !== undefined) {
        const margeValidation = validateCalculMarges(revenu);
        if (!margeValidation.isValid) {
          logger.error('[updateRevenu] Erreurs de validation des marges après mise à jour:', margeValidation.errors);
          // Ne pas rejeter, juste logger l'erreur (les données sont déjà enregistrées)
        }
        if (margeValidation.warnings.length > 0) {
          logger.warn('[updateRevenu] Avertissements de validation des marges:', margeValidation.warnings);
        }
      }
      
      return revenu;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[updateRevenu] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la mise à jour du revenu');
    }
  }
);

export const deleteRevenu = createAsyncThunk(
  'finance/deleteRevenu',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/revenus/${id}`);
      return id;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[deleteRevenu] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors de la suppression du revenu');
    }
  }
);

// ========================================
// Thunks OPEX/CAPEX - Calcul des marges
// ========================================

/**
 * Calcule et sauvegarde les marges pour une vente de porc
 * TODO: Implémenter endpoint backend pour le calcul des marges
 */
export const calculateAndSaveMargesVente = createAsyncThunk(
  'finance/calculateAndSaveMargesVente',
  async (
    { venteId, poidsKg }: { venteId: string; poidsKg: number },
    { getState, rejectWithValue }
  ) => {
    try {
      // VALIDATION : Valider le poids avant le calcul
      if (typeof poidsKg !== 'number' || isNaN(poidsKg) || poidsKg <= 0) {
        return rejectWithValue('Le poids doit être un nombre positif');
      }
      if (poidsKg < FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG) {
        return rejectWithValue(`Le poids doit être au moins ${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} kg`);
      }
      if (poidsKg > FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG) {
        return rejectWithValue(`Le poids ne peut pas dépasser ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg`);
      }

      // OPTIMISATION : Essayer de récupérer depuis le cache avant d'appeler l'API
      // Note: Pour les marges, on ne peut pas vraiment utiliser le cache car le poids peut varier
      // Mais on peut vérifier si la vente a déjà des marges calculées avec le même poids
      const state = getState() as RootState;
      const existingRevenu = state.finance?.entities?.revenus?.[venteId];
      
      // Si la vente a déjà des marges calculées avec le même poids, on peut retourner directement
      if (existingRevenu?.poids_kg === poidsKg && existingRevenu?.marge_opex !== undefined) {
        logger.debug('[calculateAndSaveMargesVente] Marges déjà calculées avec le même poids, pas besoin de recalculer');
        return existingRevenu;
      }

      const venteUpdated = await apiClient.post<Revenu>(
        `/finance/revenus/${venteId}/calculer-marges`,
        {
          poids_kg: poidsKg,
        }
      );

      // VALIDATION POST-CALCUL : Valider les marges calculées par le backend
      const margeValidation = validateCalculMarges(venteUpdated);
      if (!margeValidation.isValid) {
        logger.error('[calculateAndSaveMargesVente] Erreurs de validation des marges calculées:', margeValidation.errors);
        const criticalErrors = margeValidation.errors.filter(e => 
          e.includes('ne peut pas être supérieure') || e.includes('doit être entre')
        );
        if (criticalErrors.length > 0) {
          return rejectWithValue(criticalErrors.join('. '));
        }
      }
      if (margeValidation.warnings.length > 0) {
        logger.warn('[calculateAndSaveMargesVente] Avertissements de validation des marges:', margeValidation.warnings);
      }

      // Mettre en cache les marges calculées
      if (venteUpdated.poids_kg && venteUpdated.marge_opex !== undefined) {
        setCachedMargesVente(venteId, {
          poids_kg: venteUpdated.poids_kg,
          cout_kg_opex: venteUpdated.cout_kg_opex || 0,
          cout_kg_complet: venteUpdated.cout_kg_complet || 0,
          cout_reel_opex: venteUpdated.cout_reel_opex || 0,
          cout_reel_complet: venteUpdated.cout_reel_complet || 0,
          marge_opex: venteUpdated.marge_opex,
          marge_complete: venteUpdated.marge_complete || 0,
          marge_opex_pourcent: venteUpdated.marge_opex_pourcent || 0,
          marge_complete_pourcent: venteUpdated.marge_complete_pourcent || 0,
        }).catch((error) => {
          logger.warn('[calculateAndSaveMargesVente] Erreur lors de la mise en cache des marges:', error);
        });
      }

      return venteUpdated;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[calculateAndSaveMargesVente] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du calcul des marges');
    }
  }
);

/**
 * Recalcule les marges de toutes les ventes d'une période
 * Utilise l'endpoint backend POST /finance/revenus/recalculer-marges
 */
export const recalculerMargesPeriode = createAsyncThunk(
  'finance/recalculerMargesPeriode',
  async (
    { projetId, dateDebut, dateFin }: { projetId: string; dateDebut: Date; dateFin: Date },
    { rejectWithValue }
  ) => {
    try {
      // VALIDATION : Vérifier que les dates sont valides
      if (!dateDebut || !dateFin) {
        return rejectWithValue('Les dates de début et de fin sont requises');
      }
      if (dateDebut > dateFin) {
        return rejectWithValue('La date de début doit être antérieure à la date de fin');
      }

      // OPTIMISATION : Essayer de récupérer les coûts de production depuis le cache
      const dateDebutStr = dateDebut.toISOString();
      const dateFinStr = dateFin.toISOString();
      
      let coutsPeriode: { cout_kg_opex: number; cout_kg_complet: number } | null = null;
      const cachedCouts = await getCachedCoutsProduction(projetId, dateDebutStr, dateFinStr);
      if (cachedCouts) {
        coutsPeriode = {
          cout_kg_opex: cachedCouts.cout_kg_opex,
          cout_kg_complet: cachedCouts.cout_kg_complet,
        };
        logger.debug('[recalculerMargesPeriode] Coûts de production récupérés depuis le cache');
      }

      // Appeler l'endpoint backend pour recalculer les marges
      const response = await apiClient.post<{
        nombre_ventes_recalculees: number;
        periode: {
          date_debut: string;
          date_fin: string;
        };
        couts_periode: {
          cout_kg_opex: number;
          cout_kg_complet: number;
        };
        ventes: Array<{
          id: string;
          date: string;
          poids_kg: number;
          montant: number;
          marge_opex: number;
          marge_complete: number;
        }>;
      }>(
        '/finance/revenus/recalculer-marges',
        {
          date_debut: dateDebutStr,
          date_fin: dateFinStr,
        },
        {
          params: { projet_id: projetId },
        }
      );
      
      // Mettre en cache les coûts de production calculés (pour utilisation future)
      // Note: Le backend retourne les coûts de la période, on peut les mettre en cache
      // Mais on aurait besoin de plus d'infos (total_opex, total_amortissement_capex, total_kg_vendus)
      // Pour l'instant, on ne met pas en cache car les données ne sont pas complètes

      // Recharger tous les revenus mis à jour depuis le backend
      const revenus = await apiClient.get<Revenu[]>('/finance/revenus', {
        params: { projet_id: projetId },
      });

      // VALIDATION POST-RECALCUL : Valider les marges de chaque revenu recalculé
      // Mettre en cache les marges calculées pour chaque vente
      for (const revenu of revenus) {
        if (revenu.marge_opex !== undefined || revenu.marge_complete !== undefined) {
          const margeValidation = validateCalculMarges(revenu);
          if (!margeValidation.isValid) {
            logger.warn(`[recalculerMargesPeriode] Revenu ${revenu.id} a des erreurs de validation:`, margeValidation.errors);
          }
          
          // Mettre en cache les marges calculées
          if (revenu.poids_kg) {
            setCachedMargesVente(revenu.id, {
              poids_kg: revenu.poids_kg,
              cout_kg_opex: revenu.cout_kg_opex || 0,
              cout_kg_complet: revenu.cout_kg_complet || 0,
              cout_reel_opex: revenu.cout_reel_opex || 0,
              cout_reel_complet: revenu.cout_reel_complet || 0,
              marge_opex: revenu.marge_opex || 0,
              marge_complete: revenu.marge_complete || 0,
              marge_opex_pourcent: revenu.marge_opex_pourcent || 0,
              marge_complete_pourcent: revenu.marge_complete_pourcent || 0,
            }).catch((error) => {
              logger.warn(`[recalculerMargesPeriode] Erreur lors de la mise en cache des marges pour ${revenu.id}:`, error);
            });
          }
        }
      }

      logger.debug(`[recalculerMargesPeriode] ${response.nombre_ventes_recalculees} ventes recalculées avec succès`);

      return {
        nombreVentesRecalculees: response.nombre_ventes_recalculees,
        revenus,
        coutsPeriode: response.couts_periode,
      };
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[recalculerMargesPeriode] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du recalcul des marges');
    }
  }
);

/**
 * Obtient les statistiques financières du mois en cours
 * TODO: Implémenter endpoint backend pour les statistiques
 */
export const loadStatistiquesMoisActuel = createAsyncThunk(
  'finance/loadStatistiquesMoisActuel',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stats = await apiClient.get('/finance/stats/mois-actuel', {
        params: { projet_id: projetId },
      });
      return stats;
    } catch (error: unknown) {
      const errorMessage = getFinanceErrorMessage(error);
      logger.error('[loadStatistiquesMoisActuel] Erreur:', error);
      return rejectWithValue(errorMessage || 'Erreur lors du chargement des statistiques');
    }
  }
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Migration: convertir l'ancienne structure en nouvelle structure normalisée
    migrateFromLegacy: (state, action: PayloadAction<unknown>) => {
      const legacyState = action.payload;
      if (
        legacyState &&
        typeof legacyState === 'object' &&
        !('entities' in legacyState) &&
        legacyState !== null
      ) {
        const legacy = legacyState as Record<string, unknown>;
        // Ancienne structure: arrays directs
        if (Array.isArray(legacy.chargesFixes)) {
          const normalized = normalizeChargesFixes(legacy.chargesFixes);
          state.entities.chargesFixes = normalized.entities.chargesFixes || {};
          state.ids.chargesFixes = normalized.result;
        }
        if (Array.isArray(legacy.depensesPonctuelles)) {
          const normalized = normalizeDepensesPonctuelles(legacy.depensesPonctuelles);
          state.entities.depensesPonctuelles = normalized.entities.depensesPonctuelles || {};
          state.ids.depensesPonctuelles = normalized.result;
        }
        if (Array.isArray(legacy.revenus)) {
          const normalized = normalizeRevenus(legacy.revenus);
          state.entities.revenus = normalized.entities.revenus || {};
          state.ids.revenus = normalized.result;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Charges Fixes
      .addCase(createChargeFixe.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        
        // OPTIMISTIC UPDATE : Créer une charge fixe temporaire
        const requestId = action.meta.requestId;
        const tempId = `temp_charge_fixe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempCharge: ChargeFixe = {
          id: tempId,
          projet_id: action.meta.arg.projet_id,
          categorie: action.meta.arg.categorie,
          libelle: action.meta.arg.libelle,
          montant: action.meta.arg.montant,
          date_debut: action.meta.arg.date_debut,
          frequence: action.meta.arg.frequence,
          jour_paiement: action.meta.arg.jour_paiement,
          notes: action.meta.arg.notes,
          statut: 'actif',
          date_creation: new Date().toISOString(),
          derniere_modification: new Date().toISOString(),
        };
        
        const normalized = normalizeChargeFixe(tempCharge);
        // Créer une nouvelle copie des entities au lieu de muter directement
        state.entities.chargesFixes = {
          ...state.entities.chargesFixes,
          ...normalized.entities.chargesFixes,
        };
        // Créer une nouvelle copie des ids
        state.ids.chargesFixes = [normalized.result[0], ...state.ids.chargesFixes];
        // Stocker le mapping requestId -> tempId pour le rollback (créer nouvelle copie)
        state.tempIds.chargesFixes = {
          ...state.tempIds.chargesFixes,
          [requestId]: tempId,
        };
      })
      .addCase(createChargeFixe.fulfilled, (state, action) => {
        state.loading = false;
        const charge = action.payload;
        const requestId = action.meta.requestId;
        
        // Remplacer la charge temporaire par la vraie charge (créer nouvelles copies)
        const tempId = state.tempIds.chargesFixes[requestId];
        if (tempId && state.ids.chargesFixes.includes(tempId)) {
          // Supprimer la charge temporaire
          state.ids.chargesFixes = state.ids.chargesFixes.filter((id) => id !== tempId);
          const newEntities = { ...state.entities.chargesFixes };
          delete newEntities[tempId];
          state.entities.chargesFixes = newEntities;
        }
        // Nettoyer le mapping (créer nouvelle copie)
        const newTempIds = { ...state.tempIds.chargesFixes };
        delete newTempIds[requestId];
        state.tempIds.chargesFixes = newTempIds;
        
        // Ajouter la vraie charge
        const normalized = normalizeChargeFixe(charge);
        state.entities.chargesFixes = {
          ...state.entities.chargesFixes,
          ...normalized.entities.chargesFixes,
        };
        state.ids.chargesFixes = [normalized.result[0], ...state.ids.chargesFixes];
        
        // Note: L'invalidation du cache est faite dans le thunk (pas de side effects dans les reducers)
      })
      .addCase(createChargeFixe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK : Supprimer la charge temporaire (créer nouvelles copies)
        const requestId = action.meta.requestId;
        const tempId = state.tempIds.chargesFixes[requestId];
        if (tempId && state.ids.chargesFixes.includes(tempId)) {
          state.ids.chargesFixes = state.ids.chargesFixes.filter((id) => id !== tempId);
          const newEntities = { ...state.entities.chargesFixes };
          delete newEntities[tempId];
          state.entities.chargesFixes = newEntities;
        }
        // Nettoyer le mapping (créer nouvelle copie)
        const newTempIds = { ...state.tempIds.chargesFixes };
        delete newTempIds[requestId];
        state.tempIds.chargesFixes = newTempIds;
      })
      .addCase(loadChargesFixes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadChargesFixes.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeChargesFixes(action.payload);
        state.entities.chargesFixes = {
          ...state.entities.chargesFixes,
          ...normalized.entities.chargesFixes,
        };
        state.ids.chargesFixes = normalized.result;
      })
      .addCase(loadChargesFixes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateChargeFixe.pending, (state, action) => {
        // OPTIMISTIC UPDATE : Sauvegarder l'état précédent et appliquer les changements immédiatement
        const chargeId = action.meta.arg.id;
        const existingCharge = state.entities.chargesFixes[chargeId];
        
        if (existingCharge) {
          // Sauvegarder l'état précédent pour rollback (créer nouvelle copie)
          state.optimisticUpdates.chargesFixes = {
            ...state.optimisticUpdates.chargesFixes,
            [chargeId]: { ...existingCharge },
          };
          
          // Appliquer les changements immédiatement (créer nouvelle copie des entities)
          state.entities.chargesFixes = {
            ...state.entities.chargesFixes,
            [chargeId]: {
              ...existingCharge,
              ...action.meta.arg.updates,
              derniere_modification: new Date().toISOString(),
            } as ChargeFixe,
          };
        }
      })
      .addCase(updateChargeFixe.fulfilled, (state, action) => {
        // Nettoyer le cache optimistic et appliquer la vraie réponse
        const chargeId = action.payload.id;
        // Nettoyer le cache optimistic (créer nouvelle copie)
        const newOptimisticUpdates = { ...state.optimisticUpdates.chargesFixes };
        delete newOptimisticUpdates[chargeId];
        state.optimisticUpdates.chargesFixes = newOptimisticUpdates;
        
        const normalized = normalizeChargeFixe(action.payload);
        state.entities.chargesFixes = {
          ...state.entities.chargesFixes,
          ...normalized.entities.chargesFixes,
        };
      })
      .addCase(updateChargeFixe.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK : Restaurer l'état précédent
        const chargeId = action.meta.arg.id;
        const previousCharge = state.optimisticUpdates.chargesFixes[chargeId];
        
        if (previousCharge) {
          // Créer une nouvelle copie des entities au lieu de muter directement
          const newEntities = { ...state.entities.chargesFixes };
          newEntities[chargeId] = previousCharge;
          state.entities.chargesFixes = newEntities;
          
          // Créer une nouvelle copie sans la clé rollback
          const newOptimisticUpdates = { ...state.optimisticUpdates.chargesFixes };
          delete newOptimisticUpdates[chargeId];
          state.optimisticUpdates.chargesFixes = newOptimisticUpdates;
        }
      })
      .addCase(deleteChargeFixe.pending, (state, action) => {
        // OPTIMISTIC UPDATE : Supprimer immédiatement
        const chargeId = action.meta.arg;
        const existingCharge = state.entities.chargesFixes[chargeId];
        
        if (existingCharge) {
          // Sauvegarder l'état précédent pour rollback (créer nouvelle copie)
          state.optimisticUpdates.chargesFixes = {
            ...state.optimisticUpdates.chargesFixes,
            [chargeId]: { ...existingCharge },
          };
          
          // Supprimer immédiatement (créer nouvelles copies)
          state.ids.chargesFixes = state.ids.chargesFixes.filter((id) => id !== chargeId);
          const newEntities = { ...state.entities.chargesFixes };
          delete newEntities[chargeId];
          state.entities.chargesFixes = newEntities;
        }
      })
      .addCase(deleteChargeFixe.fulfilled, (state, action) => {
        // Nettoyer le cache optimistic (la suppression était déjà faite)
        const chargeId = action.payload;
        const previousCharge = state.optimisticUpdates.chargesFixes[chargeId];
        
        // Invalider le cache des coûts de production (side effect, pas dans le reducer)
        // Note: L'invalidation est faite dans le thunk, pas ici
        
        // Nettoyer le cache optimistic (créer nouvelle copie)
        const newOptimisticUpdates = { ...state.optimisticUpdates.chargesFixes };
        delete newOptimisticUpdates[chargeId];
        state.optimisticUpdates.chargesFixes = newOptimisticUpdates;
      })
      .addCase(deleteChargeFixe.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK : Restaurer la charge supprimée
        const chargeId = action.meta.arg;
        const previousCharge = state.optimisticUpdates.chargesFixes[chargeId];
        
        if (previousCharge) {
          // Restaurer les entities (créer nouvelle copie)
          state.entities.chargesFixes = {
            ...state.entities.chargesFixes,
            [chargeId]: previousCharge,
          };
          
          // Restaurer l'ID si nécessaire (créer nouvelle copie)
          if (!state.ids.chargesFixes.includes(chargeId)) {
            state.ids.chargesFixes = [...state.ids.chargesFixes, chargeId];
          }
          
          // Nettoyer le cache optimistic (créer nouvelle copie)
          const newOptimisticUpdates = { ...state.optimisticUpdates.chargesFixes };
          delete newOptimisticUpdates[chargeId];
          state.optimisticUpdates.chargesFixes = newOptimisticUpdates;
        }
      })
      // Dépenses Ponctuelles
      .addCase(createDepensePonctuelle.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        
        // OPTIMISTIC UPDATE : Créer une dépense temporaire
        const requestId = action.meta.requestId;
        const tempId = `temp_depense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempDepense: DepensePonctuelle = {
          id: tempId,
          projet_id: action.meta.arg.projet_id,
          montant: action.meta.arg.montant,
          categorie: action.meta.arg.categorie,
          libelle_categorie: action.meta.arg.libelle_categorie,
          date: action.meta.arg.date,
          commentaire: action.meta.arg.commentaire,
          photos: action.meta.arg.photos,
          date_creation: new Date().toISOString(),
        };
        
        const normalized = normalizeDepensePonctuelle(tempDepense);
        // Créer nouvelles copies
        state.entities.depensesPonctuelles = {
          ...state.entities.depensesPonctuelles,
          ...normalized.entities.depensesPonctuelles,
        };
        state.ids.depensesPonctuelles = [normalized.result[0], ...state.ids.depensesPonctuelles];
        state.tempIds.depensesPonctuelles = {
          ...state.tempIds.depensesPonctuelles,
          [requestId]: tempId,
        };
      })
      .addCase(createDepensePonctuelle.fulfilled, (state, action) => {
        state.loading = false;
        const depense = action.payload;
        const requestId = action.meta.requestId;
        
        // Remplacer la dépense temporaire par la vraie dépense (créer nouvelles copies)
        const tempId = state.tempIds.depensesPonctuelles[requestId];
        if (tempId && state.ids.depensesPonctuelles.includes(tempId)) {
          state.ids.depensesPonctuelles = state.ids.depensesPonctuelles.filter((id) => id !== tempId);
          const newEntities = { ...state.entities.depensesPonctuelles };
          delete newEntities[tempId];
          state.entities.depensesPonctuelles = newEntities;
        }
        const newTempIds = { ...state.tempIds.depensesPonctuelles };
        delete newTempIds[requestId];
        state.tempIds.depensesPonctuelles = newTempIds;
        
        const normalized = normalizeDepensePonctuelle(depense);
        state.entities.depensesPonctuelles = {
          ...state.entities.depensesPonctuelles,
          ...normalized.entities.depensesPonctuelles,
        };
        state.ids.depensesPonctuelles = [normalized.result[0], ...state.ids.depensesPonctuelles];
        
        // Note: L'invalidation du cache est faite dans le thunk
      })
      .addCase(createDepensePonctuelle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const requestId = action.meta.requestId;
        const tempId = state.tempIds.depensesPonctuelles[requestId];
        if (tempId && state.ids.depensesPonctuelles.includes(tempId)) {
          state.ids.depensesPonctuelles = state.ids.depensesPonctuelles.filter((id) => id !== tempId);
          const newEntities = { ...state.entities.depensesPonctuelles };
          delete newEntities[tempId];
          state.entities.depensesPonctuelles = newEntities;
        }
        const newTempIds = { ...state.tempIds.depensesPonctuelles };
        delete newTempIds[requestId];
        state.tempIds.depensesPonctuelles = newTempIds;
      })
      .addCase(loadDepensesPonctuelles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDepensesPonctuelles.fulfilled, (state, action) => {
        state.loading = false;
        logger.debug(`Stockage de ${action.payload.length} dépenses dans Redux`);
        const normalized = normalizeDepensesPonctuelles(action.payload);
        state.entities.depensesPonctuelles = {
          ...state.entities.depensesPonctuelles,
          ...normalized.entities.depensesPonctuelles,
        };
        state.ids.depensesPonctuelles = normalized.result;
        logger.debug(
          `State Redux mis à jour: ${state.ids.depensesPonctuelles.length} dépenses`
        );
      })
      .addCase(loadDepensesPonctuelles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDepensePonctuelle.pending, (state, action) => {
        // OPTIMISTIC UPDATE (créer nouvelles copies)
        const depenseId = action.meta.arg.id;
        const existingDepense = state.entities.depensesPonctuelles[depenseId];
        
        if (existingDepense) {
          state.optimisticUpdates.depensesPonctuelles = {
            ...state.optimisticUpdates.depensesPonctuelles,
            [depenseId]: { ...existingDepense },
          };
          state.entities.depensesPonctuelles = {
            ...state.entities.depensesPonctuelles,
            [depenseId]: {
              ...existingDepense,
              ...action.meta.arg.updates,
            } as DepensePonctuelle,
          };
        }
      })
      .addCase(updateDepensePonctuelle.fulfilled, (state, action) => {
        const depenseId = action.payload.id;
        delete state.optimisticUpdates.depensesPonctuelles[depenseId];
        
        const normalized = normalizeDepensePonctuelle(action.payload);
        state.entities.depensesPonctuelles = {
          ...state.entities.depensesPonctuelles,
          ...normalized.entities.depensesPonctuelles,
        };
      })
      .addCase(updateDepensePonctuelle.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const depenseId = action.meta.arg.id;
        const previousDepense = state.optimisticUpdates.depensesPonctuelles[depenseId];
        if (previousDepense) {
          state.entities.depensesPonctuelles = {
            ...state.entities.depensesPonctuelles,
            [depenseId]: previousDepense,
          };
          const newOptimisticUpdates = { ...state.optimisticUpdates.depensesPonctuelles };
          delete newOptimisticUpdates[depenseId];
          state.optimisticUpdates.depensesPonctuelles = newOptimisticUpdates;
        }
      })
      .addCase(deleteDepensePonctuelle.pending, (state, action) => {
        // OPTIMISTIC UPDATE (créer nouvelles copies)
        const depenseId = action.meta.arg;
        const existingDepense = state.entities.depensesPonctuelles[depenseId];
        
        if (existingDepense) {
          state.optimisticUpdates.depensesPonctuelles = {
            ...state.optimisticUpdates.depensesPonctuelles,
            [depenseId]: { ...existingDepense },
          };
          state.ids.depensesPonctuelles = state.ids.depensesPonctuelles.filter(
            (id) => id !== depenseId
          );
          const newEntities = { ...state.entities.depensesPonctuelles };
          delete newEntities[depenseId];
          state.entities.depensesPonctuelles = newEntities;
        }
      })
      .addCase(deleteDepensePonctuelle.fulfilled, (state, action) => {
        const depenseId = action.payload;
        
        // Nettoyer le cache optimistic (créer nouvelle copie)
        // Note: L'invalidation du cache est faite dans le thunk, pas ici
        const newOptimisticUpdates = { ...state.optimisticUpdates.depensesPonctuelles };
        delete newOptimisticUpdates[depenseId];
        state.optimisticUpdates.depensesPonctuelles = newOptimisticUpdates;
      })
      .addCase(deleteDepensePonctuelle.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const depenseId = action.meta.arg;
        const previousDepense = state.optimisticUpdates.depensesPonctuelles[depenseId];
        if (previousDepense) {
          state.entities.depensesPonctuelles = {
            ...state.entities.depensesPonctuelles,
            [depenseId]: previousDepense,
          };
          if (!state.ids.depensesPonctuelles.includes(depenseId)) {
            state.ids.depensesPonctuelles = [...state.ids.depensesPonctuelles, depenseId];
          }
          const newOptimisticUpdates = { ...state.optimisticUpdates.depensesPonctuelles };
          delete newOptimisticUpdates[depenseId];
          state.optimisticUpdates.depensesPonctuelles = newOptimisticUpdates;
        }
      })
      // Revenus
      .addCase(createRevenu.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        
        // OPTIMISTIC UPDATE : Créer un revenu temporaire
        const requestId = action.meta.requestId;
        const tempId = `temp_revenu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempRevenu: Revenu = {
          id: tempId,
          projet_id: action.meta.arg.projet_id,
          montant: action.meta.arg.montant,
          categorie: action.meta.arg.categorie,
          libelle_categorie: action.meta.arg.libelle_categorie,
          date: action.meta.arg.date,
          description: action.meta.arg.description,
          commentaire: action.meta.arg.commentaire,
          photos: action.meta.arg.photos,
          poids_kg: action.meta.arg.poids_kg,
          animal_id: action.meta.arg.animal_id,
          date_creation: new Date().toISOString(),
        };
        
        const normalized = normalizeRevenu(tempRevenu);
        // Créer nouvelles copies
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
        state.ids.revenus = [normalized.result[0], ...state.ids.revenus];
        state.tempIds.revenus = {
          ...state.tempIds.revenus,
          [requestId]: tempId,
        };
      })
      .addCase(createRevenu.fulfilled, (state, action) => {
        state.loading = false;
        const revenu = action.payload;
        const requestId = action.meta.requestId;
        
        // VALIDATION POST-CRÉATION : Valider les marges si présentes (calculées par le backend)
        if (revenu.marge_opex !== undefined || revenu.marge_complete !== undefined) {
          const margeValidation = validateCalculMarges(revenu);
          if (!margeValidation.isValid) {
            logger.error('[createRevenu.fulfilled] Erreurs de validation des marges après création:', margeValidation.errors);
          }
          if (margeValidation.warnings.length > 0) {
            logger.warn('[createRevenu.fulfilled] Avertissements de validation des marges:', margeValidation.warnings);
          }
        }
        
        // Remplacer le revenu temporaire par le vrai revenu
        const tempId = state.tempIds.revenus[requestId];
        if (tempId && state.ids.revenus.includes(tempId)) {
          state.ids.revenus = state.ids.revenus.filter((id) => id !== tempId);
          delete state.entities.revenus[tempId];
        }
        delete state.tempIds.revenus[requestId];
        
        const normalized = normalizeRevenu(revenu);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
        state.ids.revenus = [normalized.result[0], ...state.ids.revenus];
      })
      .addCase(createRevenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const requestId = action.meta.requestId;
        const tempId = state.tempIds.revenus[requestId];
        if (tempId && state.ids.revenus.includes(tempId)) {
          state.ids.revenus = state.ids.revenus.filter((id) => id !== tempId);
          const newEntities = { ...state.entities.revenus };
          delete newEntities[tempId];
          state.entities.revenus = newEntities;
        }
        const newTempIds = { ...state.tempIds.revenus };
        delete newTempIds[requestId];
        state.tempIds.revenus = newTempIds;
      })
      .addCase(loadRevenus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRevenus.fulfilled, (state, action) => {
        state.loading = false;
        logger.debug(`Stockage de ${action.payload.length} revenus dans Redux`);
        const normalized = normalizeRevenus(action.payload);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
        state.ids.revenus = normalized.result;
        logger.debug(
          `State Redux mis à jour: ${state.ids.revenus.length} revenus`
        );
      })
      .addCase(loadRevenus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateRevenu.pending, (state, action) => {
        // OPTIMISTIC UPDATE (créer nouvelles copies)
        const revenuId = action.meta.arg.id;
        const existingRevenu = state.entities.revenus[revenuId];
        
        if (existingRevenu) {
          state.optimisticUpdates.revenus = {
            ...state.optimisticUpdates.revenus,
            [revenuId]: { ...existingRevenu },
          };
          state.entities.revenus = {
            ...state.entities.revenus,
            [revenuId]: {
              ...existingRevenu,
              ...action.meta.arg.updates,
            } as Revenu,
          };
        }
      })
      .addCase(updateRevenu.fulfilled, (state, action) => {
        const revenu = action.payload;
        const revenuId = revenu.id;
        
        // VALIDATION POST-MISE À JOUR : Valider les marges si présentes
        if (revenu.marge_opex !== undefined || revenu.marge_complete !== undefined) {
          const margeValidation = validateCalculMarges(revenu);
          if (!margeValidation.isValid) {
            logger.error('[updateRevenu.fulfilled] Erreurs de validation des marges après mise à jour:', margeValidation.errors);
          }
          if (margeValidation.warnings.length > 0) {
            logger.warn('[updateRevenu.fulfilled] Avertissements de validation des marges:', margeValidation.warnings);
          }
        }
        
        // Nettoyer le cache optimistic (créer nouvelle copie)
        const newOptimisticUpdates = { ...state.optimisticUpdates.revenus };
        delete newOptimisticUpdates[revenuId];
        state.optimisticUpdates.revenus = newOptimisticUpdates;
        
        const normalized = normalizeRevenu(revenu);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
      })
      .addCase(updateRevenu.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const revenuId = action.meta.arg.id;
        const previousRevenu = state.optimisticUpdates.revenus[revenuId];
        if (previousRevenu) {
          state.entities.revenus = {
            ...state.entities.revenus,
            [revenuId]: previousRevenu,
          };
          const newOptimisticUpdates = { ...state.optimisticUpdates.revenus };
          delete newOptimisticUpdates[revenuId];
          state.optimisticUpdates.revenus = newOptimisticUpdates;
        }
      })
      .addCase(deleteRevenu.pending, (state, action) => {
        // OPTIMISTIC UPDATE (créer nouvelles copies)
        const revenuId = action.meta.arg;
        const existingRevenu = state.entities.revenus[revenuId];
        
        if (existingRevenu) {
          state.optimisticUpdates.revenus = {
            ...state.optimisticUpdates.revenus,
            [revenuId]: { ...existingRevenu },
          };
          state.ids.revenus = state.ids.revenus.filter((id) => id !== revenuId);
          const newEntities = { ...state.entities.revenus };
          delete newEntities[revenuId];
          state.entities.revenus = newEntities;
        }
      })
      .addCase(deleteRevenu.fulfilled, (state, action) => {
        const revenuId = action.payload;
        // Nettoyer le cache optimistic (créer nouvelle copie)
        const newOptimisticUpdates = { ...state.optimisticUpdates.revenus };
        delete newOptimisticUpdates[revenuId];
        state.optimisticUpdates.revenus = newOptimisticUpdates;
      })
      .addCase(deleteRevenu.rejected, (state, action) => {
        state.error = action.payload as string;
        
        // OPTIMISTIC UPDATE ROLLBACK (créer nouvelles copies)
        const revenuId = action.meta.arg;
        const previousRevenu = state.optimisticUpdates.revenus[revenuId];
        if (previousRevenu) {
          state.entities.revenus = {
            ...state.entities.revenus,
            [revenuId]: previousRevenu,
          };
          if (!state.ids.revenus.includes(revenuId)) {
            state.ids.revenus = [...state.ids.revenus, revenuId];
          }
          const newOptimisticUpdates = { ...state.optimisticUpdates.revenus };
          delete newOptimisticUpdates[revenuId];
          state.optimisticUpdates.revenus = newOptimisticUpdates;
        }
      })
      // OPEX/CAPEX - Calcul des marges
      .addCase(calculateAndSaveMargesVente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateAndSaveMargesVente.fulfilled, (state, action) => {
        state.loading = false;
        const venteUpdated = action.payload;
        // Mettre à jour la vente avec les nouvelles marges
        const normalized = normalizeRevenu(venteUpdated);
        state.entities.revenus = {
          ...state.entities.revenus,
          ...normalized.entities.revenus,
        };
      })
      .addCase(calculateAndSaveMargesVente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(recalculerMargesPeriode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recalculerMargesPeriode.fulfilled, (state, action) => {
        state.loading = false;
        // Recharger tous les revenus avec les nouvelles marges
        const { revenus } = action.payload;
        const normalized = normalizeRevenus(revenus);
        state.entities.revenus = normalized.entities.revenus || {};
        state.ids.revenus = normalized.result;
      })
      .addCase(recalculerMargesPeriode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadStatistiquesMoisActuel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadStatistiquesMoisActuel.fulfilled, (state) => {
        state.loading = false;
        // Les stats sont retournées mais pas stockées dans le state
        // Elles seront utilisées directement par les composants
      })
      .addCase(loadStatistiquesMoisActuel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = financeSlice.actions;
export default financeSlice.reducer;
