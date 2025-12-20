/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { selectPeseesRecents } from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { differenceInMonths, parseISO } from 'date-fns';
import { countAnimalsByCategory, countAnimalsByPoidsCategory } from '../../utils/animalUtils';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { SafeTextWrapper } from '../../utils/textRenderingGuard';

interface OverviewWidgetProps {
  onPress?: () => void;
}

function OverviewWidget({ onPress }: OverviewWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const mortalites = useAppSelector(selectAllMortalites);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const peseesRecents = useAppSelector(selectPeseesRecents);

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
    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 100 })); // Charger plus de pesées pour le calcul des catégories
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

    // Calculer les catégories reproducteurs (Truies, Verrats, Porcelets)
    let categoriesReproducteurs = { truies: 0, verrats: 0, porcelets: 0 };
    if (hasAnimauxActifs) {
      categoriesReproducteurs = countAnimalsByCategory(animauxActifs);
    } else {
      // Fallback: utiliser les données initiales du projet
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

      categoriesReproducteurs = {
        truies: Math.max(0, (projetActif.nombre_truies ?? 0) - mortalitesTruies),
        verrats: Math.max(0, (projetActif.nombre_verrats ?? 0) - mortalitesVerrats),
        porcelets: Math.max(0, (projetActif.nombre_porcelets ?? 0) - mortalitesPorcelets),
      };
    }

    // Calculer les catégories de poids (Porcelets, Croissance, Finition) pour les non-reproducteurs
    let categoriesPoids = { porcelets: 0, croissance: 0, finition: 0 };
    if (hasAnimauxActifs) {
      // Convertir peseesParAnimal au format attendu par countAnimalsByPoidsCategory
      const peseesFormatted: Record<string, Array<{ date: string; poids_kg: number }>> = {};

      // D'abord, utiliser peseesParAnimal si disponible
      Object.keys(peseesParAnimal).forEach((animalId) => {
        peseesFormatted[animalId] = peseesParAnimal[animalId].map((pesee) => ({
          date: pesee.date,
          poids_kg: pesee.poids_kg,
        }));
      });

      // Ensuite, compléter avec les pesées récentes pour les animaux qui n'ont pas encore de pesées chargées
      peseesRecents.forEach((pesee) => {
        if (!peseesFormatted[pesee.animal_id]) {
          peseesFormatted[pesee.animal_id] = [];
        }
        // Ajouter seulement si pas déjà présent (éviter les doublons)
        const existe = peseesFormatted[pesee.animal_id].some(
          (p) => p.date === pesee.date && p.poids_kg === pesee.poids_kg
        );
        if (!existe) {
          peseesFormatted[pesee.animal_id].push({
            date: pesee.date,
            poids_kg: pesee.poids_kg,
          });
        }
      });

      categoriesPoids = countAnimalsByPoidsCategory(animauxActifs, peseesFormatted);
    } else {
      // Fallback: utiliser les données initiales du projet
      categoriesPoids = {
        porcelets: projetActif.nombre_porcelets ?? 0,
        croissance: projetActif.nombre_croissance ?? 0,
        finition: 0,
      };
    }

    return {
      // Catégories reproducteurs
      truies: categoriesReproducteurs.truies,
      verrats: categoriesReproducteurs.verrats,
      // Catégories de poids (pour les non-reproducteurs uniquement)
      porcelets: categoriesPoids.porcelets, // 7-25kg
      croissance: categoriesPoids.croissance, // 25-60kg
      finition: categoriesPoids.finition, // >60kg
    };
  }, [
    projetActif?.id,
    animauxLength,
    mortalitesLength,
    animaux,
    mortalites,
    peseesParAnimal,
    peseesRecents,
  ]);

  if (!stats || !projetActif) {
    return null;
  }

  const WidgetContent = (
    <SafeTextWrapper componentName="OverviewWidget">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🏠</Text>
          <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Section Reproducteurs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Reproducteurs</Text>
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
          </View>
        </View>

        {/* Section Production (basée sur le poids) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Production</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {stats.porcelets ?? 0}
                </Text>
                <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Croissance</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.croissance ?? 0}
                </Text>
                <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Finition</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: colors.secondary }]}>
                  {stats.finition ?? 0}
                </Text>
                <Text style={[styles.trend, { color: colors.textSecondary }]}>→</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeTextWrapper>
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
