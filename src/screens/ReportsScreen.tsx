/**
 * Écran Rapports
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import PerformanceIndicatorsComponent from '../components/PerformanceIndicatorsComponent';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PerformanceIndicatorsComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

