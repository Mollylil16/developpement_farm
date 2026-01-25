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
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSanteLogic, OngletType } from '../hooks/useSanteLogic';
import SanteHeader from '../components/SanteHeader';
import SanteAlertes from '../components/SanteAlertes';
import SanteTabs from '../components/SanteTabs';
import SanteContent from '../components/SanteContent';
import StandardHeader from '../components/StandardHeader';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

// Mapping des onglets vers leurs titres et icônes
const ONGLET_TITLES: Record<OngletType, { title: string; icon: string }> = {
  traitements: { title: 'Traitements', icon: 'bandage-outline' },
  maladies: { title: 'Maladies', icon: 'bug-outline' },
  vaccinations: { title: 'Vaccinations', icon: 'medical-outline' },
  veterinaire: { title: 'Vétérinaire', icon: 'medkit-outline' },
  mortalites: { title: 'Mortalités', icon: 'pulse-outline' },
};

export default function SanteScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  // ✅ Récupérer initialTab depuis les paramètres de route (navigation imbriquée depuis Tab Navigator)
  const initialTab = (route.params as { initialTab?: OngletType })?.initialTab;
  const logic = useSanteLogic(initialTab);

  // ✅ Mode restreint : si initialTab est fourni, afficher uniquement le contenu spécifique
  const isRestrictedMode = !!initialTab;

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

  // ✅ Mode restreint : afficher uniquement le contenu de l'onglet spécifique (comme Mortalités)
  if (isRestrictedMode && initialTab) {
    const ongletInfo = ONGLET_TITLES[initialTab];
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header simple pour le mode restreint */}
        <StandardHeader
          icon={ongletInfo.icon}
          title={ongletInfo.title}
          subtitle="Lecture seule"
        />

        {/* Contenu uniquement de l'onglet spécifique */}
        <SanteContent
          ongletActif={initialTab}
          refreshing={logic.refreshing}
          onRefresh={logic.onRefresh}
        />
        <ChatAgentFAB />
      </SafeAreaView>
    );
  }

  // ✅ Mode normal : afficher tous les onglets et le menu complet
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
      <ChatAgentFAB />
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
