/**
 * Composant pour afficher les statistiques du cheptel actif
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { 
  selectPeseesParAnimal, 
  selectProductionUpdateCounter 
} from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';
import { useLoadAnimauxOnMount } from '../../hooks/useLoadAnimauxOnMount';

const TAUX_CARCASSE = 0.75; // 75% du poids vif

function LivestockStatsCard() {
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const updateCounter = useAppSelector(selectProductionUpdateCounter);
  const { animauxActifs } = useAnimauxActifs({ projetId: projetActif?.id });

  // Charger les animaux au montage (hook centralisé)
  useLoadAnimauxOnMount();

  const statsCheptel = React.useMemo(() => {
    if (!projetActif) {
      return {
        nombreAnimaux: 0,
        poidsTotal: 0,
        poidsCarcasse: 0,
        poidsMoyen: 0,
      };
    }

    const poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );

    const nombreAnimaux = animauxActifs.length;
    const poidsCarcasse = poidsTotal * TAUX_CARCASSE;
    const poidsMoyen = nombreAnimaux > 0 ? poidsTotal / nombreAnimaux : 0;

    return {
      nombreAnimaux,
      poidsTotal,
      poidsCarcasse,
      poidsMoyen,
    };
  }, [animauxActifs, peseesParAnimal, projetActif, updateCounter]); // Forcer la mise à jour quand les animaux changent

  if (!projetActif) return null;

  return (
    <Card style={StyleSheet.flatten([styles.statsCard, { backgroundColor: colors.surface }])}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Statistiques du cheptel actif
      </Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nombre d'animaux</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.nombreAnimaux}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids total vif</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsTotal.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Poids total carcasse
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsCarcasse.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Poids moyen/animal
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsMoyen.toFixed(1)} kg
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

// Mémoriser le composant pour éviter les re-renders inutiles
const LivestockStatsCardMemoized = memo(LivestockStatsCard);
export default LivestockStatsCardMemoized;
