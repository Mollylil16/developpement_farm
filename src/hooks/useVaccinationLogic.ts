/**
 * useVaccinationLogic - Logique métier pour l'écran Vaccination
 *
 * Responsabilités:
 * - Gestion de l'état des modales
 * - Chargement des données
 * - Calcul des statistiques globales
 * - Calcul des statistiques par type
 * - Rafraîchissement
 */

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllVaccinations, selectSanteStatistics } from '../store/selectors/santeSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadVaccinations } from '../store/slices/santeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import {
  TypeProphylaxie,
  StatistiquesProphylaxieParType,
  calculerAgeJours,
  CALENDRIER_VACCINAL_TYPE,
  TYPE_PROPHYLAXIE_LABELS,
} from '../types/sante';

export interface StatsGlobales {
  totalAnimaux: number;
  totalVaccinations: number;
  porcsEnRetard: number;
  tauxCouverture: number;
}

export interface VaccinationLogicReturn {
  // État
  refreshing: boolean;
  modalAddVisible: boolean;
  modalCalendrierVisible: boolean;
  typeSelectionne: TypeProphylaxie | null;
  loading: boolean;

  // Données
  projetActif: unknown;
  vaccinations: unknown[];
  animaux: unknown[];
  statsGlobales: StatsGlobales;
  statParType: StatistiquesProphylaxieParType[];

  // Actions
  setModalAddVisible: (visible: boolean) => void;
  setModalCalendrierVisible: (visible: boolean) => void;
  setTypeSelectionne: (type: TypeProphylaxie | null) => void;
  handleOuvrirModalAjout: (type: TypeProphylaxie) => void;
  handleOuvrirCalendrier: (type: TypeProphylaxie) => void;
  onRefresh: () => Promise<void>;
  chargerDonnees: () => Promise<void>;
}

