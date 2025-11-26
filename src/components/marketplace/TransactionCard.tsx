/**
 * Carte d'affichage d'une transaction
 * Avec statut, montant, et actions contextuelles
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatPrice, formatDate } from '../../utils/formatters';
import type { Transaction } from '../../types/marketplace';

interface TransactionCardProps {
  transaction: Transaction;
  userRole: 'producer' | 'buyer';
  onPress: () => void;
  onChat?: () => void;
  onConfirmDelivery?: () => void;
}

type TransactionStatus = 'pending_payment' | 'pending_delivery' | 'delivered' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<
  TransactionStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }
> = {
  pending_payment: {
    label: 'En attente de paiement',
    icon: 'time-outline',
    color: MarketplaceTheme.colors.warning,
  },
  pending_delivery: {
    label: 'En attente de livraison',
    icon: 'car-outline',
    color: MarketplaceTheme.colors.primary,
  },
  delivered: {
    label: 'Livré',
    icon: 'checkmark-circle-outline',
    color: MarketplaceTheme.colors.success,
  },
  completed: {
    label: 'Terminé',
    icon: 'shield-checkmark-outline',
    color: MarketplaceTheme.colors.success,
  },
  cancelled: {
    label: 'Annulé',
    icon: 'close-circle-outline',
    color: MarketplaceTheme.colors.error,
  },
};

export default function TransactionCard({
  transaction,
  userRole,
  onPress,
  onChat,
  onConfirmDelivery,
}: TransactionCardProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const statusConfig = STATUS_CONFIG[transaction.status as TransactionStatus] || STATUS_CONFIG.pending_payment;

  const counterpartName =
    userRole === 'producer' ? transaction.buyerName : transaction.producerName;

  const canConfirmDelivery =
    transaction.status === 'pending_delivery' &&
    ((userRole === 'producer' && !transaction.deliveryConfirmedByProducer) ||
      (userRole === 'buyer' && !transaction.deliveryConfirmedByBuyer));

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Prix */}
        <Text style={[styles.price, { color: colors.primary }]}>
          {formatPrice(transaction.finalPrice)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.body}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {userRole === 'producer' ? 'Acheteur' : 'Producteur'}:
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{counterpartName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sujets:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {transaction.subjectIds.length}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {formatDate(transaction.createdAt)}
          </Text>
        </View>

        {transaction.deliveryDate && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Livraison:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(transaction.deliveryDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Confirmation de livraison */}
      {transaction.status === 'pending_delivery' && (
        <View style={[styles.deliverySection, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.deliverySectionTitle, { color: colors.text }]}>
            Confirmation de livraison
          </Text>

          <View style={styles.confirmationRow}>
            <Ionicons
              name={
                transaction.deliveryConfirmedByProducer
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={20}
              color={
                transaction.deliveryConfirmedByProducer ? colors.success : colors.textSecondary
              }
            />
            <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>
              Producteur
            </Text>
          </View>

          <View style={styles.confirmationRow}>
            <Ionicons
              name={
                transaction.deliveryConfirmedByBuyer ? 'checkmark-circle' : 'ellipse-outline'
              }
              size={20}
              color={transaction.deliveryConfirmedByBuyer ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>
              Acheteur
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {onChat && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Discuter
            </Text>
          </TouchableOpacity>
        )}

        {canConfirmDelivery && onConfirmDelivery && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
            onPress={onConfirmDelivery}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>
              Confirmer livraison
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Détails livrés */}
      {transaction.status === 'completed' && (
        <View style={[styles.completedBanner, { backgroundColor: colors.success + '10' }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={[styles.completedText, { color: colors.success }]}>
            Transaction terminée avec succès
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: MarketplaceTheme.borderRadius.md,
    padding: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  price: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  body: {
    gap: MarketplaceTheme.spacing.xs,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
  },
  infoLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  infoValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  deliverySection: {
    marginTop: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    gap: MarketplaceTheme.spacing.xs,
  },
  deliverySectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
  },
  confirmationText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    marginTop: MarketplaceTheme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  actionButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  completedText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
});

