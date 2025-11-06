/**
 * Widget Performance pour le Dashboard
 * Affiche les indicateurs de performance clés
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadMortalitesParProjet } from '../../store/slices/mortalitesSlice';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';

interface PerformanceWidgetProps {
  onPress?: () => void;
}

export default function PerformanceWidget({ onPress }: PerformanceWidgetProps) {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { mortalites } = useAppSelector((state) => state.mortalites);
  const { indicateursPerformance } = useAppSelector((state) => state.reports);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadMortalitesParProjet(projetActif.id));
    }
  }, [dispatch, projetActif]);

  const performanceData = useMemo(() => {
    if (!projetActif) return null;

    const nombrePorcsTotal =
      projetActif.nombre_truies +
      projetActif.nombre_verrats +
      projetActif.nombre_porcelets;

    // Calculer le taux de mortalité depuis les mortalités
    const totalMorts = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);
    const tauxMortalite = nombrePorcsTotal > 0 ? (totalMorts / nombrePorcsTotal) * 100 : 0;

    // Utiliser les indicateurs de performance s'ils sont disponibles
    const performanceGlobale = indicateursPerformance?.taux_croissance || 0;
    const coutProduction = indicateursPerformance?.cout_production_kg || 0;

    return {
      performanceGlobale: Math.round(performanceGlobale),
      tauxMortalite: Math.round(tauxMortalite * 10) / 10,
      coutProduction: Math.round(coutProduction),
      tendance: tauxMortalite < 5 ? 'positive' : tauxMortalite < 10 ? 'neutre' : 'negative',
    };
  }, [projetActif, mortalites, indicateursPerformance]);

  if (!performanceData) {
    return null;
  }

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={styles.title}>Performance</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Performance globale:</Text>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {performanceData.performanceGlobale}%
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Taux de mortalité:</Text>
          <View style={styles.statValueRow}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    performanceData.tauxMortalite < 5
                      ? COLORS.success
                      : performanceData.tauxMortalite < 10
                      ? COLORS.warning
                      : COLORS.error,
                },
              ]}
            >
              {performanceData.tauxMortalite}%
            </Text>
            {performanceData.tauxMortalite < 5 && <Text style={styles.checkmark}>✅</Text>}
          </View>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Coût de production:</Text>
          <Text style={styles.statValue}>
            {performanceData.coutProduction} FCFA/kg
          </Text>
        </View>

        <View style={styles.tendanceContainer}>
          <Text style={styles.tendanceLabel}>Tendance:</Text>
          <Text
            style={[
              styles.tendanceValue,
              {
                color:
                  performanceData.tendance === 'positive'
                    ? COLORS.success
                    : performanceData.tendance === 'negative'
                    ? COLORS.error
                    : COLORS.warning,
              },
            ]}
          >
            {performanceData.tendance === 'positive' ? '↗️ Amélioration' : performanceData.tendance === 'negative' ? '↘️ Attention' : '→ Stable'}
          </Text>
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
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.md,
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
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.text,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  checkmark: {
    fontSize: FONT_SIZES.md,
  },
  tendanceContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tendanceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  tendanceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

