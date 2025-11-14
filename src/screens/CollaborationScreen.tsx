/**
 * Écran Collaboration
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import CollaborationListComponent from '../components/CollaborationListComponent';

function CollaborationScreenContent() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <CollaborationListComponent />
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
});

