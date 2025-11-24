/**
 * SanteContent - Contenu de l'écran Santé selon l'onglet actif
 * 
 * Affiche le composant approprié en fonction de l'onglet sélectionné
 */

import React from 'react';
import { RefreshControl } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { OngletType } from '../hooks/useSanteLogic';
import VaccinationsComponentAccordion from './VaccinationsComponentAccordion';
import MaladiesComponentNew from './MaladiesComponentNew';
import TraitementsComponentNew from './TraitementsComponentNew';
import VeterinaireComponent from './VeterinaireComponent';
import MortalitesListComponent from './MortalitesListComponent';

interface SanteContentProps {
  ongletActif: OngletType;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export default function SanteContent({
  ongletActif,
  refreshing,
  onRefresh,
}: SanteContentProps) {
  const { colors } = useTheme();
  
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  );
  
  switch (ongletActif) {
    case 'vaccinations':
      return <VaccinationsComponentAccordion refreshControl={refreshControl} />;
    case 'maladies':
      return <MaladiesComponentNew refreshControl={refreshControl} />;
    case 'traitements':
      return <TraitementsComponentNew refreshControl={refreshControl} />;
    case 'veterinaire':
      return <VeterinaireComponent refreshControl={refreshControl} />;
    case 'mortalites':
      return <MortalitesListComponent refreshControl={refreshControl} />;
    default:
      return null;
  }
}

