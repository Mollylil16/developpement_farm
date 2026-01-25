/**
 * Écran Rapports pour un projet spécifique
 * Affiche les rapports d'un projet donné pour les vétérinaires
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import StandardHeader from '../components/StandardHeader';
import ReportsHub from '../components/reports/ReportsHub';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type RouteParams = {
  VetReports: {
    projetId: string;
  };
};

export default function VetReportsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'VetReports'>>();
  const projetId = route.params?.projetId;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="document-outline"
        title="Rapports"
        subtitle="Rapports du projet"
        onBack={() => navigation.goBack()}
      />

      {/* TODO: ReportsHub devrait accepter projetId en prop pour filtrer les rapports par projet */}
      <ReportsHub />
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
