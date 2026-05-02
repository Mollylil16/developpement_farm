/**
 * Composant d'affichage des conditions de vente
 * Affiche les conditions par défaut de manière claire et professionnelle
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { DEFAULT_SALE_TERMS } from '../../types/marketplace';
import type { SaleTerms } from '../../types/marketplace';

interface SaleTermsDisplayProps {
  terms?: SaleTerms;
  compact?: boolean;
  expandable?: boolean;
}

export default function SaleTermsDisplay({
  terms = DEFAULT_SALE_TERMS,
  compact = false,
  expandable = false,
}: SaleTermsDisplayProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const [expanded, setExpanded] = useState(!expandable);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.info} />
        <Text style={[styles.compactText, { color: colors.textSecondary }]}>
          Transport et abattage à la charge de l'acheteur
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header avec toggle si expandable */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => expandable && setExpanded(!expanded)}
        disabled={!expandable}
        activeOpacity={expandable ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Conditions de Vente</Text>
        </View>
        {expandable && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        )}
      </TouchableOpacity>

      {/* Contenu */}
      {expanded && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Transport */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Transport</Text>
              <View style={[styles.badge, { backgroundColor: colors.badgeConditions + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.badgeConditions }]}>Acheteur</Text>
              </View>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • À la charge de l'acheteur
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Le transport doit être conforme aux normes de bien-être animal
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Un véhicule adapté et autorisé est requis
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Abattage */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Abattage</Text>
              <View style={[styles.badge, { backgroundColor: colors.badgeConditions + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.badgeConditions }]}>Acheteur</Text>
              </View>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • À la charge de l'acheteur
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • L'abattoir doit être agréé et conforme aux normes sanitaires
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Respect des procédures réglementaires
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Garanties sanitaires */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Garanties Sanitaires
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {terms.warranty}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Les vaccinations et prophylaxies sont à jour
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Tous les documents sanitaires seront fournis
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Paiement */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash" size={20} color={colors.gold} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Paiement</Text>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Mode de paiement :{' '}
              {terms.paymentTerms === 'on_delivery'
                ? 'À la livraison'
                : terms.paymentTerms === 'advance'
                  ? 'Acompte requis'
                  : 'À convenir'}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Le paiement doit être effectué avant le départ des animaux
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Annulation */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Politique d'Annulation
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {terms.cancellationPolicy}
            </Text>
          </View>

          {/* Note légale */}
          <View style={[styles.legalNote, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Ces conditions sont les conditions standard du marketplace. Des conditions
              particulières peuvent être négociées directement avec le producteur.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  compactText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  content: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingBottom: MarketplaceTheme.spacing.md,
    maxHeight: 400,
  },
  section: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    flex: 1,
  },
  badge: {
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.xs,
  },
  badgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  sectionText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  legalNote: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: MarketplaceTheme.spacing.md,
  },
  legalText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
