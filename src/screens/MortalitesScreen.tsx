/**
 * Écran Mortalités
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import MortalitesListComponent from '../components/MortalitesListComponent';

export default function MortalitesScreen() {
  return (
    <View style={styles.container}>
      <MortalitesListComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

