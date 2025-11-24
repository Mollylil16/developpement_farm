/**
 * Redux Slice - Planning Production
 * Gestion de l'etat pour la simulation et planification de production
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ObjectifProduction,
  ParametresProduction,
  SimulationProductionResultat,
  RecommandationStrategique,
  SailliePlanifiee,
  PrevisionVenteAnimal,
  SynthesePrevisionVentes,
  PlanningProductionState,
  PARAMETRES_PRODUCTION_DEFAUT,
} from '../../types/planningProduction';
import {
  simulerProduction as calculerSimulation,
  genererRecommandationsStrategiques as calculerRecommandations,
  calculerPrevisionVentes,
  calculerPrevisionsFutures,
} from '../../utils/planningProductionCalculs';
import { RootState } from '../store';
import { addDays, differenceInDays, format } from 'date-fns';

// Etat initial
const initialState: PlanningProductionState = {
  objectifProduction: null,
  parametresProduction: PARAMETRES_PRODUCTION_DEFAUT,
  simulationResultat: null,
  sailliesPlanifiees: [],
  previsionsVentes: [],
  recommendations: [],
  alertes: [],
  loading: false,
  error: null,
};

// ============================================
// ACTIONS ASYNC
// ============================================

/**
 * Simuler la production
 */
export const simulerProduction = createAsyncThunk(
  'planningProduction/simuler',
  async (
    payload: {
      objectif: ObjectifProduction;
      parametres: ParametresProduction;
      cheptelActuel: {
        truies: number;
        truiesEnGestation?: number;
        truiesEnLactation?: number;
        verrats?: number;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const { objectif, parametres, cheptelActuel } = payload;

      const inputSimulation = {
        objectif_tonnes: objectif.objectif_tonnes,
        periode_mois: objectif.periode_mois,
        poids_moyen_vente: parametres.poids_moyen_vente_kg,
        porcelets_par_portee_moyen: parametres.porcelets_par_portee_moyen,
      };

      const simulation = calculerSimulation(
        inputSimulation,
        cheptelActuel.truies,
        cheptelActuel.truiesEnGestation || 0,
        cheptelActuel.truiesEnLactation || 0,
        cheptelActuel.verrats || 0
      );

      const recommendations = calculerRecommandations(simulation, cheptelActuel.truies);

      const result = {
        objectif,
        parametres,
        simulation,
        recommendations,
      };

      return result;
    } catch (error: any) {
      console.error('❌ [REDUX] simulerProduction - Erreur:', error);
      return rejectWithValue(error.message || 'Erreur lors de la simulation');
    }
  }
);

/**
 * Generer le plan de saillies intelligent
 * Prend en compte les truies disponibles et les cycles biologiques
 */
export const genererPlanSaillies = createAsyncThunk(
  'planningProduction/genererSaillies',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { simulationResultat, objectifProduction, parametresProduction } =
        state.planningProduction;

      if (!simulationResultat || !objectifProduction) {
        throw new Error("Veuillez d'abord lancer une simulation");
      }

      // Récupérer le projet actif
      const projetActif = state.projet?.projetActif;
      if (!projetActif) {
        throw new Error('Aucun projet actif sélectionné');
      }

      // Récupérer les truies disponibles du cheptel (filtrées par projet)
      const animaux = state.production?.entities?.animaux || {};

      // Récupérer les gestations en cours pour exclure les truies déjà en gestation
      const gestations = state.reproduction?.entities?.gestations || {};
      const gestationsEnCours = Object.values(gestations).filter(
        (g: any) => g && g.statut === 'en_cours' && g.projet_id === projetActif.id
      );
      const truiesEnGestationIds = new Set(
        gestationsEnCours.map((g: any) => g.truie_id).filter(Boolean)
      );

      // Helper pour vérifier si un animal est reproducteur (gère les booléens et les entiers SQLite)
      const isReproducteur = (reproducteur: any): boolean => {
        return reproducteur === true || reproducteur === 1 || reproducteur === '1';
      };

      // Log pour déboguer
      const tousAnimaux = Object.values(animaux);
      console.log('🔍 [genererPlanSaillies] Total animaux dans state:', tousAnimaux.length);
      console.log('🔍 [genererPlanSaillies] Projet actif:', projetActif.id);
      
      const animauxProjet = tousAnimaux.filter((a: any) => a?.projet_id === projetActif.id);
      console.log('🔍 [genererPlanSaillies] Animaux du projet:', animauxProjet.length);
      
      const truiesProjet = animauxProjet.filter((a: any) => a?.sexe === 'femelle');
      console.log('🔍 [genererPlanSaillies] Truies du projet:', truiesProjet.length);
      if (truiesProjet.length > 0) {
        console.log('🔍 [genererPlanSaillies] Détails truies:', truiesProjet.map((a: any) => ({
          id: a.id,
          code: a.code,
          sexe: a.sexe,
          reproducteur: a.reproducteur,
          type_reproducteur: typeof a.reproducteur,
          statut: a.statut,
          projet_id: a.projet_id,
          isReproducteur: isReproducteur(a.reproducteur)
        })));
      }

      const truiesDisponibles = Object.values(animaux).filter((animal: any) => {
        if (!animal) return false;
        const isFemelle = animal.sexe === 'femelle';
        const isReproductrice = isReproducteur(animal.reproducteur);
        const isActive = animal.statut === 'actif';
        const isDuProjet = animal.projet_id === projetActif.id;
        const estEnGestation = truiesEnGestationIds.has(animal.id);

        // Exclure les truies déjà en gestation
        return isFemelle && isReproductrice && isActive && isDuProjet && !estEnGestation;
      });
      
      console.log('🔍 [genererPlanSaillies] Truies disponibles après filtrage:', truiesDisponibles.length);

      const nombreTruies = truiesDisponibles.length;
      const nombrePorteesNecessaires = simulationResultat.nombre_portees_necessaires;

      if (nombreTruies === 0) {
        throw new Error('Aucune truie reproductrice disponible dans le cheptel');
      }

      // 🎯 LOGIQUE RÉTROGRADE CORRECTE

      // Calcul du cycle de reproduction (gestation + lactation + repos)
      const JOURS_REPOS = 7;
      const cycleReproductionJours =
        parametresProduction.duree_gestation_jours +
        parametresProduction.duree_lactation_jours +
        JOURS_REPOS;

      // Durée d'engraissement (sevrage → poids de vente)
      const POIDS_AU_SEVRAGE_KG = 8;
      const poidsCible = parametresProduction.poids_moyen_vente_kg;
      const poids_a_gagner_kg = poidsCible - POIDS_AU_SEVRAGE_KG;
      const GMQ_REALISTE = parametresProduction.gmq_moyen_g_jour * 0.85; // Coefficient pessimiste
      const dureeEngraissementJours = Math.ceil((poids_a_gagner_kg * 1000) / GMQ_REALISTE);

      // Cycle COMPLET (saillie → vente)
      const cycleTotalJours =
        parametresProduction.duree_gestation_jours +
        parametresProduction.duree_lactation_jours +
        dureeEngraissementJours;

      // Période disponible
      const periodeJours = objectifProduction.periode_mois * 30;
      const dateDebut = new Date(objectifProduction.date_debut);
      const dateLimite = addDays(dateDebut, periodeJours);

      // ⚠️ CONTRAINTE : Le DERNIER porc doit être vendable À LA DATE LIMITE
      // Donc la DERNIÈRE saillie doit avoir lieu à : dateLimite - cycleTotalJours
      const dateDerniereSaillie = addDays(dateLimite, -cycleTotalJours);

      // Fenêtre de temps pour toutes les saillies
      const fenetreSailliesJours = differenceInDays(dateDerniereSaillie, dateDebut);

      if (fenetreSailliesJours < 0) {
        throw new Error(
          `Période trop courte ! Il faut au moins ${Math.ceil(cycleTotalJours / 30)} mois pour produire.`
        );
      }

      // 🔄 STRATÉGIE OPTIMALE : Utiliser toutes les truies en parallèle
      // Au lieu d'étaler les saillies, on les groupe par vague

      // Combien de cycles chaque truie peut faire ?
      const cyclesMaxParTruie = Math.floor(fenetreSailliesJours / cycleReproductionJours) + 1;

      // Combien de vagues de saillies peut-on faire ?
      const nombreVagues = Math.ceil(nombrePorteesNecessaires / nombreTruies);

      // Intervalle entre les vagues
      const intervalleVaguesJours = cycleReproductionJours; // Une vague par cycle de reproduction

      // Récupérer les verrats disponibles
      const verratsDisponibles = Object.values(animaux).filter((animal: any) => {
        if (!animal) return false;
        const isMale = animal.sexe === 'male';
        const estReproducteur = isReproducteur(animal.reproducteur);
        const isActive = animal.statut === 'actif';
        const isDuProjet = animal.projet_id === projetActif.id;
        return isMale && estReproducteur && isActive && isDuProjet;
      });

      const nombreVerrats = verratsDisponibles.length;

      // 🎯 GÉNÉRATION OPTIMALE DES SAILLIES
      // Respect des contraintes biologiques:
      // - 1 verrat ne peut saillir qu'1 truie tous les 2 jours (truie reste 2j dans la loge)
      // - Avec plusieurs verrats: on peut les utiliser en parallèle

      const DUREE_SAILLIE_JOURS = 2; // La truie reste 2 jours avec le verrat
      const saillies: SailliePlanifiee[] = [];
      let saillieIndex = 0;

      // Suivi de la disponibilité des verrats (dernière date d'utilisation)
      const derniereSaillieVerrat: { [verratId: string]: Date } = {};
      verratsDisponibles.forEach((v) => {
        derniereSaillieVerrat[v.id] = new Date(
          dateDebut.getTime() - DUREE_SAILLIE_JOURS * 24 * 60 * 60 * 1000
        ); // Disponibles au début
      });

      // Pour chaque vague de saillies (cycle de reproduction)
      for (
        let vague = 0;
        vague < nombreVagues && saillieIndex < nombrePorteesNecessaires;
        vague++
      ) {
        // Date de début de cette vague
        const dateDebutVague = addDays(dateDebut, vague * intervalleVaguesJours);

        // Trouver les truies disponibles pour cette vague
        const truiesDisponiblesVague = truiesDisponibles.filter((truie) => {
          const derniereSaillieTruie = saillies
            .filter((s) => s.truie_id === truie.id)
            .sort(
              (a, b) =>
                new Date(b.date_saillie_prevue).getTime() -
                new Date(a.date_saillie_prevue).getTime()
            )[0];

          if (!derniereSaillieTruie) return true; // Jamais saillie

          const joursDerniereSaillie = differenceInDays(
            dateDebutVague,
            new Date(derniereSaillieTruie.date_saillie_prevue)
          );
          return joursDerniereSaillie >= cycleReproductionJours; // Disponible si cycle terminé
        });

        // Planifier les saillies de cette vague
        let jourActuel = 0; // Jours depuis le début de la vague

        for (
          let truieIdx = 0;
          truieIdx < truiesDisponiblesVague.length && saillieIndex < nombrePorteesNecessaires;
          truieIdx++
        ) {
          const truie = truiesDisponiblesVague[truieIdx];

          // Trouver le verrat disponible le plus tôt
          let verratChoisi: any = null;
          let dateDisponibleVerrat = new Date(9999, 0, 1); // Date lointaine

          for (const verrat of verratsDisponibles) {
            const derniereUtilisation = derniereSaillieVerrat[verrat.id];
            const prochaineDispo = addDays(derniereUtilisation, DUREE_SAILLIE_JOURS);
            const dateProposee = new Date(
              Math.max(
                prochaineDispo.getTime(),
                dateDebutVague.getTime() + jourActuel * 24 * 60 * 60 * 1000
              )
            );

            if (dateProposee < dateDisponibleVerrat) {
              dateDisponibleVerrat = dateProposee;
              verratChoisi = verrat;
            }
          }

          if (!verratChoisi) {
            console.warn('⚠️ Aucun verrat disponible');
            continue;
          }

          // Date de saillie = quand le verrat est disponible
          const dateSaillie = dateDisponibleVerrat;

          // Vérifier que le porc sera vendable avant la deadline
          const dateMiseBas = addDays(dateSaillie, parametresProduction.duree_gestation_jours);
          const dateSevrage = addDays(dateMiseBas, parametresProduction.duree_lactation_jours);
          const dateVente = addDays(dateSevrage, dureeEngraissementJours);

          if (dateVente > dateLimite) {
            console.warn(
              `⚠️ Saillie ignorée: vente ${format(dateVente, 'dd/MM/yyyy')} > deadline ${format(dateLimite, 'dd/MM/yyyy')}`
            );
            break; // Arrêter cette vague, trop tard
          }

          // Enregistrer la saillie
          const verratInfo = verratChoisi.code || verratChoisi.nom || verratChoisi.id;

          saillies.push({
            id: `saillie_${Date.now()}_${saillieIndex}_${Date.now() % 1000}`,
            projet_id: truie.projet_id || '',
            date_saillie_prevue: dateSaillie.toISOString(),
            date_mise_bas_prevue: dateMiseBas.toISOString(),
            date_sevrage_prevue: dateSevrage.toISOString(),
            truie_id: truie.id,
            verrat_id: verratChoisi.id,
            statut: 'planifiee',
            notes: `Vague ${vague + 1} - Saillie ${saillieIndex + 1}/${nombrePorteesNecessaires} - Truie ${truie.code || truie.nom || truie.id} - Verrat ${verratInfo} - Vente: ${format(dateVente, 'dd/MM/yyyy')}`,
            date_creation: new Date().toISOString(),
            derniere_modification: new Date().toISOString(),
          });

          // Mettre à jour la disponibilité du verrat
          derniereSaillieVerrat[verratChoisi.id] = dateSaillie;

          saillieIndex++;
          jourActuel++; // Incrémenter pour espacer dans la vague si nécessaire
        }
      }

      // Si on n'a pas assez de saillies (truies insuffisantes), ajouter un avertissement dans les notes
      if (saillies.length < nombrePorteesNecessaires) {
        console.warn(
          `Attention: Seulement ${saillies.length} saillies planifiées sur ${nombrePorteesNecessaires} nécessaires. ` +
            `Vous avez ${nombreTruies} truie(s) mais il en faudrait environ ${Math.ceil(nombrePorteesNecessaires / parametresProduction.cycles_par_an)}.`
        );
      }

      return saillies;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la generation du plan');
    }
  }
);

