/**
 * Slice Redux pour la gestion du module Production
 * Utilise normalizr pour stocker les données de manière normalisée
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../types/common';
import { normalize, denormalize } from 'normalizr';
import type {
  ProductionAnimal,
  CreateProductionAnimalInput,
  UpdateProductionAnimalInput,
  ProductionPesee,
  CreatePeseeInput,
} from '../../types/production';
import apiClient from '../../services/api/apiClient';
import { animauxSchema, peseesSchema, animalSchema, peseeSchema } from '../normalization/schemas';
import type { RootState } from '../store';
import { createLoggerWithPrefix } from '../../utils/logger';
import {
  getCachedAnimaux,
  setCachedAnimaux,
  getCachedPesees,
  setCachedPesees,
  invalidateAnimalCache,
  invalidateProjetCache,
} from '../../services/productionCache';
import type { NetworkError, ValidationError, DatabaseError } from '../../types/common';

const logger = createLoggerWithPrefix('ProductionSlice');

// Helper pour obtenir un message d'erreur contextuel pour le module Production
const getProductionErrorMessage = (error: unknown, defaultMessage: string): string => {
  // Erreurs réseau
  if (error && typeof error === 'object' && 'status' in error) {
    const networkError = error as NetworkError;
    if (networkError.status === 404) {
      return 'Ressource introuvable. Vérifiez que les données existent.';
    }
    if (networkError.status === 403) {
      return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
    }
    if (networkError.status === 400) {
      return 'Données invalides. Vérifiez les informations saisies.';
    }
    if (networkError.status === 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }
    if (networkError.status === 0 || networkError.status === undefined) {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
  }
  
  // Erreurs de validation
  if (error && typeof error === 'object' && 'field' in error) {
    const validationError = error as ValidationError;
    return `Erreur de validation${validationError.field ? ` pour le champ ${validationError.field}` : ''}: ${validationError.message || defaultMessage}`;
  }
  
  // Erreurs de base de données
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as DatabaseError;
    if (dbError.code === 'SQLITE_CONSTRAINT') {
      return 'Cette opération viole une contrainte de la base de données.';
    }
  }
  
  // Message par défaut avec fallback
  return getErrorMessage(error) || defaultMessage;
};

// Structure normalisée de l'état
interface NormalizedEntities {
  animaux: Record<string, ProductionAnimal>;
  pesees: Record<string, ProductionPesee>;
}

interface ProductionState {
  entities: NormalizedEntities;
  ids: {
    animaux: string[];
    pesees: string[];
  };
  peseesParAnimal: Record<string, string[]>; // IDs des pesées par animal
  peseesRecents: string[]; // IDs des pesées récentes
  loading: boolean;
  error: string | null;
  updateCounter: number; // Compteur pour invalider les caches
  // Optimistic updates
  optimisticUpdates: {
    animaux: Record<string, ProductionAnimal | null>; // null = suppression en cours
    pesees: Record<string, ProductionPesee | null>; // null = suppression en cours
  };
}

const initialState: ProductionState = {
  entities: {
    animaux: {},
    pesees: {},
  },
  ids: {
    animaux: [],
    pesees: [],
  },
  peseesParAnimal: {},
  peseesRecents: [],
  loading: false,
  error: null,
  updateCounter: 0,
  optimisticUpdates: {
    animaux: {},
    pesees: {},
  },
};

// Helper pour normaliser une liste d'animaux
const normalizeAnimaux = (animaux: ProductionAnimal[]) => {
  return normalize(animaux, animauxSchema);
};

// Helper pour normaliser une liste de pesées
const normalizePesees = (pesees: ProductionPesee[]) => {
  return normalize(pesees, peseesSchema);
};

// Helper pour normaliser un seul animal (optimisé)
// Normalise directement sans créer de tableau temporaire inutile
const normalizeAnimal = (animal: ProductionAnimal) => {
  // normalizr nécessite un tableau, mais on crée une structure optimisée
  return normalize([animal], animauxSchema);
};

// Helper pour normaliser une seule pesée (optimisé)
const normalizePesee = (pesee: ProductionPesee) => {
  return normalize([pesee], peseesSchema);
};

// Helper pour fusionner les entités en vérifiant si les nouvelles données sont plus récentes
// Utilise updated_at si disponible, sinon utilise l'ID pour déterminer si c'est une nouvelle entité
const mergeEntitiesWithCheck = <T extends { id: string; updated_at?: string }>(
  existing: Record<string, T>,
  newEntities: Record<string, T>
): Record<string, T> => {
  const merged = { ...existing };
  
  Object.keys(newEntities).forEach((id) => {
    const existingEntity = existing[id];
    const newEntity = newEntities[id];
    
    // Si l'entité n'existe pas, l'ajouter
    if (!existingEntity) {
      merged[id] = newEntity;
      return;
    }
    
    // Si les deux ont des timestamps, utiliser le plus récent
    if (existingEntity.updated_at && newEntity.updated_at) {
      const existingDate = new Date(existingEntity.updated_at);
      const newDate = new Date(newEntity.updated_at);
      if (newDate > existingDate) {
        merged[id] = newEntity;
      }
    } else {
      // Par défaut, toujours accepter les nouvelles données lors d'une mise à jour explicite
      merged[id] = newEntity;
    }
  });
  
  return merged;
};

export const loadProductionAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async (
    { projetId, inclureInactifs = true, useCache = true }: { projetId: string; inclureInactifs?: boolean; useCache?: boolean },
    { rejectWithValue }
  ) => {
    try {
      // Essayer de charger depuis le cache si activé
      if (useCache) {
        const cachedAnimaux = await getCachedAnimaux(projetId);
        if (cachedAnimaux && cachedAnimaux.length > 0) {
          logger.debug(`[loadProductionAnimaux] ${cachedAnimaux.length} animaux chargés depuis le cache`);
          // Retourner les données du cache mais aussi charger en arrière-plan pour les mettre à jour
          apiClient.get<ProductionAnimal[]>('/production/animaux', {
            params: { projet_id: projetId, inclure_inactifs: inclureInactifs },
          }).then((animaux) => {
            setCachedAnimaux(animaux, projetId);
          }).catch((error) => {
            logger.warn('[loadProductionAnimaux] Erreur lors de la mise à jour du cache:', error);
          });
          return cachedAnimaux;
        }
      }

      // Charger depuis l'API
      const animaux = await apiClient.get<ProductionAnimal[]>('/production/animaux', {
        params: { projet_id: projetId, inclure_inactifs: inclureInactifs },
      });

      // Mettre en cache
      if (useCache) {
        await setCachedAnimaux(animaux, projetId);
      }

      return animaux;
    } catch (error: unknown) {
      logger.error('[loadProductionAnimaux] Erreur:', error);
      
      // En cas d'erreur réseau, essayer de retourner le cache
      if (useCache) {
        const cachedAnimaux = await getCachedAnimaux(projetId);
        if (cachedAnimaux && cachedAnimaux.length > 0) {
          logger.info('[loadProductionAnimaux] Utilisation du cache en fallback après erreur réseau');
          return cachedAnimaux;
        }
      }

      return rejectWithValue(getProductionErrorMessage(error, 'Erreur lors du chargement des animaux'));
    }
  }
);

export const createProductionAnimal = createAsyncThunk(
  'production/createAnimal',
  async (input: CreateProductionAnimalInput, { rejectWithValue }) => {
    try {
      const animal = await apiClient.post<ProductionAnimal>('/production/animaux', input);
      return animal;
    } catch (error: unknown) {
      logger.error('[createProductionAnimal] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, "Erreur lors de la création de l'animal"));
    }
  }
);

export const updateProductionAnimal = createAsyncThunk(
  'production/updateAnimal',
  async (
    { id, updates }: { id: string; updates: UpdateProductionAnimalInput },
    { rejectWithValue }
  ) => {
    try {
      // Le backend gère automatiquement la conversion null/undefined
      const animal = await apiClient.patch<ProductionAnimal>(`/production/animaux/${id}`, updates);
      return animal;
    } catch (error: unknown) {
      logger.error('[updateProductionAnimal] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, "Erreur lors de la mise à jour de l'animal"));
    }
  }
);

export const deleteProductionAnimal = createAsyncThunk(
  'production/deleteAnimal',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/production/animaux/${id}`);
      return id;
    } catch (error: unknown) {
      logger.error('[deleteProductionAnimal] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, "Erreur lors de la suppression de l'animal"));
    }
  }
);

export const createPesee = createAsyncThunk(
  'production/createPesee',
  async (input: CreatePeseeInput, { rejectWithValue }) => {
    try {
      // Le backend calcule automatiquement le GMQ
      const pesee = await apiClient.post<ProductionPesee>('/production/pesees', input);
      return pesee;
    } catch (error: unknown) {
      logger.error('[createPesee] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, 'Erreur lors de la création de la pesée'));
    }
  }
);

export const updatePesee = createAsyncThunk(
  'production/updatePesee',
  async (
    { id, updates }: { id: string; updates: Partial<CreatePeseeInput> },
    { rejectWithValue }
  ) => {
    try {
      // Le backend recalcule automatiquement le GMQ si nécessaire
      const pesee = await apiClient.patch<ProductionPesee>(`/production/pesees/${id}`, updates);
      return pesee;
    } catch (error: unknown) {
      logger.error('[updatePesee] Erreur:', error);
      return rejectWithValue(
        getProductionErrorMessage(error, 'Erreur lors de la modification de la pesée')
      );
    }
  }
);

export const deletePesee = createAsyncThunk(
  'production/deletePesee',
  async ({ id, animalId }: { id: string; animalId: string }, { rejectWithValue }) => {
    try {
      const result = await apiClient.delete<{ id: string; animalId: string }>(
        `/production/pesees/${id}`
      );
      return result;
    } catch (error: unknown) {
      logger.error('[deletePesee] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, 'Erreur lors de la suppression de la pesée'));
    }
  }
);

export const loadPeseesParAnimal = createAsyncThunk(
  'production/loadPeseesParAnimal',
  async (input: string | { animalId: string; useCache?: boolean }, { rejectWithValue }) => {
    // Support pour les anciens appels (string) et nouveaux appels (objet)
    const animalId = typeof input === 'string' ? input : input.animalId;
    const useCache = typeof input === 'string' ? true : (input.useCache ?? true);
    try {
      // Essayer de charger depuis le cache si activé
      if (useCache) {
        const cachedPesees = await getCachedPesees(animalId);
        if (cachedPesees && cachedPesees.length > 0) {
          logger.debug(`[loadPeseesParAnimal] ${cachedPesees.length} pesées chargées depuis le cache`);
          // Retourner les données du cache mais aussi charger en arrière-plan pour les mettre à jour
          apiClient.get<ProductionPesee[]>('/production/pesees', {
            params: { animal_id: animalId },
          }).then((pesees) => {
            setCachedPesees(pesees, animalId);
          }).catch((error) => {
            logger.warn('[loadPeseesParAnimal] Erreur lors de la mise à jour du cache:', error);
          });
          return { animalId, pesees: cachedPesees };
        }
      }

      // Charger depuis l'API
      const pesees = await apiClient.get<ProductionPesee[]>('/production/pesees', {
        params: { animal_id: animalId },
      });

      // Mettre en cache
      if (useCache) {
        await setCachedPesees(pesees, animalId);
      }

      return { animalId, pesees };
    } catch (error: unknown) {
      logger.error('[loadPeseesParAnimal] Erreur:', error);
      
      // En cas d'erreur réseau, essayer de retourner le cache
      if (useCache) {
        const cachedPesees = await getCachedPesees(animalId);
        if (cachedPesees && cachedPesees.length > 0) {
          logger.info('[loadPeseesParAnimal] Utilisation du cache en fallback après erreur réseau');
          return { animalId, pesees: cachedPesees };
        }
      }

      return rejectWithValue(getProductionErrorMessage(error, 'Erreur lors du chargement des pesées'));
    }
  }
);

export const loadPeseesRecents = createAsyncThunk(
  'production/loadPeseesRecents',
  async ({ projetId, limit = 20 }: { projetId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const pesees = await apiClient.get<ProductionPesee[]>('/production/pesees', {
        params: { projet_id: projetId, limit },
      });
      return pesees;
    } catch (error: unknown) {
      logger.error('[loadPeseesRecents] Erreur:', error);
      return rejectWithValue(
        getProductionErrorMessage(error, 'Erreur lors du chargement des pesées récentes')
      );
    }
  }
);

// Thunks pour Statistiques et Calculs
export const calculateGMQ = createAsyncThunk(
  'production/calculateGMQ',
  async (animalId: string, { rejectWithValue }) => {
    try {
      const result = await apiClient.get<{ gmq: number | null }>(
        `/production/animaux/${animalId}/gmq`
      );
      return { animalId, gmq: result.gmq };
    } catch (error: unknown) {
      logger.error('[calculateGMQ] Erreur:', error);
      return rejectWithValue(getProductionErrorMessage(error, 'Erreur lors du calcul du GMQ'));
    }
  }
);

// Note: getEvolutionPoids, getPoidsActuelEstime et loadStatsProjet
// seront implémentés côté backend plus tard si nécessaire
// Pour l'instant, ces calculs peuvent être faits côté frontend avec les données disponibles

const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    clearProductionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductionAnimaux.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProductionAnimaux.fulfilled, (state, action) => {
        state.loading = false;
        const animaux = action.payload;
        
        // Protection contre les données undefined ou null
        if (!animaux || !Array.isArray(animaux)) {
          logger.warn('[loadProductionAnimaux.fulfilled] Données reçues invalides:', typeof animaux);
          return;
        }
        
        // Si tableau vide, mettre à jour les IDs mais ne pas normaliser
        if (animaux.length === 0) {
          state.ids.animaux = [];
          state.updateCounter = (state.updateCounter || 0) + 1;
          return;
        }
        
        try {
          const normalized = normalizeAnimaux(animaux);
          
          // Vérification supplémentaire des données normalisées
          if (!normalized.entities || !normalized.entities.animaux) {
            logger.warn('[loadProductionAnimaux.fulfilled] Normalisation a retourné des entités vides');
            return;
          }
          
          // Mettre à jour les entités avec vérification de version
          state.entities.animaux = mergeEntitiesWithCheck(
            state.entities.animaux,
            normalized.entities.animaux
          );
          
          // Remplacer tous les IDs (car on charge généralement les animaux du projet actif uniquement)
          // Les entités sont fusionnées donc les animaux d'autres projets restent dans entities
          state.ids.animaux = normalized.result || [];
          
          // Incrémenter le compteur pour forcer la synchronisation des widgets
          state.updateCounter = (state.updateCounter || 0) + 1;
        } catch (normalizeError) {
          logger.error('[loadProductionAnimaux.fulfilled] Erreur lors de la normalisation:', normalizeError);
        }
      })
      .addCase(loadProductionAnimaux.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createProductionAnimal.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Optimistic update: créer un animal temporaire avec un ID généré
        // On va le remplacer avec le vrai ID quand la réponse arrive
        const tempId = `temp-${Date.now()}`;
        const tempAnimal: Partial<ProductionAnimal> = {
          ...action.meta.arg,
          id: tempId,
        } as ProductionAnimal;
        const normalized = normalizeAnimal(tempAnimal as ProductionAnimal);
        state.entities.animaux = { ...state.entities.animaux, ...normalized.entities.animaux };
        state.ids.animaux = [tempId, ...state.ids.animaux];
        state.optimisticUpdates.animaux[tempId] = tempAnimal as ProductionAnimal;
      })
      .addCase(createProductionAnimal.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeAnimal(action.payload);
        const animalId = action.payload.id;
        
        // Trouver et supprimer l'animal temporaire s'il existe
        const tempAnimalId = Object.keys(state.optimisticUpdates.animaux).find(
          (id) => id.startsWith('temp-')
        );
        if (tempAnimalId) {
          state.ids.animaux = state.ids.animaux.filter((id) => id !== tempAnimalId);
          delete state.entities.animaux[tempAnimalId];
          delete state.optimisticUpdates.animaux[tempAnimalId];
        }
        
        // Ajouter l'animal réel
        state.entities.animaux = mergeEntitiesWithCheck(
          state.entities.animaux,
          normalized.entities.animaux
        );
        if (!state.ids.animaux.includes(animalId)) {
          state.ids.animaux = [animalId, ...state.ids.animaux];
        }
        // Incrémenter le compteur pour forcer la synchronisation des widgets
        state.updateCounter = (state.updateCounter || 0) + 1;
      })
      .addCase(createProductionAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Rollback: supprimer l'animal temporaire
        const tempAnimalId = Object.keys(state.optimisticUpdates.animaux).find(
          (id) => id.startsWith('temp-')
        );
        if (tempAnimalId) {
          state.ids.animaux = state.ids.animaux.filter((id) => id !== tempAnimalId);
          delete state.entities.animaux[tempAnimalId];
          delete state.optimisticUpdates.animaux[tempAnimalId];
        }
      })
      .addCase(updateProductionAnimal.pending, (state, action) => {
        // Optimistic update: mettre à jour immédiatement avec les nouvelles valeurs
        const animalId = action.meta.arg.id;
        const updates = action.meta.arg.updates;
        const existingAnimal = state.entities.animaux[animalId];
        
        if (existingAnimal) {
          // Sauvegarder l'état précédent pour rollback
          state.optimisticUpdates.animaux[animalId] = { ...existingAnimal };
          // Appliquer les mises à jour optimistes
          state.entities.animaux[animalId] = {
            ...existingAnimal,
            ...updates,
            updated_at: new Date().toISOString(),
          } as ProductionAnimal;
        }
      })
      .addCase(updateProductionAnimal.fulfilled, (state, action) => {
        logger.debug(
          '[updateProductionAnimal.fulfilled] Animal mis à jour:',
          action.payload.id,
          action.payload.code
        );
        logger.debug('[updateProductionAnimal.fulfilled] Photo URI:', action.payload.photo_uri);

        const normalized = normalizeAnimal(action.payload);
        const animalId = action.payload.id;

        // Mise à jour ciblée avec les vraies données du serveur
        if (normalized.entities.animaux) {
          state.entities.animaux[animalId] = normalized.entities.animaux[animalId];
        }
        
        // Supprimer la sauvegarde optimistic
        delete state.optimisticUpdates.animaux[animalId];

        // Incrémenter un compteur de version pour invalider les caches si nécessaire
        state.updateCounter = (state.updateCounter || 0) + 1;

        logger.debug(
          '[updateProductionAnimal.fulfilled] Animal actualisé (version:',
          state.updateCounter,
          ')'
        );
      })
      .addCase(updateProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
        // Rollback: restaurer l'état précédent
        const animalId = action.meta.arg.id;
        const previousAnimal = state.optimisticUpdates.animaux[animalId];
        if (previousAnimal) {
          state.entities.animaux[animalId] = previousAnimal;
          delete state.optimisticUpdates.animaux[animalId];
        }
      })
      .addCase(deleteProductionAnimal.pending, (state, action) => {
        // Optimistic update: supprimer immédiatement visuellement
        const animalId = action.meta.arg;
        const existingAnimal = state.entities.animaux[animalId];
        
        if (existingAnimal) {
          // Sauvegarder pour rollback
          state.optimisticUpdates.animaux[animalId] = existingAnimal;
          // Marquer comme supprimé (on le supprime vraiment dans fulfilled)
        }
      })
      .addCase(deleteProductionAnimal.fulfilled, (state, action) => {
        const animalId = action.payload;
        
        // Récupérer les IDs de pesées AVANT de supprimer
        const peseeIdsToRemove = state.peseesParAnimal[animalId] || [];
        
        // Supprimer les pesées orphelines
        peseeIdsToRemove.forEach((peseeId) => {
          delete state.entities.pesees[peseeId];
          state.ids.pesees = state.ids.pesees.filter((id) => id !== peseeId);
        });
        
        // Supprimer l'animal et ses références
        state.ids.animaux = state.ids.animaux.filter((id) => id !== animalId);
        delete state.entities.animaux[animalId];
        delete state.peseesParAnimal[animalId];
        delete state.optimisticUpdates.animaux[animalId];
        
        // Incrémenter le compteur pour forcer la synchronisation des widgets
        state.updateCounter = (state.updateCounter || 0) + 1;
        
        // Invalider le cache de l'animal supprimé
        invalidateAnimalCache(animalId).catch((error) => {
          logger.warn('[deleteProductionAnimal] Erreur lors de l\'invalidation du cache:', error);
        });
      })
      .addCase(deleteProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
        // Rollback: restaurer l'animal
        const animalId = action.meta.arg;
        const previousAnimal = state.optimisticUpdates.animaux[animalId];
        if (previousAnimal) {
          state.entities.animaux[animalId] = previousAnimal;
          if (!state.ids.animaux.includes(animalId)) {
            state.ids.animaux.push(animalId);
          }
          delete state.optimisticUpdates.animaux[animalId];
        }
      })
      .addCase(createPesee.fulfilled, (state, action) => {
        const pesee = action.payload;
        const normalized = normalizePesee(pesee);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        const peseeId = normalized.result[0];
        state.ids.pesees = [peseeId, ...state.ids.pesees];

        // Ajouter la pesée à l'animal
        if (!state.peseesParAnimal[pesee.animal_id]) {
          state.peseesParAnimal[pesee.animal_id] = [];
        }
        state.peseesParAnimal[pesee.animal_id] = [
          peseeId,
          ...state.peseesParAnimal[pesee.animal_id],
        ];

        // Ajouter aux pesées récentes
        state.peseesRecents = [peseeId, ...state.peseesRecents].slice(0, 20);
      })
      .addCase(createPesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updatePesee.fulfilled, (state, action) => {
        const pesee = action.payload;
        const normalized = normalizePesee(pesee);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };

        // Note : La pesée reste dans les mêmes listes, on met juste à jour ses données
      })
      .addCase(updatePesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deletePesee.fulfilled, (state, action) => {
        const { id, animalId } = action.payload;

        // Supprimer de l'entité globale
        delete state.entities.pesees[id];

        // Supprimer de la liste globale
        state.ids.pesees = state.ids.pesees.filter((peseeId) => peseeId !== id);

        // Supprimer de la liste de l'animal
        if (state.peseesParAnimal[animalId]) {
          state.peseesParAnimal[animalId] = state.peseesParAnimal[animalId].filter(
            (peseeId) => peseeId !== id
          );
        }

        // Supprimer des pesées récentes
        state.peseesRecents = state.peseesRecents.filter((peseeId) => peseeId !== id);
      })
      .addCase(deletePesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(loadPeseesParAnimal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesParAnimal.fulfilled, (state, action) => {
        state.loading = false;
        const { animalId, pesees } = action.payload;
        const normalized = normalizePesees(pesees);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        state.peseesParAnimal[animalId] = normalized.result;
        // Ajouter les IDs de pesées à la liste globale si pas déjà présents
        normalized.result.forEach((peseeId: string) => {
          if (!state.ids.pesees.includes(peseeId)) {
            state.ids.pesees.push(peseeId);
          }
        });
      })
      .addCase(loadPeseesParAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadPeseesRecents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesRecents.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizePesees(action.payload);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        state.peseesRecents = normalized.result;
        // Ajouter les IDs de pesées à la liste globale si pas déjà présents
        normalized.result.forEach((peseeId: string) => {
          if (!state.ids.pesees.includes(peseeId)) {
            state.ids.pesees.push(peseeId);
          }
        });
        // Mettre à jour peseesParAnimal pour chaque pesée chargée
        action.payload.forEach((pesee: ProductionPesee) => {
          if (pesee.animal_id) {
            if (!state.peseesParAnimal[pesee.animal_id]) {
              state.peseesParAnimal[pesee.animal_id] = [];
            }
            // Ajouter l'ID de la pesée si pas déjà présent
            if (!state.peseesParAnimal[pesee.animal_id].includes(pesee.id)) {
              state.peseesParAnimal[pesee.animal_id].push(pesee.id);
            }
          }
        });
      })
      .addCase(loadPeseesRecents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProductionError } = productionSlice.actions;
export default productionSlice.reducer;
