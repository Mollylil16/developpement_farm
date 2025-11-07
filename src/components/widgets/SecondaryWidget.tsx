/**
 * Widgets secondaires compacts pour le Dashboard
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadRations } from '../../store/slices/nutritionSlice';
import { loadPlanificationsAVenir } from '../../store/slices/planificationSlice';
import { loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import { loadMortalitesParProjet } from '../../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { startOfMonth, parseISO, isAfter } from 'date-fns';

interface SecondaryWidgetProps {
  type: 'nutrition' | 'planning' | 'collaboration' | 'mortalites' | 'production';
  onPress?: () => void;
}

export default function SecondaryWidget({ type, onPress }: SecondaryWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { rations } = useAppSelector((state) => state.nutrition);
  const { planifications } = useAppSelector((state) => state.planification);
  const { collaborateurs } = useAppSelector((state) => state.collaboration);
  const { mortalites } = useAppSelector((state) => state.mortalites);
  const { animaux, peseesRecents } = useAppSelector((state) => state.production);

  useEffect(() => {
    if (!projetActif) return;

    switch (type) {
      case 'nutrition':
        dispatch(loadRations());
        break;
      case 'planning':
        dispatch(loadPlanificationsAVenir({ projetId: projetActif.id }));
        break;
      case 'collaboration':
        dispatch(loadCollaborateursParProjet(projetActif.id));
        break;
      case 'mortalites':
        dispatch(loadMortalitesParProjet(projetActif.id));
        break;
      case 'production':
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
        dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
        break;
    }
  }, [dispatch, projetActif, type]);

  const widgetData = useMemo(() => {
    if (!projetActif) return null;

    switch (type) {
      case 'nutrition':
        const rationsCeMois = rations.filter((r) => {
          const dateRation = parseISO(r.date_creation);
          const debutMois = startOfMonth(new Date());
          return isAfter(dateRation, debutMois);
        });
        return {
          emoji: '🥗',
          title: 'Nutrition',
          primary: rations.length,
          secondary: rationsCeMois.length,
          labelPrimary: 'Rations',
          labelSecondary: 'Ce mois',
        };

      case 'planning':
        const tachesAFaire = planifications.filter((p) => p.statut === 'a_faire');
        return {
          emoji: '📅',
          title: 'Planning',
          primary: planifications.length,
          secondary: tachesAFaire.length,
          labelPrimary: 'Tâches',
          labelSecondary: 'À faire',
        };

      case 'collaboration':
        const collaborateursActifs = collaborateurs.filter((c) => c.statut === 'actif');
        return {
          emoji: '👥',
          title: 'Collaboration',
          primary: collaborateurs.length,
          secondary: collaborateursActifs.length,
          labelPrimary: 'Membres',
          labelSecondary: 'Actifs',
        };

      case 'mortalites':
        const mortalitesCeMois = mortalites.filter((m) => {
          const dateMortalite = parseISO(m.date);
          const debutMois = startOfMonth(new Date());
          return isAfter(dateMortalite, debutMois);
        });
        return {
          emoji: '💀',
          title: 'Mortalités',
          primary: mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0),
          secondary: mortalitesCeMois.reduce((sum, m) => sum + m.nombre_porcs, 0),
          labelPrimary: 'Total',
          labelSecondary: 'Ce mois',
        };

      case 'production':
        const animauxActifs = animaux.filter((a) => a.actif);
        return {
          emoji: '🐷',
          title: 'Production',
          primary: animauxActifs.length,
          secondary: peseesRecents.length,
          labelPrimary: 'Animaux',
          labelSecondary: 'Pesées',
        };

      default:
        return null;
    }
  }, [type, rations, planifications, collaborateurs, mortalites, animaux, peseesRecents, projetActif]);

  if (!widgetData) {
    return null;
  }

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{widgetData.emoji}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{widgetData.title}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{widgetData.primary}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{widgetData.labelPrimary}</Text>
        </View>
        <View style={[styles.dividerVertical, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{widgetData.secondary}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{widgetData.labelSecondary}</Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Card elevation="small" padding="medium">
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="small" padding="medium">
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
    marginBottom: SPACING.sm,
  },
  emoji: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  dividerVertical: {
    width: 1,
    height: 40,
  },
});

