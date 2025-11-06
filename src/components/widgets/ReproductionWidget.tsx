/**
 * Widget Reproduction pour le Dashboard
 * Affiche les gestations actives et prochaines mises bas
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadGestations, loadGestationsEnCours } from '../../store/slices/reproductionSlice';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import Card from '../Card';
import { useEffect } from 'react';
import { differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';

interface ReproductionWidgetProps {
  onPress?: () => void;
}

export default function ReproductionWidget({ onPress }: ReproductionWidgetProps) {
  const dispatch = useAppDispatch();
  const { gestations } = useAppSelector((state) => state.reproduction);

  useEffect(() => {
    dispatch(loadGestations());
    dispatch(loadGestationsEnCours());
  }, [dispatch]);

  const reproductionData = useMemo(() => {
    const gestationsEnCours = gestations.filter((g) => g.statut === 'en_cours');
    const maintenant = new Date();

    // Prochaines mises bas dans les 7 prochains jours
    const prochainesMisesBas = gestationsEnCours
      .map((g) => {
        const dateMiseBas = parseISO(g.date_mise_bas_prevue);
        const joursRestants = differenceInDays(dateMiseBas, maintenant);
        return { ...g, joursRestants };
      })
      .filter((g) => g.joursRestants >= 0 && g.joursRestants <= 7)
      .sort((a, b) => a.joursRestants - b.joursRestants);

    // Prochaine mise bas la plus proche
    const prochaineMiseBas = prochainesMisesBas.length > 0 ? prochainesMisesBas[0] : null;

    // Calcul du pourcentage de progression (approximation basée sur la durée moyenne de gestation de 114 jours)
    const progressionMoyenne = gestationsEnCours.length > 0
      ? gestationsEnCours.reduce((sum, g) => {
          const dateSautage = parseISO(g.date_sautage);
          const dateMiseBas = parseISO(g.date_mise_bas_prevue);
          const duree = differenceInDays(dateMiseBas, dateSautage);
          const joursEcoules = differenceInDays(maintenant, dateSautage);
          return sum + (joursEcoules / duree) * 100;
        }, 0) / gestationsEnCours.length
      : 0;

    return {
      gestationsActives: gestationsEnCours.length,
      prochainesMisesBas: prochainesMisesBas.length,
      prochaineMiseBas,
      progressionMoyenne: Math.min(100, Math.max(0, progressionMoyenne)),
    };
  }, [gestations]);

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🤰</Text>
        <Text style={styles.title}>Reproduction</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Gestations actives:</Text>
          <Text style={styles.statValue}>{reproductionData.gestationsActives}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Mises bas prévues:</Text>
          <Text style={[styles.statValue, { color: reproductionData.prochainesMisesBas > 0 ? COLORS.warning : COLORS.text }]}>
            {reproductionData.prochainesMisesBas} (dans 7 jours)
          </Text>
        </View>

        {reproductionData.prochaineMiseBas && (
          <View style={styles.nextBirthContainer}>
            <Text style={styles.nextBirthLabel}>Prochaine:</Text>
            <Text style={styles.nextBirthValue}>
              {reproductionData.prochaineMiseBas.truie_nom || `Truie ${reproductionData.prochaineMiseBas.truie_id}`}
            </Text>
            <Text style={styles.nextBirthDays}>
              dans {reproductionData.prochaineMiseBas.joursRestants} jour{reproductionData.prochaineMiseBas.joursRestants > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {reproductionData.gestationsActives > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${reproductionData.progressionMoyenne}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(reproductionData.progressionMoyenne)}% de progression moyenne
            </Text>
          </View>
        )}
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
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.text,
  },
  nextBirthContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  nextBirthLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  nextBirthValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  nextBirthDays: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    marginTop: SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
