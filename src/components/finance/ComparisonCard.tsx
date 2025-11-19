/**
 * Composant pour la comparaison des options de vente et recommandations
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';

const TAUX_CARCASSE = 0.75;
const PRIX_KG_VIF_DEFAUT = 1000;
const PRIX_KG_CARCASSE_DEFAUT = 1300;

export default function ComparisonCard() {
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const { animauxActifs } = useAnimauxActifs({ projetId: projetActif?.id });

  const comparaisonOptions = React.useMemo(() => {
    if (!projetActif) {
      return {
        difference: 0,
        pourcentageDifference: 0,
        meilleureOption: 'vif' as const,
      };
    }

    const poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );

    const prixKgVif = projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT;
    const prixKgCarcasse = projetActif.prix_kg_carcasse || PRIX_KG_CARCASSE_DEFAUT;

    const revenuVifInitial = poidsTotal * prixKgVif;
    const poidsCarcasse = poidsTotal * TAUX_CARCASSE;
    const revenuCarcasseInitial = poidsCarcasse * prixKgCarcasse;

    const difference = revenuCarcasseInitial - revenuVifInitial;
    const pourcentageDifference = revenuVifInitial > 0 
      ? (difference / revenuVifInitial) * 100 
      : 0;

    return {
      difference,
      pourcentageDifference,
      meilleureOption: difference > 0 ? 'carcasse' as const : 'vif' as const,
    };
  }, [animauxActifs, peseesParAnimal, projetActif]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!projetActif) return null;

  const revenuVifInitial = React.useMemo(() => {
    const poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );
    return poidsTotal * (projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT);
  }, [animauxActifs, peseesParAnimal, projetActif]);

  if (revenuVifInitial === 0) return null;

  return (
    <Card style={StyleSheet.flatten([styles.comparisonCard, { backgroundColor: colors.surface }])}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Comparaison des options</Text>
      <View style={styles.comparisonContent}>
        <View style={styles.comparisonRow}>
          <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
            Différence (Carcasse - Vif):
          </Text>
          <Text
            style={[
              styles.comparisonValue,
              {
                color: comparaisonOptions.difference >= 0 ? colors.success : colors.error,
                fontWeight: 'bold',
              },
            ]}
          >
            {comparaisonOptions.difference >= 0 ? '+' : ''}
            {formatAmount(comparaisonOptions.difference)} ({comparaisonOptions.pourcentageDifference.toFixed(1)}%)
          </Text>
        </View>
        <View style={[styles.recommendationBox, { backgroundColor: comparaisonOptions.meilleureOption === 'carcasse' ? colors.success + '20' : colors.accent + '20' }]}>
          <Text style={[styles.recommendationTitle, { color: colors.text }]}>💡 Recommandation</Text>
          <Text style={[styles.recommendationText, { color: colors.text }]}>
            {comparaisonOptions.meilleureOption === 'carcasse'
              ? `La vente en carcasse est plus avantageuse de ${formatAmount(Math.abs(comparaisonOptions.difference))} (${Math.abs(comparaisonOptions.pourcentageDifference).toFixed(1)}% de plus).`
              : `La vente en vif est plus avantageuse de ${formatAmount(Math.abs(comparaisonOptions.difference))} (${Math.abs(comparaisonOptions.pourcentageDifference).toFixed(1)}% de plus).`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  comparisonCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  comparisonContent: {
    gap: SPACING.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  comparisonLabel: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  comparisonValue: {
    fontSize: FONT_SIZES.md,
  },
  recommendationBox: {
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});

