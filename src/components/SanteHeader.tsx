/**
 * SanteHeader - En-tête de l'écran Santé
 *
 * Affiche le titre, le mode d'élevage et les badges d'alertes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useModeElevage } from '../hooks/useModeElevage';

interface SanteHeaderProps {
  nombreAlertesCritiques: number;
  nombreAlertesElevees: number;
}

export default function SanteHeader({
  nombreAlertesCritiques,
  nombreAlertesElevees,
}: SanteHeaderProps) {
  const { colors } = useTheme();
  const modeElevage = useModeElevage();
  const isModeBatch = modeElevage === 'bande';

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="medical" size={28} color={colors.primary} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Santé</Text>
            <View style={styles.modeContainer}>
              <Ionicons
                name={isModeBatch ? 'grid-outline' : 'paw-outline'}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={[styles.modeText, { color: colors.textSecondary }]}>
                {isModeBatch ? 'Mode Bande' : 'Mode Individuel'}
              </Text>
            </View>
          </View>
        </View>
        {(nombreAlertesCritiques > 0 || nombreAlertesElevees > 0) && (
          <View style={styles.headerBadges}>
            {nombreAlertesCritiques > 0 && (
              <View style={[styles.headerBadge, { backgroundColor: colors.error }]}>
                <Ionicons name="warning" size={16} color="#fff" />
                <Text style={styles.headerBadgeText}>{nombreAlertesCritiques}</Text>
              </View>
            )}
            {nombreAlertesElevees > 0 && (
              <View style={[styles.headerBadge, { backgroundColor: colors.warning }]}>
                <Ionicons name="alert" size={16} color="#fff" />
                <Text style={styles.headerBadgeText}>{nombreAlertesElevees}</Text>
              </View>
            )}
          </View>
        )}
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
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modeText: {
    fontSize: 12,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
