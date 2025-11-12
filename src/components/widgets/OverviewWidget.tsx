/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux } from '../../store/slices/productionSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { differenceInMonths, parseISO } from 'date-fns';

interface OverviewWidgetProps {
  onPress?: () => void;
}

export default function OverviewWidget({ onPress }: OverviewWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { animaux } = useAppSelector((state) => state.production);
  const { mortalites } = useAppSelector((state) => state.mortalites);

  // Charger les animaux du cheptel
  useEffect(() => {
    if (projetActif) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif?.id]);

  const stats = useMemo(() => {
    if (!projetActif) return null;

    // Filtrer les animaux actifs du projet
    const animauxActifs = animaux.filter(
      (animal) => animal.projet_id === projetActif.id && animal.statut === 'actif'
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

    // Compter les truies (femelles actives)
    const truies = animauxActifs.filter((animal) => animal.sexe === 'femelle').length;

    // Compter les verrats (mâles actifs)
    const verrats = animauxActifs.filter((animal) => animal.sexe === 'male').length;

    // Compter les porcelets (animaux actifs qui ne sont pas des reproducteurs adultes)
    // Un porcelet est un animal actif qui :
    // - N'est pas marqué comme reproducteur, OU
    // - A moins de 6 mois (si date_naissance disponible)
    const porcelets = animauxActifs.filter((animal) => {
      // Si l'animal est marqué comme reproducteur, ce n'est pas un porcelet
      if (animal.reproducteur) return false;

      // Si on a une date de naissance, vérifier l'âge
      if (animal.date_naissance) {
        try {
          const dateNaissance = parseISO(animal.date_naissance);
          const ageMois = differenceInMonths(new Date(), dateNaissance);
          // Un porcelet a généralement moins de 6 mois
          return ageMois < 6;
        } catch {
          // Si la date est invalide, considérer comme porcelet si pas reproducteur
          return true;
        }
      }

      // Si pas de date de naissance et pas reproducteur, considérer comme porcelet
      return true;
    }).length;

    return {
      truies,
      verrats,
      porcelets,
    };
  }, [projetActif, animaux, mortalites]);

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
              {stats.truies}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {stats.verrats}
            </Text>
            <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {stats.porcelets}
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