/**
 * Generer les previsions de ventes
 */
export const genererPrevisionsVentes = createAsyncThunk(
  'planningProduction/genererPrevisions',
  async (
    params: { poids_cible_kg?: number; gmq_moyen?: number } | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { parametresProduction } = state.planningProduction;

      // Utiliser les paramètres fournis ou ceux par défaut
      const poidsCible = params?.poids_cible_kg ?? parametresProduction.poids_moyen_vente_kg;
      const gmqMoyen = params?.gmq_moyen ?? parametresProduction.gmq_moyen_g_jour;

      // Recuperer les animaux depuis l'etat Redux (entities normalisées)
      const animauxEntities = state.production?.entities?.animaux || {};
      const animaux = Object.values(animauxEntities).filter((a): a is any => a !== undefined);

      // Filtrer uniquement les animaux à vendre (non reproducteurs)
      const animauxAVendre = animaux.filter((animal) => {
        // Exclure les reproducteurs (verrats et truies)
        if (animal.reproducteur === true) {
          return false;
        }
        // Inclure uniquement les animaux actifs
        return animal.statut === 'actif';
      });

      // Recuperer les pesees par animal depuis l'etat Redux
      const peseesParAnimalIds = state.production?.peseesParAnimal || {};
      const peseesEntities = state.production?.entities?.pesees || {};

      const peseesParAnimal: { [key: string]: any[] } = {};
      Object.keys(peseesParAnimalIds).forEach((animalId) => {
        const peseeIds = peseesParAnimalIds[animalId] || [];
        peseesParAnimal[animalId] = peseeIds
          .map((id) => peseesEntities[id])
          .filter((p) => p !== undefined);
      });

      const synthese = calculerPrevisionVentes(animauxAVendre, peseesParAnimal, {
        poids_cible_kg: poidsCible,
        gmq_moyen: gmqMoyen,
        marge_jours: 7,
      });

      return synthese;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la generation des previsions');
    }
  }
);

