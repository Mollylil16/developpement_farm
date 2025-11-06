/**
 * Widget Performance - Widget compact avec indicateurs clés
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface WidgetPerformanceProps {
  onPress?: () => void;
}

export default function WidgetPerformance({ onPress }: WidgetPerformanceProps) {
  const { indicateursPerformance } = useAppSelector((state) => state.reports);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { gestations } = useAppSelector((state) => state.reproduction);

  // Calculer la performance globale
  const performanceGlobale = indicateursPerformance?.performance_globale || 0;
  const tauxMortalite = indicateursPerformance?.taux_mortalite || 0;
  const coutProductionKg = indicateursPerformance?.cout_production_kg || 0;

  // Calculer la tendance (approximation basée sur les gestations)
  const tendance = useMemo(() => {
    if (!gestations || gestations.length === 0) return { icon: '→', color: COLORS.textSecondary };
    
    const gestationsTerminees = gestations.filter((g) => g.statut === 'terminee');
    if (gestationsTerminees.length === 0) return { icon: '→', color: COLORS.textSecondary };

    // Comparer les dernières gestations avec les précédentes
    const recentes = gestationsTerminees.slice(-5);
    const precedentes = gestationsTerminees.slice(-10, -5);

    if (precedentes.length === 0) return { icon: '→', color: COLORS.textSecondary };

    const moyenneRecentes = recentes.reduce((sum, g) => 
      sum + (g.nombre_porcelets_reel || g.nombre_porcelets_prevu || 0), 0
    ) / recentes.length;

    const moyennePrecedentes = precedentes.reduce((sum, g) => 
      sum + (g.nombre_porcelets_reel || g.nombre_porcelets_prevu || 0), 0
    ) / precedentes.length;

    if (moyenneRecentes > moyennePrecedentes) {
      return { icon: '↗️', color: COLORS.success };
    }
    if (moyenneRecentes < moyennePrecedentes) {
      return { icon: '↘️', color: COLORS.error };
    }
    return { icon: '→', color: COLORS.textSecondary };
  }, [gestations]);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 Performance</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Performance globale:</Text>
          <Text style={styles.statValue}>{performanceGlobale.toFixed(0)}%</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Taux de mortalité:</Text>
          <Text style={[
            styles.statValue,
            { color: tauxMortalite > 5 ? COLORS.error : tauxMortalite > 3 ? COLORS.warning : COLORS.success }
          ]}>
            {tauxMortalite.toFixed(1)}% {tauxMortalite <= 3 ? '✅' : '⚠️'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Coût de production:</Text>
          <Text style={styles.statValue}>
            {coutProductionKg.toLocaleString('fr-FR')} FCFA/kg
          </Text>
        </View>

        <View style={styles.tendanceContainer}>
          <Text style={styles.tendanceLabel}>Tendance:</Text>
          <Text style={[styles.tendanceValue, { color: tendance.color }]}>
            {tendance.icon} {tendance.icon === '↗️' ? 'Amélioration' : tendance.icon === '↘️' ? 'Diminution' : 'Stable'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...COLORS.shadow.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
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
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.text,
  },
  tendanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  tendanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tendanceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

