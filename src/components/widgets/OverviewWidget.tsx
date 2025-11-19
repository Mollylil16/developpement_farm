/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux } from '../../store/slices/productionSlice';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { differenceInMonths, parseISO } from 'date-fns';
import { countAnimalsByCategory } from '../../utils/animalUtils';

interface OverviewWidgetProps {
  onPress?: () => void;
}

function OverviewWidget({ onPress }: OverviewWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const mortalites = useAppSelector(selectAllMortalites);

  // Utiliser useRef pour éviter les chargements multiples (boucle infinie)
  const dataChargeesRef = React.useRef<string | null>(null);

  // Charger les animaux du cheptel (une seule fois par projet)
  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }
    
    if (dataChargeesRef.current === projetActif.id) return; // Déjà chargé !
    
    dataChargeesRef.current = projetActif.id;
    dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
  }, [dispatch, projetActif?.id]);

  // ✅ MÉMOÏSER les lengths pour éviter les boucles infinies
  const animauxLength = animaux.length;
  const mortalitesLength = mortalites.length;

  const stats = useMemo(() => {
    if (!projetActif) return null;

    // Filtrer les animaux actifs du projet (insensible à la casse)
    const animauxActifs = animaux.filter(
      (animal) => animal.projet_id === projetActif.id && animal.statut?.toLowerCase() === 'actif'
    );

    const hasAnimauxActifs = animauxActifs.length > 0;

    // Préparer les effectifs basés sur les données initiales et les mortalités
    const baseCounts = {
      truies: projetActif.nombre_truies ?? 0,
      verrats: projetActif.nombre_verrats ?? 0,
      porcelets: projetActif.nombre_porcelets ?? 0,
    };

    const mortalitesProjet = mortalites.filter((m) => m.projet_id === projetActif.id);
    const mortalitesTruies = mortalitesProjet
      .filter((m) => m.categorie === 'truie')
      .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    const mortalitesVerrats = mortalitesProjet
      .filter((m) => m.categorie === 'verrat')
      .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    const mortalitesPorcelets = mortalitesProjet
      .filter((m) => m.categorie === 'porcelet')
      .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);

    const fallbackCounts = {
      truies: Math.max(0, baseCounts.truies - mortalitesTruies),
      verrats: Math.max(0, baseCounts.verrats - mortalitesVerrats),
      porcelets: Math.max(0, baseCounts.porcelets - mortalitesPorcelets),
    };

    if (!hasAnimauxActifs) {
      return fallbackCounts;
    }

    // Utiliser la fonction utilitaire pour compter les animaux par catégorie
    return countAnimalsByCategory(animauxActifs);
  }, [projetActif?.id, animauxLength, mortalitesLength, animaux, mortalites]);

  if (!stats || !projetActif) {
    return null;
  }

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🏠</Text>
        <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Truies</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.truies ?? 0}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {stats.verrats ?? 0}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {stats.porcelets ?? 0}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  trend: {
    fontSize: FONT_SIZES.md,
    marginLeft: SPACING.xs,
  },
});

export default memo(OverviewWidget);
