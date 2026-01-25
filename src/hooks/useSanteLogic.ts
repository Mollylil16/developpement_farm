/**
 * useSanteLogic - Logique métier pour l'écran Santé
 *
 * Responsabilités:
 * - Gestion de l'état des onglets
 * - Chargement des données sanitaires
 * - Rafraîchissement
 * - Gestion des alertes
 * - Détection du mode d'élevage (batch vs individuel)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadVisitesVeterinaires, loadAlertesSanitaires } from '../store/slices/santeSlice';
import {
  selectSanteLoading,
  selectSanteAlertes,
  selectNombreAlertesCritiques,
  selectNombreAlertesElevees,
} from '../store/selectors/santeSelectors';
import { useVaccinationsLogic } from './sante/useVaccinationsLogic';
import { useMaladiesLogic } from './sante/useMaladiesLogic';
import { useTraitementsLogic } from './sante/useTraitementsLogic';
import { useModeElevage, ModeElevage } from './useModeElevage';
import { useProjetEffectif } from './useProjetEffectif';

export type OngletType = 'vaccinations' | 'maladies' | 'traitements' | 'veterinaire' | 'mortalites';

export interface SanteLogicReturn {
  // État
  ongletActif: OngletType;
  refreshing: boolean;
  showAlertes: boolean;
  loading: boolean;

  // Mode d'élevage
  modeElevage: ModeElevage;
  isModeBatch: boolean;

  // Données
  alertes: Array<{
    gravite: 'critique' | 'elevee' | 'moyenne' | 'faible';
    message: string;
    type: string;
  }>;
  nombreAlertesCritiques: number;
  nombreAlertesElevees: number;
  projetActif: unknown;

  // Actions
  setOngletActif: (onglet: OngletType) => void;
  setShowAlertes: (show: boolean) => void;
  onRefresh: () => Promise<void>;
  chargerDonnees: () => void;

  // Configuration
  onglets: Array<{
    id: OngletType;
    label: string;
    icon: string;
    badge: number;
  }>;
}

export function useSanteLogic(initialTab?: OngletType): SanteLogicReturn {
  const dispatch = useAppDispatch();

  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const loading = useAppSelector(selectSanteLoading);
  const alertes = useAppSelector(selectSanteAlertes);
  const nombreAlertesCritiques = useAppSelector(selectNombreAlertesCritiques);
  const nombreAlertesElevees = useAppSelector(selectNombreAlertesElevees);

  // Mode d'élevage (batch vs individuel)
  const modeElevage = useModeElevage();
  const isModeBatch = modeElevage === 'bande';

  // Hooks spécialisés
  const { chargerDonnees: chargerVaccinations } = useVaccinationsLogic();
  const { chargerDonnees: chargerMaladies } = useMaladiesLogic();
  const { chargerDonnees: chargerTraitements } = useTraitementsLogic();

  // État local - Utiliser initialTab si fourni, sinon 'vaccinations' par défaut
  const [ongletActif, setOngletActif] = useState<OngletType>(
    initialTab || 'vaccinations'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showAlertes, setShowAlertes] = useState(true);

  // Configuration des onglets
  const onglets = [
    {
      id: 'vaccinations' as OngletType,
      label: 'Vaccinations',
      icon: 'medical-outline',
      badge: 0,
    },
    {
      id: 'maladies' as OngletType,
      label: 'Maladies',
      icon: 'bug-outline',
      badge: 0,
    },
    {
      id: 'traitements' as OngletType,
      label: 'Traitements',
      icon: 'bandage-outline',
      badge: 0,
    },
    {
      id: 'veterinaire' as OngletType,
      label: 'Vétérinaire',
      icon: 'medkit-outline',
      badge: 0,
    },
    {
      id: 'mortalites' as OngletType,
      label: 'Mortalités',
      icon: 'pulse-outline',
      badge: 0,
    },
  ];

  /**
   * Charger toutes les données sanitaires
   */
  const chargerDonnees = useCallback(() => {
    if (!projetActif?.id) return;

    chargerVaccinations(projetActif.id);
    chargerMaladies(projetActif.id);
    chargerTraitements(projetActif.id);
    dispatch(loadVisitesVeterinaires(projetActif.id));
    dispatch(loadAlertesSanitaires(projetActif.id));
  }, [projetActif?.id, dispatch, chargerVaccinations, chargerMaladies, chargerTraitements]);

  /**
   * Rafraîchir les données
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  }, [chargerDonnees]);

  // Charger les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      chargerDonnees();
    }
  }, [projetActif?.id, chargerDonnees]);

  // ✅ Mettre à jour l'onglet actif si initialTab change (navigation depuis VetProjectDetailScreen)
  // ✅ En mode restreint (initialTab fourni), verrouiller l'onglet pour empêcher le changement
  useEffect(() => {
    if (initialTab && initialTab !== ongletActif) {
      setOngletActif(initialTab);
    }
  }, [initialTab]);

  // ✅ Wrapper pour setOngletActif qui empêche le changement en mode restreint
  const handleSetOngletActif = (onglet: OngletType) => {
    // Si initialTab est fourni (mode restreint), empêcher le changement d'onglet
    if (initialTab) {
      return; // Ne pas permettre le changement d'onglet en mode restreint
    }
    setOngletActif(onglet);
  };

  return {
    // État
    ongletActif,
    refreshing,
    showAlertes,
    loading,

    // Mode d'élevage
    modeElevage,
    isModeBatch,

    // Données
    alertes,
    nombreAlertesCritiques,
    nombreAlertesElevees,
    projetActif,

    // Actions
    // ✅ Utiliser handleSetOngletActif qui empêche le changement en mode restreint
    setOngletActif: handleSetOngletActif,
    setShowAlertes,
    onRefresh,
    chargerDonnees,

    // Configuration
    onglets,
  };
}
