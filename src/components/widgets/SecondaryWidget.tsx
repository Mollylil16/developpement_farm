/**
 * Widgets secondaires compacts pour le Dashboard
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadRations, loadRationsBudget } from '../../store/slices/nutritionSlice';
import { loadPlanificationsAVenir } from '../../store/slices/planificationSlice';
import { loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import { loadMortalitesParProjet } from '../../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import { loadVaccinations, loadMaladies } from '../../store/slices/santeSlice';
import { selectAllAnimaux, selectPeseesRecents } from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { selectAllVaccinations, selectAllMaladies } from '../../store/selectors/santeSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { startOfMonth, parseISO, isAfter } from 'date-fns';
import { Mortalite } from '../../types';

interface SecondaryWidgetProps {
  type: 'nutrition' | 'planning' | 'collaboration' | 'mortalites' | 'production' | 'sante';
  onPress?: () => void;
}

function SecondaryWidget({ type, onPress }: SecondaryWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { rations, rationsBudget } = useAppSelector((state) => state.nutrition);
  const { planifications } = useAppSelector((state) => state.planification);
  const { collaborateurs } = useAppSelector((state) => state.collaboration);
  const mortalites = useAppSelector(selectAllMortalites);
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const vaccinations = useAppSelector(selectAllVaccinations);
  const maladies = useAppSelector(selectAllMaladies);

  // Utiliser useRef pour éviter les chargements multiples (boucle infinie)
  const dataChargeesRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `${projetActif.id}-${type}`;
    if (dataChargeesRef.current === cle) return; // Déjà chargé !
    
    dataChargeesRef.current = cle;

    switch (type) {
      case 'sante':
        dispatch(loadVaccinations(projetActif.id));
        dispatch(loadMaladies(projetActif.id));
        break;
      case 'nutrition':
        dispatch(loadRations(projetActif.id));
        dispatch(loadRationsBudget(projetActif.id));
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
  }, [dispatch, projetActif?.id, type]);

  // ✅ MÉMOÏSER les lengths pour éviter les boucles infinies causées par les arrays
  const vaccinationsLength = vaccinations.length;
  const maladiesLength = maladies.length;
  const rationsLength = rations.length;
  const rationsBudgetLength = rationsBudget.length;
  const planificationsLength = planifications.length;
  const collaborateursLength = collaborateurs.length;
  const mortalitesLength = mortalites.length;
  const animauxLength = animaux.length;
  const peseesRecentsLength = (peseesRecents as any[]).length;

  const widgetData = useMemo(() => {
    if (!projetActif) return null;

    switch (type) {
      case 'sante':
        const maladiesEnCours = maladies.filter((m: any) => !m.date_fin || m.date_fin === '');
        return {
          emoji: '🏥',
          title: 'Santé',
          primary: vaccinationsLength,
          secondary: maladiesEnCours.length,
          labelPrimary: 'Vaccins',
          labelSecondary: 'Maladies',
        };

      case 'nutrition':
        // Combiner les rations et les rations budget
        const toutesLesRations = [...rations, ...rationsBudget];
        const rationsCeMois = toutesLesRations.filter((r) => {
          const dateRation = parseISO(r.date_creation);
          const debutMois = startOfMonth(new Date());
          return isAfter(dateRation, debutMois);
        });
        return {
          emoji: '🥗',
          title: 'Nutrition',
          primary: toutesLesRations.length,
          secondary: rationsCeMois.length,
          labelPrimary: 'Rations',
          labelSecondary: 'Ce mois',
        };

      case 'planning':
        const tachesAFaire = planifications.filter((p) => p.statut === 'a_faire');
        return {
          emoji: '📅',
          title: 'Planning',
          primary: planificationsLength,
          secondary: tachesAFaire.length,
          labelPrimary: 'Tâches',
          labelSecondary: 'À faire',
        };

      case 'collaboration':
        const collaborateursActifs = collaborateurs.filter((c) => c.statut === 'actif');
        return {
          emoji: '👥',
          title: 'Collaboration',
          primary: collaborateursLength,
          secondary: collaborateursActifs.length,
          labelPrimary: 'Membres',
          labelSecondary: 'Actifs',
        };

      case 'mortalites':
        const mortalitesCeMois = mortalites.filter((m: Mortalite) => {
          const dateMortalite = parseISO(m.date);
          const debutMois = startOfMonth(new Date());
          return isAfter(dateMortalite, debutMois);
        });
        return {
          emoji: '💀',
          title: 'Mortalités',
          primary: mortalites.reduce((sum: number, m: Mortalite) => sum + m.nombre_porcs, 0),
          secondary: mortalitesCeMois.reduce((sum: number, m: Mortalite) => sum + m.nombre_porcs, 0),
          labelPrimary: 'Total',
          labelSecondary: 'Ce mois',
        };

      case 'production':
        const animauxActifs = (animaux as any[]).filter((a: any) => a.statut?.toLowerCase() === 'actif');
        return {
          emoji: '🐷',
          title: 'Production',
          primary: animauxActifs.length,
          secondary: peseesRecentsLength,
          labelPrimary: 'Animaux',
          labelSecondary: 'Pesées',
        };

      default:
        return null;
    }
  }, [type, vaccinationsLength, maladiesLength, rationsLength, rationsBudgetLength, planificationsLength, collaborateursLength, mortalitesLength, animauxLength, peseesRecentsLength, projetActif?.id, vaccinations, maladies, rations, rationsBudget, planifications, collaborateurs, mortalites, animaux, peseesRecents]);

  if (!widgetData) {
    return null;
  }
  
  console.log('[DEBUG SecondaryWidget]', type, {
    emoji: widgetData.emoji,
    title: widgetData.title,
    labelPrimary: widgetData.labelPrimary,
    labelSecondary: widgetData.labelSecondary,
    primary: widgetData.primary,
    secondary: widgetData.secondary
  });

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{widgetData.emoji || '📊'}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{widgetData.title || 'Widget'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {widgetData.primary !== undefined && widgetData.primary !== null ? widgetData.primary : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {widgetData.labelPrimary || 'Total'}
          </Text>
        </View>
        <View style={[styles.dividerVertical, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {widgetData.secondary !== undefined && widgetData.secondary !== null ? widgetData.secondary : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {widgetData.labelSecondary || '-'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Card elevation="small" padding="medium" neomorphism={true}>
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="small" padding="medium" neomorphism={true}>
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

export default memo(SecondaryWidget);

