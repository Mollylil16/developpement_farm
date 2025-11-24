/**
 * 🏥 MODULE SANTÉ - Écran Principal (REFACTORÉ)
 * Navigation par onglets pour gérer tous les aspects sanitaires du cheptel
 * 
 * Architecture:
 * - Hook: useSanteLogic (logique métier)
 * - Composants: SanteHeader, SanteAlertes, SanteTabs, SanteContent (UI)
 * - Écran: Orchestration uniquement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSanteLogic } from '../hooks/useSanteLogic';
import SanteHeader from '../components/SanteHeader';
import SanteAlertes from '../components/SanteAlertes';
import SanteTabs from '../components/SanteTabs';
import SanteContent from '../components/SanteContent';

export default function SanteScreen() {
  const { colors } = useTheme();
  const logic = useSanteLogic();
  
  // Cas: Aucun projet actif
  if (!logic.projetActif) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun projet actif
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* En-tête avec badges */}
      <SanteHeader
        nombreAlertesCritiques={logic.nombreAlertesCritiques}
        nombreAlertesElevees={logic.nombreAlertesElevees}
      />
      
      {/* Section des alertes */}
      <SanteAlertes
        alertes={logic.alertes}
        nombreAlertesCritiques={logic.nombreAlertesCritiques}
        showAlertes={logic.showAlertes}
        onClose={() => logic.setShowAlertes(false)}
      />
      
      {/* Onglets de navigation */}
      <SanteTabs
        onglets={logic.onglets}
        ongletActif={logic.ongletActif}
        onTabChange={logic.setOngletActif}
      />
      
      {/* Contenu selon l'onglet actif */}
      <SanteContent
        ongletActif={logic.ongletActif}
        refreshing={logic.refreshing}
        onRefresh={logic.onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});

