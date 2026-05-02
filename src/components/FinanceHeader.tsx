/**
 * FinanceHeader - En-tête de l'écran Finance
 *
 * Affiche le titre avec icône
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function FinanceHeader() {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="cash-outline" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Finance</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
});
