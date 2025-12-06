/**
 * Écran Mortalités
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import MortalitesListComponent from '../components/MortalitesListComponent';

function MortalitesScreenContent() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <MortalitesListComponent />
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

export default function MortalitesScreen() {
  return (
    <ProtectedScreen requiredPermission="mortalites">
      <MortalitesScreenContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
