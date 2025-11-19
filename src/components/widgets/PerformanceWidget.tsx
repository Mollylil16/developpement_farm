/**
 * Widget Performance pour le Dashboard
 * Affiche les indicateurs de performance clés
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { loadMortalitesParProjet } from '../../store/slices/mortalitesSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';

interface PerformanceWidgetProps {
  onPress?: () => void;
}

function PerformanceWidget({ onPress }: PerformanceWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const mortalites = useAppSelector(selectAllMortalites);
  const { indicateursPerformance } = useAppSelector((state) => state.reports);

  // Utiliser useRef pour éviter les chargements multiples (boucle infinie)
  const dataChargeesRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }
    
    if (dataChargeesRef.current === projetActif.id) return; // Déjà chargé !
    
    dataChargeesRef.current = projetActif.id;
    dispatch(loadMortalitesParProjet(projetActif.id));
  }, [dispatch, projetActif?.id]);

  // ✅ MÉMOÏSER les valeurs calculées des mortalités pour éviter les boucles infinies
  const totalMorts = useMemo(() => 
    Array.isArray(mortalites) 
      ? mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 0), 0) 
      : 0,
    [mortalites.length]  // ✅ Utiliser .length au lieu de l'array complet
  );

  const performanceData = useMemo(() => {
    if (!projetActif) return null;

    const nombrePorcsTotal =
      projetActif.nombre_truies +
      projetActif.nombre_verrats +
      projetActif.nombre_porcelets;

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
  }, [projetActif?.id, totalMorts, indicateursPerformance?.taux_croissance, indicateursPerformance?.cout_production_kg]);

  if (!performanceData) {
    return null;
  }

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={[styles.title, { color: colors.text }]}>Performance</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.content}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Performance globale:</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {performanceData.performanceGlobale ?? 0}%
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taux de mortalité:</Text>
          <View style={styles.statValueRow}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    (performanceData.tauxMortalite ?? 0) < 5
                      ? colors.success
                      : (performanceData.tauxMortalite ?? 0) < 10
                      ? colors.warning
                      : colors.error,
                },
              ]}
            >
              {performanceData.tauxMortalite ?? 0}%
            </Text>
            {(performanceData.tauxMortalite ?? 0) < 5 && <Text style={styles.checkmark}>✅</Text>}
          </View>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coût de production:</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {performanceData.coutProduction ?? 0} FCFA/kg
          </Text>
        </View>

        <View style={[styles.tendanceContainer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.tendanceLabel, { color: colors.textSecondary }]}>Tendance:</Text>
          <Text
            style={[
              styles.tendanceValue,
              {
                color:
                  performanceData.tendance === 'positive'
                    ? colors.success
                    : performanceData.tendance === 'negative'
                    ? colors.error
                    : colors.warning,
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
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tendanceLabel: {
    fontSize: FONT_SIZES.md,
  },
  tendanceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

export default memo(PerformanceWidget);

