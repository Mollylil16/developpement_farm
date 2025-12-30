/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadPeseesRecents } from '../../store/slices/productionSlice';
import { useLoadAnimauxOnMount } from '../../hooks/useLoadAnimauxOnMount';
import { 
  selectAllAnimaux, 
  selectPeseesRecents, 
  selectProductionUpdateCounter 
} from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { countAnimalsByCategory, countAnimalsByPoidsCategory } from '../../utils/animalUtils';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { logger } from '../../utils/logger';

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
  const updateCounter = useAppSelector(selectProductionUpdateCounter);

  // Charger les animaux au montage (hook centralisé)
  useLoadAnimauxOnMount();

  // Charger les pesées récentes (une seule fois par projet)
  const peseesChargeesRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!projetActif?.id) {
      peseesChargeesRef.current = null;
      return;
    }

    if (peseesChargeesRef.current === projetActif.id) {
      return; // Déjà chargé !
    }

    peseesChargeesRef.current = projetActif.id;
    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).catch((error) => {
      logger.error('[OverviewWidget] Erreur lors du chargement des pesées:', error);
    });
  }, [dispatch, projetActif?.id]);

  // Pré-filtrer les données une seule fois pour optimiser les calculs
  const animauxActifsProjet = useMemo(() => {
    if (!projetActif) {
      return [];
    }
    return animaux.filter(
      (animal) => animal.projet_id === projetActif.id && animal.statut?.toLowerCase() === 'actif'
    );
  }, [animaux, projetActif?.id]);

  const mortalitesProjet = useMemo(() => {
    if (!projetActif) return [];
    return mortalites.filter((m) => m.projet_id === projetActif.id);
  }, [mortalites, projetActif?.id]);

  // Pré-formater les pesées une seule fois (optimisé pour éviter les recalculs inutiles)
  const peseesFormatted = useMemo(() => {
    // Si peseesParAnimal est déjà complet, l'utiliser directement
    if (Object.keys(peseesParAnimal).length > 0 && peseesRecents.length === 0) {
      const formatted: Record<string, Array<{ date: string; poids_kg: number }>> = {};
      Object.keys(peseesParAnimal).forEach((animalId) => {
        formatted[animalId] = peseesParAnimal[animalId].map((pesee) => ({
          date: pesee.date,
          poids_kg: pesee.poids_kg,
        }));
      });
      return formatted;
    }

    const formatted: Record<string, Array<{ date: string; poids_kg: number }>> = {};

    // D'abord, utiliser peseesParAnimal si disponible
    Object.keys(peseesParAnimal).forEach((animalId) => {
      formatted[animalId] = peseesParAnimal[animalId].map((pesee) => ({
        date: pesee.date,
        poids_kg: pesee.poids_kg,
      }));
    });

    // Ensuite, compléter avec les pesées récentes pour les animaux qui n'ont pas encore de pesées chargées
    // Utiliser un Set pour éviter les doublons plus efficacement
    const seen = new Set<string>();
    peseesRecents.forEach((pesee) => {
      const key = `${pesee.animal_id}_${pesee.date}_${pesee.poids_kg}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (!formatted[pesee.animal_id]) {
          formatted[pesee.animal_id] = [];
        }
        formatted[pesee.animal_id].push({
          date: pesee.date,
          poids_kg: pesee.poids_kg,
        });
      }
    });

    return formatted;
  }, [peseesParAnimal, peseesRecents]);

  const stats = useMemo(() => {
    if (!projetActif) {
      return null;
    }

const hasAnimauxActifs = animauxActifsProjet.length > 0;

    // Calculer les catégories reproducteurs (Truies, Verrats, Porcelets)
    let categoriesReproducteurs = { truies: 0, verrats: 0, porcelets: 0 };
    if (hasAnimauxActifs) {
      categoriesReproducteurs = countAnimalsByCategory(animauxActifsProjet);
    } else {
      // Fallback: utiliser les données initiales du projet
      // Utiliser un objet temporaire pour éviter les multiples filtres
      const mortalitesByCategorie: Record<string, number> = {};
      mortalitesProjet.forEach((m) => {
        if (!mortalitesByCategorie[m.categorie]) {
          mortalitesByCategorie[m.categorie] = 0;
        }
        mortalitesByCategorie[m.categorie] += m.nombre_porcs || 0;
      });

      categoriesReproducteurs = {
        truies: Math.max(0, (projetActif.nombre_truies ?? 0) - (mortalitesByCategorie.truie || 0)),
        verrats: Math.max(0, (projetActif.nombre_verrats ?? 0) - (mortalitesByCategorie.verrat || 0)),
        porcelets: Math.max(0, (projetActif.nombre_porcelets ?? 0) - (mortalitesByCategorie.porcelet || 0)),
      };
    }

    // Calculer les catégories de poids (Porcelets, Croissance, Finition) pour les non-reproducteurs
    let categoriesPoids = { porcelets: 0, croissance: 0, finition: 0 };
    if (hasAnimauxActifs) {
      categoriesPoids = countAnimalsByPoidsCategory(animauxActifsProjet, peseesFormatted);
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
    projetActif,
    animauxActifsProjet,
    mortalitesProjet,
    peseesFormatted,
    updateCounter, // Forcer la mise à jour quand les animaux changent
  ]);

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
