/**
 * Widget Coût de Production pour le Dashboard
 * Affiche les coûts/kg OPEX et Complet + Marge moyenne
 */

import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadStatistiquesMoisActuel } from '../../store/slices/financeSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { getMargeColor, getStatutMarge } from '../../utils/margeCalculations';
import { logger } from '../../utils/logger';

interface CoutProductionWidgetProps {
  projetId: string;
  onPress?: () => void;
}

function CoutProductionWidget({ projetId, onPress }: CoutProductionWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    cout_kg_opex: number;
    marge_moyenne: number;
  }>({
    cout_kg_opex: 0,
    marge_moyenne: 0,
  });

  useEffect(() => {
    if (!projetId || !projetActif) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        const result = await dispatch(loadStatistiquesMoisActuel(projetId)).unwrap() as {
          coutsPeriode: { cout_kg_opex: number };
          margeMoyenne: number;
        };
        setStats({
          cout_kg_opex: result.coutsPeriode.cout_kg_opex,
          marge_moyenne: result.margeMoyenne,
        });
      } catch (error) {
        logger.error('Erreur chargement stats coût production:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [dispatch, projetId, projetActif?.id]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatPourcent = (pourcent: number) => {
    return pourcent.toFixed(1);
  };

  const statutMarge = getStatutMarge(stats.marge_moyenne);
  const couleurMarge = getMargeColor(statutMarge);

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={[styles.title, { color: colors.text }]}>Coût de Production</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : (
        <>
          {/* Ligne 1: Coût/kg OPEX uniquement */}
          <View style={styles.statsRow}>
            {/* Coût OPEX */}
            <View style={[styles.statCard, { backgroundColor: colors.info + '15', flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Coût/kg (OPEX)
              </Text>
              <Text style={[styles.statValue, { color: colors.info }]}>
                {formatMontant(stats.cout_kg_opex)}
              </Text>
              <Text style={[styles.statUnit, { color: colors.textSecondary }]}>FCFA</Text>
            </View>
          </View>

          {/* Ligne 2: Marge moyenne */}
          <View
            style={[
              styles.margeCard,
              {
                backgroundColor: couleurMarge + '15',
                borderColor: couleurMarge,
              },
            ]}
          >
            <View style={styles.margeHeader}>
              <Text style={[styles.margeLabel, { color: colors.textSecondary }]}>
                Marge moyenne
              </Text>
              <Text style={[styles.margeEmoji]}>
                {statutMarge === 'confortable' ? '✅' : statutMarge === 'faible' ? '⚠️' : '❌'}
              </Text>
            </View>
            <Text style={[styles.margeValue, { color: couleurMarge }]}>
              {formatPourcent(stats.marge_moyenne)} %
            </Text>
            <Text style={[styles.margeStatut, { color: couleurMarge }]}>
              {statutMarge === 'confortable'
                ? 'Confortable'
                : statutMarge === 'faible'
                  ? 'Faible'
                  : 'Négative'}
            </Text>
          </View>

          {/* Info OPEX */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 Coût OPEX = Dépenses opérationnelles uniquement
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📊 Les investissements (CAPEX) sont gérés séparément dans le bilan comptable
            </Text>
          </View>
        </>
      )}
    </View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card>{WidgetContent}</Card>
    </TouchableOpacity>
  ) : (
    <Card>{WidgetContent}</Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
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
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
    marginBottom: SPACING.xs / 2,
  },
  statUnit: {
    fontSize: FONT_SIZES.xs,
  },
  margeCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.md,
  },
  margeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  margeLabel: {
    fontSize: FONT_SIZES.sm,
  },
  margeEmoji: {
    fontSize: FONT_SIZES.lg,
  },
  margeValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
    textAlign: 'center',
    marginVertical: SPACING.xs,
  },
  margeStatut: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
  infoContainer: {
    gap: SPACING.xs / 2,
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});

export default memo(CoutProductionWidget);
