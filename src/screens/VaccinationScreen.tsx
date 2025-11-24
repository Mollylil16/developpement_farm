/**
 * VaccinationScreen - Interface moderne de gestion des vaccinations (REFACTORÉ)
 * 
 * Architecture:
 * - Hook: useVaccinationLogic (logique métier, calculs)
 * - Composants: VaccinationStatsCard, VaccinationTypeCard (UI)
 * - Helpers: vaccinationHelpers (fonctions utilitaires)
 * - Écran: Orchestration uniquement
 */

import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useVaccinationLogic } from '../hooks/useVaccinationLogic';
import VaccinationStatsCard from '../components/VaccinationStatsCard';
import VaccinationTypeCard from '../components/VaccinationTypeCard';
import VaccinationFormModal from '../components/VaccinationFormModal';
import CalendrierVaccinalModal from '../components/CalendrierVaccinalModal';
import { getIconeType, getCouleurType } from '../utils/vaccinationHelpers';

export default function VaccinationScreen() {
  const { colors } = useTheme();
  const logic = useVaccinationLogic();
  
  if (!logic.projetActif) {
    return null; // Géré par ProtectedScreen parent
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={logic.refreshing}
            onRefresh={logic.onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Carte récapitulative des statistiques globales */}
        <VaccinationStatsCard stats={logic.statsGlobales} />
        
        {/* Cartes par type de prophylaxie */}
        {logic.statParType.map((stat) => (
          <VaccinationTypeCard
            key={stat.type}
            stat={stat}
            icone={getIconeType(stat.type)}
            couleur={getCouleurType(stat.type)}
            onAjouter={logic.handleOuvrirModalAjout}
            onVoirCalendrier={logic.handleOuvrirCalendrier}
          />
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Modale d'ajout de vaccination */}
      <VaccinationFormModal
        visible={logic.modalAddVisible}
        onClose={() => logic.setModalAddVisible(false)}
        typeInitial={logic.typeSelectionne}
      />
      
      {/* Modale du calendrier vaccinal */}
      <CalendrierVaccinalModal
        visible={logic.modalCalendrierVisible}
        onClose={() => logic.setModalCalendrierVisible(false)}
        typeFiltre={logic.typeSelectionne}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomPadding: {
    height: 24,
  },
});

