/**
 * useSanteLogic - Logique métier pour l'écran Santé
 * 
 * Responsabilités:
 * - Gestion de l'état des onglets
 * - Chargement des données sanitaires
 * - Rafraîchissement
 * - Gestion des alertes
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadVaccinations,
  loadMaladies,
  loadTraitements,
  loadVisitesVeterinaires,
  loadRappelsVaccinations,
  loadStatistiquesVaccinations,
  loadStatistiquesMaladies,
  loadStatistiquesTraitements,
  loadAlertesSanitaires,
} from '../store/slices/santeSlice';
import {
  selectSanteLoading,
  selectSanteAlertes,
  selectNombreAlertesCritiques,
  selectNombreAlertesElevees,
} from '../store/selectors/santeSelectors';

export type OngletType = 'vaccinations' | 'maladies' | 'traitements' | 'veterinaire' | 'mortalites';

export interface SanteLogicReturn {
  // État
  ongletActif: OngletType;
  refreshing: boolean;
  showAlertes: boolean;
  loading: boolean;
  
  // Données
  alertes: any[];
  nombreAlertesCritiques: number;
  nombreAlertesElevees: number;
  projetActif: any;
  
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

export function useSanteLogic(): SanteLogicReturn {
  const dispatch = useAppDispatch();
  
  // Sélecteurs Redux
  const { projetActif } = useAppSelector((state) => state.projet);
  const loading = useAppSelector(selectSanteLoading);
  const alertes = useAppSelector(selectSanteAlertes);
  const nombreAlertesCritiques = useAppSelector(selectNombreAlertesCritiques);
  const nombreAlertesElevees = useAppSelector(selectNombreAlertesElevees);
  
  // État local
  const [ongletActif, setOngletActif] = useState<OngletType>('vaccinations');
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
    
    dispatch(loadVaccinations(projetActif.id));
    dispatch(loadMaladies(projetActif.id));
    dispatch(loadTraitements(projetActif.id));
    dispatch(loadVisitesVeterinaires(projetActif.id));
    dispatch(loadRappelsVaccinations(projetActif.id));
    dispatch(loadStatistiquesVaccinations(projetActif.id));
    dispatch(loadStatistiquesMaladies(projetActif.id));
    dispatch(loadStatistiquesTraitements(projetActif.id));
    dispatch(loadAlertesSanitaires(projetActif.id));
  }, [projetActif?.id, dispatch]);
  
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
  
  return {
    // État
    ongletActif,
    refreshing,
    showAlertes,
    loading,
    
    // Données
    alertes,
    nombreAlertesCritiques,
    nombreAlertesElevees,
    projetActif,
    
    // Actions
    setOngletActif,
    setShowAlertes,
    onRefresh,
    chargerDonnees,
    
    // Configuration
    onglets,
  };
}