/**
 * Generer les previsions de ventes Mode 2 (Projection future)
 */
export const genererPrevisionsFuturesVentes = createAsyncThunk(
  'planningProduction/genererPrevisionsFutures',
  async (params: { poids_cible_kg?: number } | undefined, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { parametresProduction, sailliesPlanifiees } = state.planningProduction;

      if (!sailliesPlanifiees || sailliesPlanifiees.length === 0) {
        return rejectWithValue(
          'Aucune saillie planifiée. Veuillez d\'abord générer un plan de saillies dans l\'onglet "Saillies".'
        );
      }

      // Utiliser les paramètres fournis ou ceux par défaut
      const poidsCible = params?.poids_cible_kg ?? parametresProduction.poids_moyen_vente_kg;

      const synthese = calculerPrevisionsFutures(sailliesPlanifiees, {
        porcelets_par_portee: parametresProduction.porcelets_par_portee_moyen,
        taux_survie_sevrage: parametresProduction.taux_survie_sevrage * 100,
        duree_engraissement_jours: 180, // 6 mois d'engraissement
        poids_cible_kg: poidsCible,
        prix_vente_kg: 1500, // Prix par défaut (CONSTANTES_PRODUCTION.PRIX_VENTE_KG_MOYEN)
      });

      return synthese;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Erreur lors de la generation des previsions futures'
      );
    }
  }
);

