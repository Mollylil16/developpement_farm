/**
 * Écran Finance avec onglets - Design harmonisé avec le menu Santé
 */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import FinanceHeader from '../components/FinanceHeader';
import FinanceTabs, { FinanceOngletType } from '../components/FinanceTabs';
import FinanceContent from '../components/FinanceContent';

const ONGLETS = [
  { id: 'vue_ensemble' as FinanceOngletType, label: "Vue d'ensemble", icon: 'bar-chart-outline' },
  { id: 'charges_fixes' as FinanceOngletType, label: 'Charges Fixes', icon: 'calendar-outline' },
  { id: 'depenses' as FinanceOngletType, label: 'Dépenses', icon: 'trending-down-outline' },
  { id: 'revenus' as FinanceOngletType, label: 'Revenus', icon: 'trending-up-outline' },
  { id: 'bilan' as FinanceOngletType, label: 'Bilan', icon: 'calculator-outline' },
];

function FinanceScreenContent() {
  const { colors } = useTheme();
  const [ongletActif, setOngletActif] = useState<FinanceOngletType>('vue_ensemble');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* En-tête avec icône */}
      <FinanceHeader />

      {/* Onglets de navigation */}
      <FinanceTabs
        onglets={ONGLETS}
        ongletActif={ongletActif}
        onTabChange={setOngletActif}
      />

      {/* Contenu selon l'onglet actif */}
      <FinanceContent ongletActif={ongletActif} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function FinanceScreen() {
  return (
    <ProtectedScreen requiredPermission="finance">
      <FinanceScreenContent />
    </ProtectedScreen>
  );
}
