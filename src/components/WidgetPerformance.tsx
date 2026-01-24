/**
 * Widget Performance - Widget compact avec indicateurs clés
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { useProjetEffectif } from '../hooks/useProjetEffectif';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { denormalize } from 'normalizr';
import { gestationsSchema } from '../store/normalization/schemas';
import type { Gestation } from '../types/reproduction';

interface WidgetPerformanceProps {
  onPress?: () => void;
}

export default function WidgetPerformance({ onPress }: WidgetPerformanceProps) {
  const { colors } = useTheme();
  const { indicateursPerformance } = useAppSelector((state) => state.reports);
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const gestations: Gestation[] = useAppSelector((state) => {
    const { entities, ids } = state.reproduction;
    const result = denormalize(ids.gestations, gestationsSchema, {
      gestations: entities.gestations,
    });
    return Array.isArray(result) ? result : [];
  });

  // Calculer la performance globale à partir des indicateurs
  const performanceGlobale = useMemo(() => {
    if (!indicateursPerformance) return 0;

    // Score basé sur plusieurs facteurs (0-100)
    // - Taux de croissance (0-50 points)
    // - Taux de mortalité inversé (0-30 points, plus bas = mieux)
    // - Efficacité alimentaire (0-20 points)

    const scoreCroissance = Math.min(50, (indicateursPerformance.taux_croissance / 100) * 50);
    const scoreMortalite = Math.min(
      30,
      (1 - Math.min(1, indicateursPerformance.taux_mortalite / 10)) * 30
    );
    const scoreEfficacite = Math.min(20, (indicateursPerformance.efficacite_alimentaire / 10) * 20);

    return scoreCroissance + scoreMortalite + scoreEfficacite;
  }, [indicateursPerformance]);
  const tauxMortalite = indicateursPerformance?.taux_mortalite || 0;
  const coutProductionKg = indicateursPerformance?.cout_production_kg || 0;

  // Calculer la tendance (approximation basée sur les gestations)
  const tendance = useMemo(() => {
    if (!gestations || gestations.length === 0) return { icon: '→', color: colors.textSecondary };

    const gestationsTerminees = gestations.filter((g: Gestation) => g.statut === 'terminee');
    if (gestationsTerminees.length === 0) return { icon: '→', color: colors.textSecondary };

    // Comparer les dernières gestations avec les précédentes
    const recentes = gestationsTerminees.slice(-5);
    const precedentes = gestationsTerminees.slice(-10, -5);

    if (precedentes.length === 0) return { icon: '→', color: colors.textSecondary };

    const moyenneRecentes =
      recentes.reduce(
        (sum: number, g: Gestation) =>
          sum + (g.nombre_porcelets_reel || g.nombre_porcelets_prevu || 0),
        0
      ) / recentes.length;

    const moyennePrecedentes =
      precedentes.reduce(
        (sum: number, g: Gestation) =>
          sum + (g.nombre_porcelets_reel || g.nombre_porcelets_prevu || 0),
        0
      ) / precedentes.length;

    if (moyenneRecentes > moyennePrecedentes) {
      return { icon: '↗️', color: colors.success };
    }
    if (moyenneRecentes < moyennePrecedentes) {
      return { icon: '↘️', color: colors.error };
    }
    return { icon: '→', color: colors.textSecondary };
  }, [gestations, colors]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...colors.shadow.medium,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📊 Performance</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Performance globale:
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {performanceGlobale.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Taux de mortalité:
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  tauxMortalite > 5
                    ? colors.error
                    : tauxMortalite > 3
                      ? colors.warning
                      : colors.success,
              },
            ]}
          >
            {tauxMortalite.toFixed(1)}% {tauxMortalite <= 3 ? '✅' : '⚠️'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Coût de production:
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {coutProductionKg.toLocaleString('fr-FR')} FCFA/kg
          </Text>
        </View>

        <View style={[styles.tendanceContainer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.tendanceLabel, { color: colors.textSecondary }]}>Tendance:</Text>
          <Text style={[styles.tendanceValue, { color: tendance.color }]}>
            {tendance.icon}{' '}
            {tendance.icon === '↗️'
              ? 'Amélioration'
              : tendance.icon === '↘️'
                ? 'Diminution'
                : 'Stable'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    gap: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  tendanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  tendanceLabel: {
    fontSize: FONT_SIZES.sm,
  },
  tendanceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