/**
 * Actualiser toutes les donnees
 */
export const actualiserDonnees = createAsyncThunk(
  'planningProduction/actualiser',
  async (_, { dispatch }) => {
    // Recharger la simulation si un objectif existe
    // Recharger les saillies
    // Recharger les previsions
    return true;
  }
);

/**
 * Valider le planning de saillies et créer les tâches dans le planning
 */
export const validerPlanningSaillies = createAsyncThunk(
  'planningProduction/validerPlanning',
  async (
    payload: {
      projetId: string;
      saillies: SailliePlanifiee[];
      animaux?: any[]; // Pour récupérer les noms des truies/verrats
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { genererTachesDepuisSaillie } = await import('../../utils/planningProductionCalculs');
      const { createPlanificationsBatch } = await import('./planificationSlice');

      const toutesLesTaches: any[] = [];
      const sailliesValidees: SailliePlanifiee[] = [];

      for (const saillie of payload.saillies) {
        // Trouver les infos de la truie et du verrat
        const truie = payload.animaux?.find((a) => a.id === saillie.truie_id);
        const verrat = payload.animaux?.find((a) => a.id === saillie.verrat_id);

        // Générer les tâches pour cette saillie
        const taches = genererTachesDepuisSaillie(
          saillie,
          truie?.nom || truie?.code,
          verrat?.nom || verrat?.code
        );

        // Convertir en CreatePlanificationInput
        const tachesACreer = taches.map((tache) => ({
          projet_id: payload.projetId,
          type: tache.type as any,
          titre: tache.titre,
          description: tache.description,
          date_prevue: tache.date_prevue,
          date_echeance: tache.date_echeance,
          rappel: tache.rappel,
          notes: tache.notes,
        }));

        toutesLesTaches.push(...tachesACreer);

        // Marquer la saillie comme validée
        sailliesValidees.push({
          ...saillie,
          validee: true,
        });
      }

      // Créer toutes les tâches en batch
      const resultBatch = await dispatch(createPlanificationsBatch(toutesLesTaches));

      if (createPlanificationsBatch.fulfilled.match(resultBatch)) {
        const tachesCrees = resultBatch.payload;

        // Mettre à jour les IDs des tâches créées dans les saillies
        for (let i = 0; i < sailliesValidees.length; i++) {
          const nbTachesParSaillie = 10; // Nombre de tâches par saillie
          const tachesIds = tachesCrees
            .slice(i * nbTachesParSaillie, (i + 1) * nbTachesParSaillie)
            .map((t) => t.id);

          sailliesValidees[i].taches_creees = tachesIds;
        }

        return {
          sailliesValidees,
          nombreTachesCreees: tachesCrees.length,
        };
      } else {
        throw new Error('Échec de la création des tâches');
      }
    } catch (error: any) {
      console.error('❌ [VALIDATION] Erreur:', error);
      return rejectWithValue(error.message || 'Erreur lors de la validation du planning');
    }
  }
);

