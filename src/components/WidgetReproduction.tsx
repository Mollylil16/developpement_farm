/**
 * Widget Reproduction - Widget informateur avec prochaines mises bas
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { joursRestantsAvantMiseBas } from '../types/reproduction';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { denormalize } from 'normalizr';
import { gestationsSchema } from '../store/normalization/schemas';
import { Gestation } from '../types';

interface WidgetReproductionProps {
  onPress?: () => void;
}

export default function WidgetReproduction({ onPress }: WidgetReproductionProps) {
  const { colors } = useTheme();
  const gestations: Gestation[] = useAppSelector((state) => {
    const { entities, ids } = state.reproduction;
    const result = denormalize(ids.gestations, gestationsSchema, { gestations: entities.gestations });
    return Array.isArray(result) ? result : [];
  });

  // Calculer les gestations en cours
  const gestationsEnCours = useMemo(
    () => gestations.filter((g: Gestation) => g.statut === 'en_cours'),
    [gestations]
  );

  // Calculer les prochaines mises bas (dans les 7 prochains jours)
  const prochainesMisesBas = useMemo(() => {
    const aujourdhui = new Date();
    const dans7Jours = new Date();
    dans7Jours.setDate(aujourdhui.getDate() + 7);

    return gestationsEnCours
      .filter((g: Gestation) => {
        const dateMiseBas = new Date(g.date_mise_bas_prevue);
        return dateMiseBas >= aujourdhui && dateMiseBas <= dans7Jours;
      })
      .sort((a: Gestation, b: Gestation) => {
        return new Date(a.date_mise_bas_prevue).getTime() - new Date(b.date_mise_bas_prevue).getTime();
      })
      .slice(0, 3); // Les 3 prochaines
  }, [gestationsEnCours]);

  // Prochaine mise bas
  const prochaineMiseBas = prochainesMisesBas[0];

  // Calculer le pourcentage de progression pour la barre
  const progressionPourcentage = useMemo(() => {
    if (!prochaineMiseBas) return 0;
    const joursRestants = joursRestantsAvantMiseBas(prochaineMiseBas.date_mise_bas_prevue);
    // Durée moyenne de gestation : 114 jours
    const joursTotal = 114;
    const joursEcoules = joursTotal - joursRestants;
    return Math.max(0, Math.min(100, (joursEcoules / joursTotal) * 100));
  }, [prochaineMiseBas]);

  // Taux de reproduction (approximation basée sur les gestations terminées)
  const tauxReproduction = useMemo(() => {
    const gestationsTerminees = gestations.filter((g: Gestation) => g.statut === 'terminee');
    if (gestationsTerminees.length === 0) return 0;
    
    const reussies = gestationsTerminees.filter((g: Gestation) => 
      (g.nombre_porcelets_reel || g.nombre_porcelets_prevu) > 0
    ).length;
    
    return gestationsTerminees.length > 0 
      ? (reussies / gestationsTerminees.length) * 100 
      : 0;
  }, [gestations]);

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
        <Text style={[styles.title, { color: colors.text }]}>🤰 Reproduction</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gestations actives:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{gestationsEnCours.length}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mises bas prévues:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {prochainesMisesBas.length} (dans les 7 prochains jours)
          </Text>
        </View>

        {prochaineMiseBas && (
          <View style={[styles.prochaineContainer, { backgroundColor: colors.info + '20' }]}>
            <Text style={[styles.prochaineLabel, { color: colors.info }]}>
              Prochaine: {prochaineMiseBas.truie_nom || `Truie ${prochaineMiseBas.truie_id}`} (dans {joursRestantsAvantMiseBas(prochaineMiseBas.date_mise_bas_prevue)} jour{joursRestantsAvantMiseBas(prochaineMiseBas.date_mise_bas_prevue) > 1 ? 's' : ''})
            </Text>
          </View>
        )}

        {prochaineMiseBas && (
          <View style={styles.progressContainer}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>📅 Calendrier des prochaines mises bas</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
              <View 
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progressionPourcentage)}%`,
                    backgroundColor: colors.primary,
                  },
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progressionPourcentage.toFixed(0)}%</Text>
          </View>
        )}

        <View style={[styles.tauxContainer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.tauxLabel, { color: colors.textSecondary }]}>Taux de reproduction:</Text>
          <Text style={[styles.tauxValue, { color: colors.primary }]}>
            {tauxReproduction.toFixed(0)}% 
            {tauxReproduction >= 80 ? ' ↗️' : tauxReproduction >= 60 ? ' →' : ' ↘️'}
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
  prochaineContainer: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  prochaineLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  tauxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  tauxLabel: {
    fontSize: FONT_SIZES.sm,
  },
  tauxValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

