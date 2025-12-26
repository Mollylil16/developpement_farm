/**
 * Widget Finance - Widget avec graphique de progression budgétaire
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { ChargeFixe, DepensePonctuelle } from '../types/finance';
import {
  selectAllChargesFixes,
  selectAllDepensesPonctuelles,
} from '../store/selectors/financeSelectors';

interface WidgetFinanceProps {
  onPress?: () => void;
}

export default function WidgetFinance({ onPress }: WidgetFinanceProps) {
  const { colors } = useTheme();
  const chargesFixes: ChargeFixe[] = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles: DepensePonctuelle[] = useAppSelector(selectAllDepensesPonctuelles);

  // Calculer le budget mensuel et les dépenses
  const budgetInfo = useMemo(() => {
    const chargesFixesActives = chargesFixes.filter((cf: ChargeFixe) => cf.statut === 'actif');
    const chargesFixesMensuelles = chargesFixesActives.reduce((sum: number, cf: ChargeFixe) => {
      if (cf.frequence === 'mensuel') return sum + cf.montant;
      if (cf.frequence === 'trimestriel') return sum + cf.montant / 3;
      if (cf.frequence === 'annuel') return sum + cf.montant / 12;
      return sum;
    }, 0);

    const maintenant = new Date();
    const depensesMois = depensesPonctuelles.reduce((sum: number, dp: DepensePonctuelle) => {
      const dateDepense = new Date(dp.date);
      if (
        dateDepense.getMonth() === maintenant.getMonth() &&
        dateDepense.getFullYear() === maintenant.getFullYear()
      ) {
        return sum + dp.montant;
      }
      return sum;
    }, 0);

    // Calculer les dépenses du mois précédent pour l'évolution
    const moisPrecedent = new Date();
    moisPrecedent.setMonth(moisPrecedent.getMonth() - 1);
    const depensesMoisPrecedent = depensesPonctuelles.reduce(
      (sum: number, dp: DepensePonctuelle) => {
        const dateDepense = new Date(dp.date);
        if (
          dateDepense.getMonth() === moisPrecedent.getMonth() &&
          dateDepense.getFullYear() === moisPrecedent.getFullYear()
        ) {
          return sum + dp.montant;
        }
        return sum;
      },
      0
    );

    const budgetRestant = chargesFixesMensuelles - depensesMois;
    const pourcentageUtilise =
      chargesFixesMensuelles > 0 ? (depensesMois / chargesFixesMensuelles) * 100 : 0;

    const evolution =
      depensesMoisPrecedent > 0
        ? ((depensesMois - depensesMoisPrecedent) / depensesMoisPrecedent) * 100
        : 0;

    return {
      budgetMensuel: chargesFixesMensuelles,
      depensesMois,
      budgetRestant,
      pourcentageUtilise,
      evolution,
    };
  }, [chargesFixes, depensesPonctuelles]);

  const getEvolutionColor = () => {
    if (budgetInfo.evolution > 0) return colors.error;
    if (budgetInfo.evolution < 0) return colors.success;
    return colors.textSecondary;
  };

  const getEvolutionIcon = () => {
    if (budgetInfo.evolution > 0) return '↗️';
    if (budgetInfo.evolution < 0) return '↘️';
    return '→';
  };

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
        <Text style={[styles.title, { color: colors.text }]}>💰 Finance</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Budget mensuel:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {budgetInfo.budgetMensuel.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dépenses:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {budgetInfo.depensesMois.toLocaleString('fr-FR')} FCFA (
            {budgetInfo.pourcentageUtilise.toFixed(0)}%)
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Restant:</Text>
          <Text
            style={[
              styles.statValue,
              { color: budgetInfo.budgetRestant >= 0 ? colors.success : colors.error },
            ]}
          >
            {budgetInfo.budgetRestant.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(Math.min(100, budgetInfo.pourcentageUtilise))}%`,
                  backgroundColor:
                    budgetInfo.pourcentageUtilise > 80
                      ? colors.error
                      : budgetInfo.pourcentageUtilise > 60
                        ? colors.warning
                        : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {budgetInfo.pourcentageUtilise.toFixed(0)}% utilisé
          </Text>
        </View>

        <View style={[styles.evolutionContainer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>
            📊 Évolution mensuelle:
          </Text>
          <Text style={[styles.evolutionValue, { color: getEvolutionColor() }]}>
            {getEvolutionIcon()} {Math.abs(budgetInfo.evolution).toFixed(1)}%
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
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressBar: {
    height: 12,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'right',
  },
  evolutionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  evolutionLabel: {
    fontSize: FONT_SIZES.sm,
  },
  evolutionValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
