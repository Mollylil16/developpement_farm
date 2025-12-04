/**
 * Carte compacte pour les modules complémentaires du Dashboard
 * Version réduite pour affichage en grille 2×N
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';

interface CompactModuleCardProps {
  icon: string;
  title: string;
  primaryValue: number | string;
  secondaryValue: number | string;
  labelPrimary: string;
  labelSecondary: string;
  onPress?: () => void;
}

export default function CompactModuleCard({
  icon,
  title,
  primaryValue,
  secondaryValue,
  labelPrimary,
  labelSecondary,
  onPress,
}: CompactModuleCardProps) {
  const { colors } = useTheme();

  const WidgetContent = (
    <View style={styles.container}>
      {/* Header avec icône et titre */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{icon}</Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Stats compactes */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {primaryValue !== undefined && primaryValue !== null ? primaryValue : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {labelPrimary}
          </Text>
        </View>
        <View style={[styles.dividerVertical, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {secondaryValue !== undefined && secondaryValue !== null ? secondaryValue : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {labelSecondary}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.touchable}>
        <Card elevation="small" padding="small" neomorphism={true}>
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="small" padding="small" neomorphism={true}>
      {WidgetContent}
    </Card>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  container: {
    width: '100%',
    minHeight: 85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  emoji: {
    fontSize: 18,
    marginRight: SPACING.xs / 2,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: SPACING.xs / 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  dividerVertical: {
    width: 1,
    height: 25,
  },
});

