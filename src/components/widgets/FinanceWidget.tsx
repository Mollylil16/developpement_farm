/**
 * Widget Finance pour le Dashboard
 * Affiche le budget, dépenses et progression
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadChargesFixes, loadDepensesPonctuelles } from '../../store/slices/financeSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

interface FinanceWidgetProps {
  onPress?: () => void;
}

export default function FinanceWidget({ onPress }: FinanceWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);

  const { projetActif } = useAppSelector((state) => state.projet);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadChargesFixes(projetActif.id));
      dispatch(loadDepensesPonctuelles(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const financeData = useMemo(() => {
    // Calculer le budget mensuel (charges fixes actives)
    const chargesFixesActives = chargesFixes.filter((cf) => cf.statut === 'actif');
    const budgetMensuel = chargesFixesActives.reduce((sum, cf) => {
      if (cf.frequence === 'mensuel') return sum + cf.montant;
      if (cf.frequence === 'trimestriel') return sum + cf.montant / 3;
      if (cf.frequence === 'annuel') return sum + cf.montant / 12;
      return sum;
    }, 0);

    // Calculer les dépenses du mois en cours
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    const depensesDuMois = depensesPonctuelles
      .filter((dp) => {
        const dateDepense = parseISO(dp.date);
        return isWithinInterval(dateDepense, { start: debutMois, end: finMois });
      })
      .reduce((sum, dp) => sum + dp.montant, 0);

    const pourcentageUtilise = budgetMensuel > 0 ? (depensesDuMois / budgetMensuel) * 100 : 0;
    const restant = budgetMensuel - depensesDuMois;

    return {
      budgetMensuel,
      depensesDuMois,
      restant,
      pourcentageUtilise: Math.min(100, Math.max(0, pourcentageUtilise)),
    };
  }, [chargesFixes, depensesPonctuelles]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💰</Text>
        <Text style={[styles.title, { color: colors.text }]}>Finance</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Budget mensuel:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatMontant(financeData.budgetMensuel)}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dépenses:</Text>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {formatMontant(financeData.depensesDuMois)} ({Math.round(financeData.pourcentageUtilise)}%)
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Restant:</Text>
          <Text style={[styles.statValue, { color: financeData.restant >= 0 ? colors.success : colors.error }]}>
            {formatMontant(financeData.restant)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${financeData.pourcentageUtilise}%`,
                  backgroundColor: financeData.pourcentageUtilise > 80 ? colors.error : financeData.pourcentageUtilise > 60 ? colors.warning : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(financeData.pourcentageUtilise)}% du budget utilisé
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Card elevation="medium" padding="large" neomorphism={true}>
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="medium" padding="large" neomorphism={true}>
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
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  progressContainer: {
    marginTop: SPACING.md,
  },
  progressBar: {
    height: 8,
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
    textAlign: 'center',
  },
});