export function useVaccinationLogic(): VaccinationLogicReturn {
  const dispatch = useAppDispatch();

  // Sélecteurs Redux
  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const vaccinations = useAppSelector((state) => selectAllVaccinations(state));
  const animaux = useAppSelector((state) => selectAllAnimaux(state));
  const statistics = useAppSelector((state) => selectSanteStatistics(state));
  const loading = useAppSelector((state) => state.sante.loading.vaccinations);

  // État local
  const [refreshing, setRefreshing] = useState(false);
  const [modalAddVisible, setModalAddVisible] = useState(false);
  const [modalCalendrierVisible, setModalCalendrierVisible] = useState(false);
  const [typeSelectionne, setTypeSelectionne] = useState<TypeProphylaxie | null>(null);

  /**
   * Charger les données
   */
  const chargerDonnees = async () => {
    if (!projetActif?.id) return;

    try {
      await Promise.all([
        dispatch(loadVaccinations(projetActif.id)).unwrap(),
        dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).unwrap(),
      ]);
    } catch (error) {
      console.error('Erreur chargement données vaccination:', error);
    }
  };

  /**
   * Rafraîchir les données
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  };

  /**
   * Calculer les statistiques globales de prophylaxie
   */
  const statsGlobales = useMemo((): StatsGlobales => {
    const totalAnimaux = (animaux || []).filter((a) => a.statut === 'actif').length;
    const totalVaccinations = (vaccinations || []).length;

    // Calculer les sujets uniques en retard
    const porcsEnRetardSet = new Set<string>();

    (animaux || []).forEach((animal) => {
      if (animal.statut !== 'actif' || !animal.date_naissance) return;

      const ageJours = calculerAgeJours(animal.date_naissance);

      // Vérifier si le porc devrait avoir reçu des traitements obligatoires
      const traitementsObligatoires = CALENDRIER_VACCINAL_TYPE.filter(
        (cal) => cal.obligatoire && cal.age_jours <= ageJours
      );

      // Si l'animal a au moins un traitement obligatoire manquant, il est en retard
      const aAuMoinsUnTraitementManquant = traitementsObligatoires.some((traitement) => {
        const aRecuTraitement = (vaccinations || []).some(
          (v) =>
            v.animal_ids?.includes(animal.id) &&
            v.type_prophylaxie === traitement.type_prophylaxie &&
            v.statut === 'effectue'
        );
        return !aRecuTraitement;
      });

      if (aAuMoinsUnTraitementManquant) {
        porcsEnRetardSet.add(animal.id);
      }
    });

    const porcsEnRetard = porcsEnRetardSet.size;

    // Calculer le taux de couverture
    const tauxCouverture =
      totalAnimaux > 0 ? Math.round(((totalAnimaux - porcsEnRetard) / totalAnimaux) * 100) : 0;

    return {
      totalAnimaux,
      totalVaccinations,
      porcsEnRetard,
      tauxCouverture,
    };
  }, [animaux, vaccinations]);

  /**
   * Calculer les statistiques par type de prophylaxie
   */
  const statParType = useMemo((): StatistiquesProphylaxieParType[] => {
    const types: TypeProphylaxie[] = [
      'vitamine',
      'deparasitant',
      'fer',
      'antibiotique_preventif',
      'vaccin_obligatoire',
      'autre_traitement',
    ];

    return types.map((type) => {
      const vaccinationsType = (vaccinations || []).filter((v) => v.type_prophylaxie === type);
      const totalVaccinations = vaccinationsType.length;
      const porcsVaccines = vaccinationsType.filter((v) => v.statut === 'effectue').length;
      const enRetard = vaccinationsType.filter((v) => v.statut === 'en_retard').length;

      // Calculer les animaux concernés
      const animauxConcernes = new Set<string>();
      vaccinationsType.forEach((v) => {
        if (v.animal_ids && Array.isArray(v.animal_ids)) {
          v.animal_ids.forEach((id: string) => animauxConcernes.add(id));
        }
      });

      const totalPorcs = animauxConcernes.size;
      const tauxCouverture =
        statsGlobales.totalAnimaux > 0
          ? Math.round((totalPorcs / statsGlobales.totalAnimaux) * 100)
          : 0;

      // Calculer le coût total (si disponible dans les vaccinations)
      const coutTotal = vaccinationsType.reduce((sum, v) => sum + (v.cout || 0), 0);

      // Trouver le dernier traitement et le prochain prévu
      const traitementsEffectues = vaccinationsType
        .filter((v) => v.statut === 'effectue' && v.date_administration)
        .sort((a, b) => (b.date_administration || '').localeCompare(a.date_administration || ''));
      const dernierTraitement = traitementsEffectues[0]?.date_administration;

      return {
        type_prophylaxie: type,
        nom_type: TYPE_PROPHYLAXIE_LABELS[type],
        total_vaccinations: totalVaccinations,
        porcs_vaccines: porcsVaccines,
        total_porcs: totalPorcs,
        taux_couverture: tauxCouverture,
        en_retard: enRetard,
        dernier_traitement: dernierTraitement,
        cout_total: coutTotal,
      };
    });
  }, [vaccinations, statsGlobales.totalAnimaux]);

  /**
   * Ouvrir la modale d'ajout pour un type
   */
  const handleOuvrirModalAjout = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalAddVisible(true);
  };

  /**
   * Ouvrir le calendrier pour un type
   */
  const handleOuvrirCalendrier = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalCalendrierVisible(true);
  };

  // Charger les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      chargerDonnees();
    }
  }, [projetActif?.id]);

  return {
    // État
    refreshing,
    modalAddVisible,
    modalCalendrierVisible,
    typeSelectionne,
    loading,

    // Données
    projetActif,
    vaccinations,
    animaux,
    statsGlobales,
    statParType,

    // Actions
    setModalAddVisible,
    setModalCalendrierVisible,
    setTypeSelectionne,
    handleOuvrirModalAjout,
    handleOuvrirCalendrier,
    onRefresh,
    chargerDonnees,
  };
}
