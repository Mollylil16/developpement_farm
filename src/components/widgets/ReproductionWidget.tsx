/**
 * Widget Reproduction pour le Dashboard
 * Affiche les gestations actives et prochaines mises bas
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllGestations } from '../../store/selectors/reproductionSelectors';
import { loadGestations, loadGestationsEnCours } from '../../store/slices/reproductionSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';

interface ReproductionWidgetProps {
  onPress?: () => void;
}

function ReproductionWidget({ onPress }: ReproductionWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const gestations = useAppSelector(selectAllGestations);

  const { projetActif } = useAppSelector((state) => state.projet);

  // Utiliser useRef pour éviter les chargements multiples (boucle infinie)
  // ❌ CORRECTION CRITIQUE: Ne PAS charger les gestations dans le widget !
  // Les gestations sont déjà chargées par GestationsListComponent
  // Charger ici cause des dispatches multiples et des boucles infinies

  /* const dataChargeesRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }
    
    if (dataChargeesRef.current === projetActif.id) return; // Déjà chargé !
    
    dataChargeesRef.current = projetActif.id;
    dispatch(loadGestations(projetActif.id));
    dispatch(loadGestationsEnCours(projetActif.id));
  }, [dispatch, projetActif?.id]); */

  // ✅ MÉMOÏSER la length pour éviter les boucles infinies
  const gestationsLength = Array.isArray(gestations) ? gestations.length : 0;

  const reproductionData = useMemo(() => {
    if (!Array.isArray(gestations)) {
      return {
        gestationsActives: 0,
        prochainesMisesBas: 0,
        prochaineMiseBas: null,
        progressionMoyenne: 0,
      };
    }

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
    const progressionMoyenne =
      gestationsEnCours.length > 0
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
  }, [gestationsLength, gestations]);

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🤰</Text>
        <Text style={[styles.title, { color: colors.text }]}>Reproduction</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Gestations actives:
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {reproductionData.gestationsActives ?? 0}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Mises bas prévues:
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  (reproductionData.prochainesMisesBas ?? 0) > 0 ? colors.warning : colors.text,
              },
            ]}
          >
            {reproductionData.prochainesMisesBas ?? 0} (dans 7 jours)
          </Text>
        </View>

        {reproductionData.prochaineMiseBas && (
          <View
            style={[styles.nextBirthContainer, { backgroundColor: colors.primaryLight + '20' }]}
          >
            <Text style={[styles.nextBirthLabel, { color: colors.textSecondary }]}>Prochaine:</Text>
            <Text style={[styles.nextBirthValue, { color: colors.primary }]}>
              {reproductionData.prochaineMiseBas.truie_nom ||
                (reproductionData.prochaineMiseBas.truie_id
                  ? `Truie ${reproductionData.prochaineMiseBas.truie_id}`
                  : 'Truie N/A')}
            </Text>
            <Text style={[styles.nextBirthDays, { color: colors.textSecondary }]}>
              {`dans ${reproductionData.prochaineMiseBas.joursRestants ?? 0} jour${(reproductionData.prochaineMiseBas.joursRestants ?? 0) > 1 ? 's' : ''}`}
            </Text>
          </View>
        )}

        {reproductionData.gestationsActives > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(reproductionData.progressionMoyenne)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
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
  nextBirthContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  nextBirthLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  nextBirthValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  nextBirthDays: {
    fontSize: FONT_SIZES.sm,
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

export default memo(ReproductionWidget);
