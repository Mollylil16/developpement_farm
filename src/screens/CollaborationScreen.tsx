/**
 * Écran Collaboration - Design standardisé cohérent avec Planning Production
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import ProtectedScreen from '../components/ProtectedScreen';
import StandardHeader from '../components/StandardHeader';
import CollaborationListComponent from '../components/CollaborationListComponent';

function CollaborationScreenContent() {
  const { colors } = useTheme();
  const invitations = useAppSelector((state) => state.collaboration.invitationsRecues);
  const invitationsEnAttente = Array.isArray(invitations)
    ? invitations.filter((inv: any) => inv.statut === 'en_attente').length
    : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="people"
        title="Collaboration"
        subtitle="Gérez votre équipe et les permissions"
        badge={invitationsEnAttente}
        badgeColor={colors.warning}
      />

      <View style={styles.content}>
        <CollaborationListComponent />
      </View>
    </SafeAreaView>
  );
}

export default function CollaborationScreen() {
  return (
    <ProtectedScreen requireOwner={true}>
      <CollaborationScreenContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
