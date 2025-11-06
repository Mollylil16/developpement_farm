/**
 * Widget Vue d'Ensemble - Grand widget avec stats principales
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface WidgetVueEnsembleProps {
  onPress?: () => void;
}

export default function WidgetVueEnsemble({ onPress }: WidgetVueEnsembleProps) {
  const { projetActif } = useAppSelector((state) => state.projet);
  const { gestations } = useAppSelector((state) => state.reproduction);
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);
  const { indicateursPerformance } = useAppSelector((state) => state.reports);

  // Calculer les alertes (mises bas prévues dans les 7 prochains jours)
  const alertesMisesBas = useMemo(() => {
    if (!gestations || gestations.length === 0) return 0;
    const aujourdhui = new Date();
    const dans7Jours = new Date();
    dans7Jours.setDate(aujourdhui.getDate() + 7);
    
    return gestations.filter((g) => {
      if (g.statut !== 'en_cours') return false;
      const dateMiseBas = new Date(g.date_mise_bas_prevue);
      return dateMiseBas >= aujourdhui && dateMiseBas <= dans7Jours;
    }).length;
  }, [gestations]);

  // Calculer le budget restant
  const budgetInfo = useMemo(() => {
    const chargesFixesActives = chargesFixes.filter((cf) => cf.statut === 'actif');
    const chargesFixesMensuelles = chargesFixesActives.reduce((sum, cf) => {
      if (cf.frequence === 'mensuel') return sum + cf.montant;
      if (cf.frequence === 'trimestriel') return sum + cf.montant / 3;
      if (cf.frequence === 'annuel') return sum + cf.montant / 12;
      return sum;
    }, 0);

    const depensesMois = depensesPonctuelles.reduce((sum, dp) => {
      const dateDepense = new Date(dp.date);
      const maintenant = new Date();
      if (
        dateDepense.getMonth() === maintenant.getMonth() &&
        dateDepense.getFullYear() === maintenant.getFullYear()
      ) {
        return sum + dp.montant;
      }
      return sum;
    }, 0);

    const budgetRestant = chargesFixesMensuelles - depensesMois;
    const pourcentageUtilise = chargesFixesMensuelles > 0 
      ? (depensesMois / chargesFixesMensuelles) * 100 
      : 0;

    return {
      budgetMensuel: chargesFixesMensuelles,
      depensesMois,
      budgetRestant,
      pourcentageUtilise,
    };
  }, [chargesFixes, depensesPonctuelles]);

  // Performance globale
  const performanceGlobale = indicateursPerformance?.performance_globale || 0;

  if (!projetActif) return null;

  const renderTrend = (value: number) => {
    if (value > 0) return { icon: '↗️', color: COLORS.success };
    if (value < 0) return { icon: '↘️', color: COLORS.error };
    return { icon: '→', color: COLORS.textSecondary };
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🏠 Vue d'ensemble</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{projetActif.nombre_truies}</Text>
          <Text style={styles.statLabel}>Truies</Text>
          <View style={styles.trendContainer}>
            <Text style={[styles.trend, { color: COLORS.success }]}>↗️ +2</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{projetActif.nombre_verrats}</Text>
          <Text style={styles.statLabel}>Verrats</Text>
          <View style={styles.trendContainer}>
            <Text style={[styles.trend, { color: COLORS.textSecondary }]}>→ 0</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{projetActif.nombre_porcelets}</Text>
          <Text style={styles.statLabel}>Porcelets</Text>
          <View style={styles.trendContainer}>
            <Text style={[styles.trend, { color: COLORS.success }]}>↗️ +5</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>📈 Performance globale</Text>
          <Text style={styles.footerValue}>{performanceGlobale.toFixed(0)}%</Text>
        </View>

        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>💰 Budget restant</Text>
          <Text style={styles.footerValue}>
            {budgetInfo.budgetRestant.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        {alertesMisesBas > 0 && (
          <View style={styles.alertContainer}>
            <Text style={styles.alertText}>
              ⚠️ {alertesMisesBas} mise{alertesMisesBas > 1 ? 's' : ''} bas prévue{alertesMisesBas > 1 ? 's' : ''} cette semaine
            </Text>
          </View>
        )}
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  trendContainer: {
    marginTop: SPACING.xs,
  },
  trend: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  footerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  footerLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.text,
  },
  alertContainer: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  alertText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

