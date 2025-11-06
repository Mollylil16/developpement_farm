/**
 * Widget Reproduction - Widget informateur avec prochaines mises bas
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { joursRestantsAvantMiseBas } from '../types/reproduction';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface WidgetReproductionProps {
  onPress?: () => void;
}

export default function WidgetReproduction({ onPress }: WidgetReproductionProps) {
  const { gestations } = useAppSelector((state) => state.reproduction);

  // Calculer les gestations en cours
  const gestationsEnCours = useMemo(
    () => gestations.filter((g) => g.statut === 'en_cours'),
    [gestations]
  );

  // Calculer les prochaines mises bas (dans les 7 prochains jours)
  const prochainesMisesBas = useMemo(() => {
    const aujourdhui = new Date();
    const dans7Jours = new Date();
    dans7Jours.setDate(aujourdhui.getDate() + 7);

    return gestationsEnCours
      .filter((g) => {
        const dateMiseBas = new Date(g.date_mise_bas_prevue);
        return dateMiseBas >= aujourdhui && dateMiseBas <= dans7Jours;
      })
      .sort((a, b) => {
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
    const gestationsTerminees = gestations.filter((g) => g.statut === 'terminee');
    if (gestationsTerminees.length === 0) return 0;
    
    const reussies = gestationsTerminees.filter((g) => 
      (g.nombre_porcelets_reel || g.nombre_porcelets_prevu) > 0
    ).length;
    
    return gestationsTerminees.length > 0 
      ? (reussies / gestationsTerminees.length) * 100 
      : 0;
  }, [gestations]);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🤰 Reproduction</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Gestations actives:</Text>
          <Text style={styles.statValue}>{gestationsEnCours.length}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Mises bas prévues:</Text>
          <Text style={styles.statValue}>
            {prochainesMisesBas.length} (dans les 7 prochains jours)
          </Text>
        </View>

        {prochaineMiseBas && (
          <View style={styles.prochaineContainer}>
            <Text style={styles.prochaineLabel}>
              Prochaine: Truie #{prochaineMiseBas.numero_truie} (dans {joursRestantsAvantMiseBas(prochaineMiseBas.date_mise_bas_prevue)} jour{joursRestantsAvantMiseBas(prochaineMiseBas.date_mise_bas_prevue) > 1 ? 's' : ''})
            </Text>
          </View>
        )}

        {prochaineMiseBas && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>📅 Calendrier des prochaines mises bas</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressionPourcentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{progressionPourcentage.toFixed(0)}%</Text>
          </View>
        )}

        <View style={styles.tauxContainer}>
          <Text style={styles.tauxLabel}>Taux de reproduction:</Text>
          <Text style={styles.tauxValue}>
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
  prochaineContainer: {
    backgroundColor: COLORS.info + '20',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  prochaineLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
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
    borderTopColor: COLORS.divider,
  },
  tauxLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tauxValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
});

