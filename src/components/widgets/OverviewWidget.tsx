/**
 * Widget Vue d'Ensemble pour le Dashboard
 * Affiche les statistiques principales avec indicateurs de tendance
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
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

interface OverviewWidgetProps {
  onPress?: () => void;
}

function OverviewWidget({ onPress }: OverviewWidgetProps) {
  console.log('[OverviewWidget] ⚡ Component mounting/re-rendering - START');
  
  const { colors } = useTheme();
  console.log('[OverviewWidget] ✅ Theme loaded');
  
  const dispatch = useAppDispatch();
  console.log('[OverviewWidget] ✅ Dispatch loaded');
  
  const { projetActif } = useAppSelector((state) => state.projet);
  console.log('[OverviewWidget] ✅ Projet actif loaded:', { hasProjet: !!projetActif, projetId: projetActif?.id });
  
  const animaux = useAppSelector(selectAllAnimaux);
  console.log('[OverviewWidget] ✅ Animaux loaded:', { count: animaux?.length || 0 });
  
  const mortalites = useAppSelector(selectAllMortalites);
  console.log('[OverviewWidget] ✅ Mortalites loaded:', { count: mortalites?.length || 0 });
  
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  console.log('[OverviewWidget] ✅ Pesees par animal loaded:', { keysCount: Object.keys(peseesParAnimal || {}).length });
  
  const peseesRecents = useAppSelector(selectPeseesRecents);
  console.log('[OverviewWidget] ✅ Pesees recents loaded:', { count: peseesRecents?.length || 0 });
  
  const updateCounter = useAppSelector(selectProductionUpdateCounter);
  console.log('[OverviewWidget] ✅ Update counter loaded:', updateCounter);
  
  console.log('[OverviewWidget] ✅ All hooks loaded successfully');

  // Utiliser useRef pour éviter les chargements multiples (boucle infinie)
  const dataChargeesRef = React.useRef<string | null>(null);

  // Charger les animaux du cheptel (une seule fois par projet)
  useEffect(() => {
    console.log('[OverviewWidget] useEffect triggered:', { projetId: projetActif?.id, dataChargeesRef: dataChargeesRef.current });
    
    if (!projetActif?.id) {
      console.log('[OverviewWidget] No projet actif, resetting ref');
      dataChargeesRef.current = null;
      return;
    }

    if (dataChargeesRef.current === projetActif.id) {
      console.log('[OverviewWidget] Data already loaded for projet:', projetActif.id);
      return; // Déjà chargé !
    }

    console.log('[OverviewWidget] Loading data for projet:', projetActif.id);
    dataChargeesRef.current = projetActif.id;
    
    // Dispatcher en parallèle pour meilleure performance
    Promise.all([
      dispatch(loadProductionAnimaux({ projetId: projetActif.id })),
      dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })), // Limité à 20 pesées récentes (suffisant pour stats)
    ]).catch((error) => {
      console.error('[OverviewWidget] Erreur lors du chargement des données:', error);
    });
  }, [dispatch, projetActif?.id]);

  // Pré-filtrer les données une seule fois pour optimiser les calculs
  const animauxActifsProjet = useMemo(() => {
    console.log('[OverviewWidget] Computing animauxActifsProjet');
    try {
      if (!projetActif) {
        console.log('[OverviewWidget] No projet actif, returning empty array');
        return [];
      }
      const filtered = animaux.filter(
        (animal) => animal.projet_id === projetActif.id && animal.statut?.toLowerCase() === 'actif'
      );
      console.log('[OverviewWidget] Filtered animaux:', { count: filtered.length });
      return filtered;
    } catch (error) {
      console.error('[OverviewWidget] Error in animauxActifsProjet useMemo:', error);
      return [];
    }
  }, [animaux, projetActif?.id]);

  const mortalitesProjet = useMemo(() => {
    console.log('[OverviewWidget] Computing mortalitesProjet');
    try {
      if (!projetActif) return [];
      const filtered = mortalites.filter((m) => m.projet_id === projetActif.id);
      console.log('[OverviewWidget] Filtered mortalites:', { count: filtered.length });
      return filtered;
    } catch (error) {
      console.error('[OverviewWidget] Error in mortalitesProjet useMemo:', error);
      return [];
    }
  }, [mortalites, projetActif?.id]);

  // Pré-formater les pesées une seule fois
  const peseesFormatted = useMemo(() => {
    console.log('[OverviewWidget] Computing peseesFormatted');
    try {
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

      console.log('[OverviewWidget] Formatted pesees:', { keysCount: Object.keys(formatted).length });
      return formatted;
    } catch (error) {
      console.error('[OverviewWidget] Error in peseesFormatted useMemo:', error);
      return {};
    }
  }, [peseesParAnimal, peseesRecents]);

  const stats = useMemo(() => {
    console.log('[OverviewWidget] Computing stats');
    try {
      if (!projetActif) {
        console.log('[OverviewWidget] No projet actif, stats = null');
        return null;
      }

      const hasAnimauxActifs = animauxActifsProjet.length > 0;
      console.log('[OverviewWidget] Has animaux actifs:', hasAnimauxActifs);

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

      const statsResult = {
        // Catégories reproducteurs
        truies: categoriesReproducteurs.truies,
        verrats: categoriesReproducteurs.verrats,
        // Catégories de poids (pour les non-reproducteurs uniquement)
        porcelets: categoriesPoids.porcelets, // 7-25kg
        croissance: categoriesPoids.croissance, // 25-60kg
        finition: categoriesPoids.finition, // >60kg
      };
      console.log('[OverviewWidget] Stats computed:', statsResult);
      return statsResult;
    } catch (error) {
      console.error('[OverviewWidget] Error in stats useMemo:', error);
      return null;
    }
  }, [
    projetActif,
    animauxActifsProjet,
    mortalitesProjet,
    peseesFormatted,
    updateCounter, // Forcer la mise à jour quand les animaux changent
  ]);

  console.log('[OverviewWidget] Before render check:', { hasStats: !!stats, hasProjet: !!projetActif });
  
  if (!stats || !projetActif) {
    console.log('[OverviewWidget] Returning null (no stats or projet)');
    return null;
  }

  console.log('[OverviewWidget] Creating WidgetContent');
  let WidgetContent;
  
  try {
    WidgetContent = (
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
  } catch (error) {
    console.error('[OverviewWidget] Error creating WidgetContent:', error);
    return null;
  }

  console.log('[OverviewWidget] WidgetContent created, rendering with onPress:', !!onPress);

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

export default OverviewWidget;
