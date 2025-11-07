/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';

interface OverviewWidgetProps {
  onPress?: () => void;
}

export default function OverviewWidget({ onPress }: OverviewWidgetProps) {
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);

  const stats = useMemo(() => {
    if (!projetActif) return null;

    return {
      truies: projetActif.nombre_truies,
      verrats: projetActif.nombre_verrats,
      porcelets: projetActif.nombre_porcelets,
    };
  }, [projetActif]);

  if (!stats || !projetActif) {
    return null;
  }

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🏠</Text>
        <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Truies</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.truies}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {stats.verrats}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {stats.porcelets}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Card elevation="medium" padding="large">
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="medium" padding="large">
      {WidgetContent}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  divider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  trend: {
    fontSize: FONT_SIZES.md,
    marginLeft: SPACING.xs,
  },
});
