/**
 * Widget Vue d'Ensemble - Grand widget avec stats principales
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux, selectProductionUpdateCounter } from '../store/selectors/productionSelectors';
import { countAnimalsByCategory } from '../utils/animalUtils';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface WidgetVueEnsembleProps {
  onPress?: () => void;
}

function WidgetVueEnsemble({ onPress }: WidgetVueEnsembleProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { gestations } = useAppSelector((state) => state.reproduction);
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);
  const { indicateursPerformance } = useAppSelector((state) => state.reports);
  const animaux = useAppSelector(selectAllAnimaux);
  const updateCounter = useAppSelector(selectProductionUpdateCounter);

  // Charger les animaux du cheptel
  const dataChargeesRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }

    // Charger uniquement une fois par projet
    if (dataChargeesRef.current !== projetActif.id) {
      dataChargeesRef.current = projetActif.id;
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif?.id]);

  // Calculer le comptage depuis le cheptel (animaux actifs)
  const comptageAnimaux = useMemo(() => {
    const animauxActifs = animaux.filter(
      (a) => a.projet_id === projetActif?.id && a.statut?.toLowerCase() === 'actif'
    );
    return countAnimalsByCategory(animauxActifs);
  }, [animaux, projetActif?.id, updateCounter]); // Forcer la mise à jour quand les animaux changent

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
    const pourcentageUtilise =
      chargesFixesMensuelles > 0 ? (depensesMois / chargesFixesMensuelles) * 100 : 0;

    return {
      budgetMensuel: chargesFixesMensuelles,
      depensesMois,
      budgetRestant,
      pourcentageUtilise,
    };
  }, [chargesFixes, depensesPonctuelles]);

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

  if (!projetActif) return null;

  const renderTrend = (value: number) => {
    if (value > 0) return { icon: '↗️', color: colors.success };
    if (value < 0) return { icon: '↘️', color: colors.error };
    return { icon: '→', color: colors.textSecondary };
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
        <Text style={[styles.title, { color: colors.text }]}>🏠 Vue d'ensemble</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {comptageAnimaux.truies}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Truies</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {comptageAnimaux.verrats}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {comptageAnimaux.porcelets}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            📈 Performance globale
          </Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>
            {performanceGlobale.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            💰 Budget restant
          </Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>
            {budgetInfo.budgetRestant.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        {alertesMisesBas > 0 && (
          <View style={[styles.alertContainer, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.alertText, { color: colors.warning }]}>
              ⚠️ {alertesMisesBas} mise{alertesMisesBas > 1 ? 's' : ''} bas prévue
              {alertesMisesBas > 1 ? 's' : ''} cette semaine
            </Text>
          </View>
        )}
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
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
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
  },
  footerValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  alertContainer: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  alertText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

// Mémoriser le composant pour éviter les re-renders inutiles
const WidgetVueEnsembleMemoized = memo(WidgetVueEnsemble);
export default WidgetVueEnsembleMemoized;
