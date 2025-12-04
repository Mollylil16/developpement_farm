/**
 * Modal de détails d'une vente de porc
 * Affiche informations, coûts et marges
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Revenu } from '../types';
import CustomReadOnlyModal from './CustomReadOnlyModal';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  getMargeColor,
  getStatutMarge,
  getMargeLabel,
} from '../utils/margeCalculations';

interface VenteDetailModalProps {
  visible: boolean;
  onClose: () => void;
  vente: Revenu | null;
}

export default function VenteDetailModal({ visible, onClose, vente }: VenteDetailModalProps) {
  const { colors } = useTheme();

  if (!vente) return null;

  const formatMontant = (montant: number | undefined) => {
    if (montant === undefined || montant === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatPourcent = (pourcent: number | undefined) => {
    if (pourcent === undefined || pourcent === null) return '-';
    return pourcent.toFixed(1) + ' %';
  };

  // Calcul statut marge OPEX (utilisée comme marge principale)
  const statutMarge = vente.marge_opex_pourcent !== undefined
    ? getStatutMarge(vente.marge_opex_pourcent)
    : 'negative';
  const couleurMarge = getMargeColor(statutMarge);
  const labelMarge = getMargeLabel(vente.marge_opex_pourcent || 0);

  const hasMargeData = vente.poids_kg !== undefined && vente.poids_kg > 0;

  return (
    <CustomReadOnlyModal
      visible={visible}
      onClose={onClose}
      title="Détails de la vente"
      showCloseButton={true}
      closeButtonText="Fermer"
    >
      <>
        {/* Informations générales */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Informations générales
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(vente.date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Prix de vente
            </Text>
            <Text style={[styles.infoValue, { color: colors.success, fontWeight: '600' }]}>
              {formatMontant(vente.montant)} FCFA
            </Text>
          </View>

          {vente.poids_kg !== undefined && vente.poids_kg > 0 && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {vente.poids_kg} kg
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Prix/kg vif
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatMontant(vente.montant / vente.poids_kg)} FCFA
                </Text>
              </View>
            </>
          )}

          {vente.description && (
            <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary, marginBottom: 4 }]}>
                Description
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vente.description}
              </Text>
            </View>
          )}
        </View>

        {/* Coûts de production */}
        {hasMargeData && (
          <>
            <View style={[styles.section, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                💰 Coûts de production
              </Text>

              {/* Coût OPEX */}
              <View
                style={[
                  styles.coutCard,
                  { backgroundColor: colors.info + '15', borderColor: colors.info },
                ]}
              >
                <View style={styles.coutHeader}>
                  <Text style={[styles.coutType, { color: colors.info }]}>OPEX</Text>
                  <Text style={[styles.coutSubtitle, { color: colors.textSecondary }]}>
                    Dépenses opérationnelles
                  </Text>
                </View>
                <View style={styles.coutDetails}>
                  <View style={styles.coutRow}>
                    <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>
                      Coût/kg
                    </Text>
                    <Text style={[styles.coutValue, { color: colors.info }]}>
                      {formatMontant(vente.cout_kg_opex)} FCFA
                    </Text>
                  </View>
                  <View style={styles.coutRow}>
                    <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>
                      Coût réel
                    </Text>
                    <Text style={[styles.coutValue, { color: colors.info }]}>
                      {formatMontant(vente.cout_reel_opex)} FCFA
                    </Text>
                  </View>
                </View>
              </View>

              {/* Coût Complet */}
              <View
                style={[
                  styles.coutCard,
                  { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                ]}
              >
                <View style={styles.coutHeader}>
                  <Text style={[styles.coutType, { color: colors.primary }]}>COMPLET</Text>
                  <Text style={[styles.coutSubtitle, { color: colors.textSecondary }]}>
                    OPEX + Amortissement CAPEX
                  </Text>
                </View>
                <View style={styles.coutDetails}>
                  <View style={styles.coutRow}>
                    <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>
                      Coût/kg
                    </Text>
                    <Text style={[styles.coutValue, { color: colors.primary }]}>
                      {formatMontant(vente.cout_kg_complet)} FCFA
                    </Text>
                  </View>
                  <View style={styles.coutRow}>
                    <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>
                      Coût réel
                    </Text>
                    <Text style={[styles.coutValue, { color: colors.primary }]}>
                      {formatMontant(vente.cout_reel_complet)} FCFA
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Marges */}
            <View style={[styles.section, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 Marges</Text>

              {/* Marge OPEX (principale) */}
              <View
                style={[
                  styles.margeCompleteCard,
                  { backgroundColor: couleurMarge + '15', borderColor: couleurMarge },
                ]}
              >
                <View style={styles.margeHeader}>
                  <Text style={[styles.margeTitle, { color: couleurMarge }]}>
                    Marge OPEX (Principale)
                  </Text>
                  <Text style={[styles.margeEmoji]}>
                    {statutMarge === 'confortable'
                      ? '✅'
                      : statutMarge === 'faible'
                      ? '⚠️'
                      : '❌'}
                  </Text>
                </View>

                <View style={styles.margeMainValues}>
                  <Text style={[styles.margeMainValue, { color: couleurMarge }]}>
                    {formatMontant(vente.marge_opex || 0)} FCFA
                  </Text>
                  <Text style={[styles.margeMainPourcent, { color: couleurMarge }]}>
                    {formatPourcent(vente.marge_opex_pourcent || 0)}
                  </Text>
                </View>

                <Text style={[styles.margeStatut, { color: couleurMarge }]}>{labelMarge}</Text>
              </View>

              {/* Marge Complète (informative) */}
              {vente.marge_complete_pourcent !== undefined && (
                <View style={styles.margeRow}>
                  <Text style={[styles.margeLabel, { color: colors.textSecondary }]}>
                    Marge Complète (OPEX + CAPEX)
                  </Text>
                  <View style={styles.margeValues}>
                    <Text style={[styles.margeValue, { color: colors.textSecondary }]}>
                      {formatMontant(vente.marge_complete || 0)} FCFA
                    </Text>
                    <Text style={[styles.margePourcent, { color: colors.textSecondary }]}>
                      ({formatPourcent(vente.marge_complete_pourcent)})
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Info explicative */}
            <View style={styles.infoBox}>
              <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
                💡 La marge OPEX prend en compte uniquement les dépenses opérationnelles. Les investissements (CAPEX) sont gérés séparément dans le bilan comptable.
              </Text>
            </View>
          </>
        )}

        {/* Si pas de données de marge */}
        {!hasMargeData && (
          <View style={styles.noDataBox}>
            <Text style={[styles.noDataEmoji]}>ℹ️</Text>
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              Le poids du porc n'a pas été renseigné lors de la vente.
            </Text>
            <Text style={[styles.noDataSubtext, { color: colors.textSecondary }]}>
              Pour calculer automatiquement les marges, modifiez cette vente et ajoutez le poids
              du porc vendu.
            </Text>
          </View>
        )}
      </>
    </CustomReadOnlyModal>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
  },
  coutCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  coutHeader: {
    marginBottom: SPACING.sm,
  },
  coutType: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.xs / 2,
  },
  coutSubtitle: {
    fontSize: FONT_SIZES.xs,
  },
  coutDetails: {
    gap: SPACING.xs,
  },
  coutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coutLabel: {
    fontSize: FONT_SIZES.sm,
  },
  coutValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  margeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
    marginBottom: SPACING.sm,
  },
  margeLabel: {
    fontSize: FONT_SIZES.sm,
  },
  margeValues: {
    alignItems: 'flex-end',
  },
  margeValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  margePourcent: {
    fontSize: FONT_SIZES.xs,
  },
  margeCompleteCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  margeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  margeTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  margeEmoji: {
    fontSize: FONT_SIZES.xl,
  },
  margeMainValues: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  margeMainValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.xs,
  },
  margeMainPourcent: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  margeStatut: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#0099CC15',
    borderWidth: 1,
    borderColor: '#0099CC',
  },
  infoBoxText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  noDataBox: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noDataEmoji: {
    fontSize: FONT_SIZES.xxl * 1.5,
    marginBottom: SPACING.md,
  },
  noDataText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  noDataSubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});

