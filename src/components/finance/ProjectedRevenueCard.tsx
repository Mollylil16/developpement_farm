/**
 * Composant pour afficher les revenus prévisionnels (VIF ou CARCASSE)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { selectAllRevenus } from '../../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';

const TAUX_CARCASSE = 0.75; // 75% du poids vif
const PRIX_KG_VIF_DEFAUT = 1000;
const PRIX_KG_CARCASSE_DEFAUT = 1300;

interface ProjectedRevenueCardProps {
  type: 'vif' | 'carcasse';
}

export default function ProjectedRevenueCard({ type }: ProjectedRevenueCardProps) {
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);
  const revenus = useAppSelector(selectAllRevenus);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const { animauxActifs } = useAnimauxActifs({ projetId: projetActif?.id });

  const revenusPrevisionnels = React.useMemo(() => {
    if (!projetActif) {
      return {
        revenuInitial: 0,
        revenusRealises: 0,
        revenuRestant: 0,
      };
    }

    const poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );

    const prixKg = type === 'vif' 
      ? (projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT)
      : (projetActif.prix_kg_carcasse || PRIX_KG_CARCASSE_DEFAUT);

    const poidsPourCalcul = type === 'vif' ? poidsTotal : poidsTotal * TAUX_CARCASSE;
    const revenuInitial = poidsPourCalcul * prixKg;
    const revenusRealises = revenus
      .filter((r) => r.categorie === 'vente_porc')
      .reduce((sum, r) => sum + r.montant, 0);
    const revenuRestant = Math.max(0, revenuInitial - revenusRealises);

    return {
      revenuInitial,
      revenusRealises,
      revenuRestant,
    };
  }, [animauxActifs, peseesParAnimal, projetActif?.id, revenus, type]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!projetActif) return null;

  const emoji = type === 'vif' ? '🐷' : '🥩';
  const label = type === 'vif' ? 'Vente en VIF' : 'Vente en CARCASSE';

  return (
    <Card style={StyleSheet.flatten([styles.previsionnelCard, { backgroundColor: colors.surface }])}>
      <View style={styles.previsionnelHeader}>
        <Text style={[styles.previsionnelLabel, { color: colors.text }]}>
          {emoji} Revenu prévisionnel - {label}
        </Text>
      </View>
      <View style={styles.previsionnelContent}>
        <View style={styles.previsionnelRow}>
          <Text style={[styles.previsionnelText, { color: colors.textSecondary }]}>Potentiel initial:</Text>
          <Text style={[styles.previsionnelValue, { color: colors.success || colors.primary, fontWeight: 'bold' }]}>
            {formatAmount(revenusPrevisionnels.revenuInitial)}
          </Text>
        </View>
        {revenusPrevisionnels.revenuInitial > 0 && (
          <>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(Math.min(100, (revenusPrevisionnels.revenusRealises / revenusPrevisionnels.revenuInitial) * 100))}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {revenusPrevisionnels.revenusRealises > 0
                  ? `${((revenusPrevisionnels.revenusRealises / revenusPrevisionnels.revenuInitial) * 100).toFixed(1)}% réalisé`
                  : '0% réalisé'}
              </Text>
            </View>
            {revenusPrevisionnels.revenusRealises > 0 && (
              <View style={styles.previsionnelRow}>
                <Text style={[styles.previsionnelText, { color: colors.textSecondary }]}>Déjà réalisé:</Text>
                <Text style={[styles.previsionnelValue, { color: colors.text }]}>
                  {formatAmount(revenusPrevisionnels.revenusRealises)}
                </Text>
              </View>
            )}
            <View style={[styles.previsionnelRow, styles.previsionnelRowHighlight]}>
              <Text style={[styles.previsionnelText, { color: colors.textSecondary, fontWeight: '600' }]}>
                Revenu prévisionnel restant:
              </Text>
              <Text style={[styles.previsionnelValue, { color: colors.success || colors.primary, fontWeight: 'bold' }]}>
                {formatAmount(revenusPrevisionnels.revenuRestant)}
              </Text>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  previsionnelCard: {
    marginBottom: SPACING.lg,
  },
  previsionnelHeader: {
    marginBottom: SPACING.md,
  },
  previsionnelLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  previsionnelContent: {
    gap: SPACING.sm,
  },
  previsionnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previsionnelRowHighlight: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  previsionnelText: {
    fontSize: FONT_SIZES.md,
  },
  previsionnelValue: {
    fontSize: FONT_SIZES.md,
  },
  progressContainer: {
    marginVertical: SPACING.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'right',
  },
});