// ============================================
// SLICE
// ============================================

const planningProductionSlice = createSlice({
  name: 'planningProduction',
  initialState,
  reducers: {
    // Definir l'objectif de production
    setObjectifProduction: (state, action: PayloadAction<ObjectifProduction>) => {
      state.objectifProduction = action.payload;
    },

    // Definir les parametres de production
    setParametresProduction: (state, action: PayloadAction<ParametresProduction>) => {
      state.parametresProduction = action.payload;
    },

    // Effacer la simulation
    clearSimulation: (state) => {
      state.simulationResultat = null;
      state.recommendations = [];
      state.sailliesPlanifiees = [];
      state.previsionsVentes = [];
      state.alertes = [];
    },

    // Supprimer une saillie planifiee
    supprimerSailliePlanifiee: (state, action: PayloadAction<string>) => {
      state.sailliesPlanifiees = state.sailliesPlanifiees.filter((s) => s.id !== action.payload);
    },

    // Supprimer une prevision de vente
    supprimerPrevisionVente: (state, action: PayloadAction<string>) => {
      // Les previsions ventes sont dans la synthese, on ne peut pas les supprimer individuellement
      // TODO: Refactorer si necessaire
    },

    // Marquer une saillie comme validée
    marquerSaillieValidee: (
      state,
      action: PayloadAction<{ saillieId: string; tachesIds: string[] }>
    ) => {
      const saillie = state.sailliesPlanifiees.find((s) => s.id === action.payload.saillieId);
      if (saillie) {
        saillie.validee = true;
        saillie.taches_creees = action.payload.tachesIds;
      }
    },
  },

  extraReducers: (builder) => {
    // Simuler production
    builder
      .addCase(simulerProduction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(simulerProduction.fulfilled, (state, action) => {
        state.loading = false;
        state.objectifProduction = action.payload.objectif;
        state.parametresProduction = action.payload.parametres;
        state.simulationResultat = action.payload.simulation;
        state.recommendations = action.payload.recommendations;
      })
      .addCase(simulerProduction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Generer plan saillies
    builder
      .addCase(genererPlanSaillies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(genererPlanSaillies.fulfilled, (state, action) => {
        state.loading = false;
        state.sailliesPlanifiees = action.payload;
      })
      .addCase(genererPlanSaillies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Generer previsions ventes (Mode 1)
    builder
      .addCase(genererPrevisionsVentes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(genererPrevisionsVentes.fulfilled, (state, action) => {
        state.loading = false;
        state.previsionsVentes = action.payload.calendrier_mensuel.flatMap((c) => c.animaux);
      })
      .addCase(genererPrevisionsVentes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Generer previsions ventes futures (Mode 2)
    builder
      .addCase(genererPrevisionsFuturesVentes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(genererPrevisionsFuturesVentes.fulfilled, (state, action) => {
        state.loading = false;
        state.previsionsVentes = action.payload.calendrier_mensuel.flatMap((c) => c.animaux);
      })
      .addCase(genererPrevisionsFuturesVentes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Valider planning saillies
    builder
      .addCase(validerPlanningSaillies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validerPlanningSaillies.fulfilled, (state, action) => {
        state.loading = false;
        // Mettre à jour les saillies validées
        state.sailliesPlanifiees = action.payload.sailliesValidees;
      })
      .addCase(validerPlanningSaillies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export des actions
export const {
  setObjectifProduction,
  setParametresProduction,
  clearSimulation,
  supprimerSailliePlanifiee,
  supprimerPrevisionVente,
  marquerSaillieValidee,
} = planningProductionSlice.actions;

// Export du reducer
export default planningProductionSlice.reducer;
