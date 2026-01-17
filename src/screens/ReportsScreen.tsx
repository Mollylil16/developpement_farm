/**
 * Écran Rapports - Hub central de téléchargement de rapports
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import StandardHeader from '../components/StandardHeader';
import ReportsHub from '../components/reports/ReportsHub';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

function ReportsScreenContent() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="document-text-outline"
        title="Rapports"
        subtitle="Téléchargez des rapports détaillés pour analyser votre exploitation"
      />

      <ReportsHub />
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

export default function ReportsScreen() {
  return (
    <ProtectedScreen requiredPermission="rapports">
      <ReportsScreenContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
