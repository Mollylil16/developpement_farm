/**
 * Écran Collaboration
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import CollaborationListComponent from '../components/CollaborationListComponent';

export default function CollaborationScreen() {
  return (
    <View style={styles.container}>
      <CollaborationListComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

